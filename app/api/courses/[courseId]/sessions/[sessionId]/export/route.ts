import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ courseId: string; sessionId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { courseId, sessionId } = await ctx.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cid = Number(courseId);
  const sid = Number(sessionId);

  // Check permissions
  const course = await prisma.course.findUnique({
    where: { id: cid },
    include: { userRoles: { include: { role: true } } },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const isOwner = course.ownerId === user.id;
  const isTeacher = course.userRoles.some(
    (ur) => ur.userId === user.id && ["TEACHER", "CO_TEACHER"].includes(ur.role.name)
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

  // Fetch session details
  const session = await prisma.classSession.findUnique({
    where: { id: sid },
  });

  if (!session || session.courseId !== cid) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Build filter for enrollments based on active sections
  const enrollmentWhere: any = { courseId: cid };
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
    orderBy: { studentCode: "asc" },
  });

  // Fetch attendance records for this session
  const attendances = await prisma.attendance.findMany({
    where: { classSessionId: sid },
    select: {
      studentId: true,
      status: true,
      note: true,
      checkedAt: true,
      scanner: {
        select: {
          displayNameTh: true,
          displayNameEn: true,
          cmuAccount: true,
        },
      },
    },
  });

  // Create attendance map
  const attendanceMap = new Map();
  attendances.forEach((a) => attendanceMap.set(a.studentId, a));

  // Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Attendance");

  // Add metadata header
  worksheet.mergeCells("A1:F1");
  worksheet.getCell("A1").value = `${course.courseCode} - ${course.courseNameTh || course.courseNameEn}`;
  worksheet.getCell("A1").font = { bold: true, size: 14 };
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  worksheet.getCell("A1").font = { ...worksheet.getCell("A1").font, color: { argb: "FFFFFFFF" } };

  worksheet.mergeCells("A2:G2");
  worksheet.getCell("A2").value = `Session: ${session.name}`;
  worksheet.getCell("A2").font = { bold: true, size: 12 };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  worksheet.mergeCells("A3:G3");
  worksheet.getCell("A3").value = `Date: ${new Date(session.date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
  worksheet.getCell("A3").alignment = { horizontal: "center" };

  // Add summary
  const presentCount = attendances.filter(a => a.status === "PRESENT").length;
  const lateCount = attendances.filter(a => a.status === "LATE").length;
  const leaveCount = attendances.filter(a => a.status === "LEAVE").length;
  const absentCount = enrollments.length - attendances.length; // Assuming absent = no record
  
  worksheet.mergeCells("A4:G4");
  worksheet.getCell("A4").value = `Summary: ${presentCount} Present / ${lateCount} Late / ${leaveCount} Leave / ${absentCount} Absent`;
  worksheet.getCell("A4").font = { bold: true };
  worksheet.getCell("A4").alignment = { horizontal: "center" };
  worksheet.getCell("A4").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE7E6E6" },
  };

  // Add empty row
  worksheet.getRow(5).height = 5;

  // Add header row
  const headerRow = worksheet.getRow(6);
  headerRow.values = ["No.", "SECLEC", "SECLAB", "Student ID", "Name - Surname", "", "Status", "Note", "Scanned By", "Checked At"];
  
  // Merge Name-Surname columns
  worksheet.mergeCells("E6:F6");
  
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF70AD47" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 20;

  // Set column widths
  worksheet.getColumn(1).width = 5;  // No.
  worksheet.getColumn(2).width = 10; // SECLEC
  worksheet.getColumn(3).width = 10; // SECLAB
  worksheet.getColumn(4).width = 15; // Student ID
  worksheet.getColumn(5).width = 20; // First Name
  worksheet.getColumn(6).width = 20; // Last Name
  worksheet.getColumn(7).width = 15; // Status
  worksheet.getColumn(8).width = 30; // Note
  worksheet.getColumn(9).width = 25; // Scanned By
  worksheet.getColumn(10).width = 20; // Checked At

  // Add data with checkboxes
  let rowIndex = 7;
  enrollments.forEach((e: any, index: number) => {
    const attendance = attendanceMap.get(e.student.id);
    const status = attendance ? attendance.status : "ABSENT";
    
    const scannerName = attendance?.scanner
      ? attendance.scanner.displayNameTh || attendance.scanner.displayNameEn || attendance.scanner.cmuAccount
      : "";
    
    // Split name
    const fullName = e.student.displayNameTh || e.student.displayNameEn || "";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const row = worksheet.getRow(rowIndex);
    row.values = [
      e.importIndex || (index + 1), // Use importIndex if available, fallback to index+1
      e.section || "-",
      e.labSection || "-",
      e.studentCode || e.student.studentCode || "",
      firstName,
      lastName,
      status,
      attendance?.note || "",
      scannerName,
      attendance ? new Date(attendance.checkedAt).toLocaleString("th-TH") : "",
    ];

    // Style status cell
    row.getCell(7).font = { bold: true };
    row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
    
    // Color code the status cell
    let argb = "FFFFC7CE"; // Red (Absent)
    if (status === "PRESENT") argb = "FFC6EFCE"; // Green
    else if (status === "LATE") argb = "FFFFEB9C"; // Yellow
    else if (status === "LEAVE") argb = "FFBDD7EE"; // Blue

    row.getCell(7).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb },
    };

    // Add borders
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
  const filename = `${course.courseCode}_${session.name}_${new Date(session.date).toISOString().slice(0, 10)}.xlsx`;

  // Return file
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
