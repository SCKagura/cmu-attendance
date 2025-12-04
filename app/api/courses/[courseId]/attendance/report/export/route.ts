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

  // Fetch all enrolled students
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: cid },
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
    orderBy: { studentCode: "asc" },
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
  const attendanceMap = new Map<string, Map<number, any>>();
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
    "Student Code",
    "Name (TH)",
    "Name (EN)",
    "Section",
    ...course.classSessions.map((s) => {
        const date = new Date(s.date).toLocaleDateString("th-TH", { day: 'numeric', month: 'short' });
        return `${date}\n${s.name}`;
    }),
    "Total Present",
    "%"
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
  worksheet.getColumn(1).width = 15; // Student Code
  worksheet.getColumn(2).width = 25; // Name TH
  worksheet.getColumn(3).width = 25; // Name EN
  worksheet.getColumn(4).width = 10; // Section
  
  // Session columns width
  for (let i = 0; i < course.classSessions.length; i++) {
      worksheet.getColumn(5 + i).width = 12;
  }
  
  // Stats columns
  const statsStartCol = 5 + course.classSessions.length;
  worksheet.getColumn(statsStartCol).width = 12;
  worksheet.getColumn(statsStartCol + 1).width = 10;

  // Add data rows
  let rowIndex = 5;
  enrollments.forEach((e) => {
    const studentAtts = attendanceMap.get(e.student.id);
    let presentCount = 0;

    const rowValues = [
      e.studentCode || e.student.studentCode || "",
      e.student.displayNameTh || "",
      e.student.displayNameEn || "",
      e.section || "-",
    ];

    // Add session data
    course.classSessions.forEach((s) => {
      const att = studentAtts?.get(s.id);
      if (att) {
        presentCount++;
        rowValues.push("✓");
      } else {
        rowValues.push("•");
      }
    });

    // Add stats
    const totalSessions = course.classSessions.length;
    const percent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
    
    rowValues.push(presentCount);
    rowValues.push(`${percent}%`);

    const row = worksheet.getRow(rowIndex);
    row.values = rowValues;

    // Styling
    row.getCell(4).alignment = { horizontal: "center" }; // Section center
    
    // Session cells styling
    for (let i = 0; i < course.classSessions.length; i++) {
        const cell = row.getCell(5 + i);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (cell.value === "✓") {
            cell.font = { color: { argb: "FF00B050" }, bold: true }; // Green check
        } else {
            cell.font = { color: { argb: "FFD9D9D9" } }; // Grey dot
        }
    }

    // Stats styling
    row.getCell(statsStartCol).alignment = { horizontal: "center" };
    const percentCell = row.getCell(statsStartCol + 1);
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
