import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ courseId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { courseId } = await ctx.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cid = Number(courseId);

  // Check permissions
  const course = await prisma.course.findUnique({
    where: { id: cid },
    include: {
      userRoles: { include: { role: true } },
      classSessions: {
        where: {
            date: {
                gte: req.nextUrl.searchParams.get("startDate") ? new Date(req.nextUrl.searchParams.get("startDate") as string) : undefined,
                lte: req.nextUrl.searchParams.get("endDate") ? new Date(new Date(req.nextUrl.searchParams.get("endDate") as string).setHours(23, 59, 59, 999)) : undefined,
            }
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const isOwner = course.ownerId === user.id;
  const isTeacher = course.userRoles.some(
    (ur) => ur.userId === user.id && ["TEACHER", "CO_TEACHER", "TA"].includes(ur.role.name)
  );

  if (!isOwner && !isTeacher) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Parse active sections for filtering
  let activeSections: string[] = [];
  if (course.activeSections) {
    try {
      activeSections = JSON.parse(course.activeSections);
    } catch (e) {
      console.error("Failed to parse activeSections:", e);
    }
  }

  // Build filter for enrollments based on active sections
  const enrollmentWhere: { courseId: number; isActive: boolean; OR?: { section: string; labSection: string | null }[] } = { 
    courseId: cid,
    isActive: true // Only show active students from latest import
  };
  if (activeSections.length > 0) {
    const orConditions = activeSections.map(s => {
      const [lec, lab] = s.split("|");
      return {
        section: lec,
        labSection: (lab === "null" || lab === "" || lab === "0") ? null : lab
      };
    });
    enrollmentWhere.OR = orConditions;
  }

  // Fetch all enrolled students (filtered by active sections)
  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          displayNameTh: true,
          displayNameEn: true,
          cmuAccount: true,
        },
      },
    },
    orderBy: { importIndex: "asc" },
  });

  // Fetch all attendance records for this course
  const attendances = await prisma.attendance.findMany({
    where: {
      classSession: {
        courseId: cid,
      },
    },
    select: {
      studentId: true,
      classSessionId: true,
      status: true,
      checkedAt: true,
    },
  });

  // Create attendance map: studentId -> Map<sessionId, Attendance>
  const attendanceMap = new Map<string, Map<number, { studentId: string; classSessionId: number; status: string; checkedAt: Date }>>();
  attendances.forEach((att) => {
    if (!attendanceMap.has(att.studentId)) {
      attendanceMap.set(att.studentId, new Map());
    }
    attendanceMap.get(att.studentId)?.set(att.classSessionId, att);
  });

  // Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Attendance Report");

  // Add metadata header
  worksheet.mergeCells("A1:H1");
  worksheet.getCell("A1").value = `${course.courseCode} - ${course.courseNameTh || course.courseNameEn}`;
  worksheet.getCell("A1").font = { bold: true, size: 16 };
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  worksheet.getCell("A1").font = { ...worksheet.getCell("A1").font, color: { argb: "FFFFFFFF" } };

  worksheet.mergeCells("A2:H2");
  worksheet.getCell("A2").value = `Attendance Report (Generated: ${new Date().toLocaleDateString("th-TH")})`;
  worksheet.getCell("A2").font = { bold: true, size: 12 };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  // Add empty row
  worksheet.getRow(3).height = 10;

  // Prepare Header Row
  const headerValues = [
    "No.",
    "SECLEC",
    "SECLAB",
    "Student ID",
    "Name - Surname",
    ...course.classSessions.map((s) => {
        const date = new Date(s.date).toLocaleDateString("th-TH", { day: 'numeric', month: 'short' });
        return `${date}\n${s.name}`;
    }),
    "Present",
    "Late",
    "Absent",
    "Leave",
    "Attendance"
  ];

  const headerRow = worksheet.getRow(4);
  headerRow.values = headerValues;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF70AD47" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = 40;

  // Set column widths
  worksheet.getColumn(1).width = 5;  // No.
  worksheet.getColumn(2).width = 8;  // SECLEC
  worksheet.getColumn(3).width = 8;  // SECLAB
  worksheet.getColumn(4).width = 15; // Student ID
  worksheet.getColumn(5).width = 30; // Name - Surname
  
  // Session columns width
  for (let i = 0; i < course.classSessions.length; i++) {
      worksheet.getColumn(6 + i).width = 12;
  }
  
  // Stats columns (Present, Late, Absent, Leave, Attendance %)
  const statsStartCol = 6 + course.classSessions.length;
  worksheet.getColumn(statsStartCol).width = 10;     // Present
  worksheet.getColumn(statsStartCol + 1).width = 10; // Late
  worksheet.getColumn(statsStartCol + 2).width = 10; // Absent
  worksheet.getColumn(statsStartCol + 3).width = 10; // Leave
  worksheet.getColumn(statsStartCol + 4).width = 12; // Attendance %

  // Add data rows
  let rowIndex = 5;
  enrollments.forEach((e, index) => {
    const studentAtts = attendanceMap.get(e.student.id);
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    const rowValues: (string | number)[] = [
      e.importIndex || (index + 1), // Use importIndex if available, fallback to index+1
      e.section || "000",
      e.labSection || "000",
      e.studentCode || e.student.studentCode || "",
      e.student.displayNameTh || e.student.displayNameEn || "",
    ];

    // Add session data and count statuses
    course.classSessions.forEach((s) => {
      const att = studentAtts?.get(s.id);
      if (att) {
        const status = att.status?.toUpperCase() || "";
        if (status === "PRESENT") {
          presentCount++;
          rowValues.push("✅");
        } else if (status === "LATE") {
          lateCount++;
          rowValues.push("⏰");
        } else if (status === "LEAVE") {
          leaveCount++;
          rowValues.push("😷");
        } else if (status === "ABSENT") {
          absentCount++;
          rowValues.push("❌");
        } else {
          // Unknown status, treat as present
          presentCount++;
          rowValues.push("✅");
        }
      } else {
        absentCount++;
        rowValues.push("❌");
      }
    });

    // Add stats
    const totalSessions = course.classSessions.length;
    // Count Present + Leave as "attended"
    const attendedCount = presentCount + leaveCount;
    const percent = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0;
    
    rowValues.push(presentCount);
    rowValues.push(lateCount);
    rowValues.push(absentCount);
    rowValues.push(leaveCount);
    rowValues.push(percent); // Just the number, no % symbol

    const row = worksheet.getRow(rowIndex);
    row.values = rowValues;

    // Styling
    row.getCell(1).alignment = { horizontal: "center" }; // No.
    row.getCell(2).alignment = { horizontal: "center" }; // SECLEC
    row.getCell(3).alignment = { horizontal: "center" }; // SECLAB
    row.getCell(4).alignment = { horizontal: "center" }; // Student ID
    
    // Session cells styling
    for (let i = 0; i < course.classSessions.length; i++) {
        const cell = row.getCell(6 + i);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (cell.value === "✓") {
            cell.font = { color: { argb: "FF00B050" }, bold: true }; // Green check
        } else {
            cell.font = { color: { argb: "FFD9D9D9" } }; // Grey dot
        }
    }

    // Stats styling
    row.getCell(statsStartCol).alignment = { horizontal: "center" };     // Present
    row.getCell(statsStartCol + 1).alignment = { horizontal: "center" }; // Late
    row.getCell(statsStartCol + 2).alignment = { horizontal: "center" }; // Absent
    row.getCell(statsStartCol + 3).alignment = { horizontal: "center" }; // Leave
    
    const percentCell = row.getCell(statsStartCol + 4); // Attendance %
    percentCell.alignment = { horizontal: "center" };
    
    if (percent < 50) percentCell.font = { color: { argb: "FFFF0000" } };
    else if (percent < 80) percentCell.font = { color: { argb: "FFFFC000" } };
    else percentCell.font = { color: { argb: "FF00B050" } };

    // Borders
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    rowIndex++;
  });

  // Add borders to header
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = {
      top: { style: "medium" },
      left: { style: "medium" },
      bottom: { style: "medium" },
      right: { style: "medium" },
    };
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Create filename
  const filename = `${course.courseCode}_Attendance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // Return file
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
