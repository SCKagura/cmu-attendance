// app/api/courses/[courseId]/import-roster/route.ts
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ExcelJS ใช้ Node APIs
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ courseId: string }> };

// helper แปลงค่า cell เป็น string แบบปลอดภัย
function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    value instanceof Date
  ) {
    return String(value);
  }

  if (typeof value === "object") {
    const v = value as {
      text?: string;
      richText?: Array<{ text?: string }>;
      result?: unknown;
    };
    // กรณี rich text / hyperlink ฯลฯ
    if (typeof v.text === "string") return v.text;
    if (Array.isArray(v.richText)) {
      return v.richText.map((p: { text?: string }) => p.text ?? "").join("");
    }
    if (v.result != null) return String(v.result);
  }

  return String(value);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  // Next 16: params เป็น Promise ต้อง await
  const { courseId } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(courseId);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  // เช็คว่าเป็น owner ของวิชานี้จริง ๆ
  const course = await prisma.course.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // ---------- ดึงไฟล์จาก formData ----------
  const formData = await req.formData();
  const file = formData.get("file");
  const format = formData.get("format") as string || "1"; // Default to format 1

  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing file field 'file'" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const nodeBuffer = Buffer.from(arrayBuffer);

  // ---------- อ่าน Excel ด้วย ExcelJS ----------
  const workbook = new ExcelJS.Workbook();
  // ดึง type ของ argument load มาใช้ เพื่อเลี่ยง TS error
  type ExcelLoadInput = Parameters<(typeof workbook)["xlsx"]["load"]>[0];
  await workbook.xlsx.load(nodeBuffer as unknown as ExcelLoadInput);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json(
      { error: "No worksheet found in Excel file" },
      { status: 400 }
    );
  }

  // ---------- หาแถวเริ่มข้อมูล (header "รหัสนักศึกษา") ----------
  let dataStartRow = 0;
  let colMap = {
    studentCode: -1,
    firstName: -1,
    lastName: -1,
    fullName: -1, // สำหรับ format ที่มีชื่อ-นามสกุลในช่องเดียว หรือ merged header
    email: -1,
    cmuAccount: -1,
    secLec: -1,
    secLab: -1,
    section: -1, // General section column
  };

  let globalSecLec = "";
  let globalSecLab = "";

  // ---------- Validation & Metadata Extraction ----------
  // All 3 formats share similar metadata structure:
  // C2: Course Code
  // C4: Section (Format 1&2) - Format 3 has section in columns
  // C5: Instructor Name

  const c2 = cellToString(sheet.getCell("C2").value).trim();
  if (c2 !== course.courseCode) {
      return NextResponse.json({ 
          error: `รหัสวิชาในไฟล์ (${c2}) ไม่ตรงกับวิชานี้ (${course.courseCode})` 
      }, { status: 400 });
  }

  const instructorName = cellToString(sheet.getCell("C5").value).trim();
  if (instructorName) {
      await prisma.course.update({
          where: { id },
          data: { instructorName }
      });
  }

  // ---------- Format Logic ----------
  if (format === "1") {
      // Format 1: Standard
      // Data starts Row 8
      // A: No, B: ID, C: First, D: Last
      dataStartRow = 8;
      colMap.studentCode = 2; // B
      colMap.firstName = 3;   // C
      colMap.lastName = 4;    // D
      
      // Section from header C4: "001/002" -> Lec 001, Lab 002
      const secVal = cellToString(sheet.getCell("C4").value).trim();
      if (secVal) {
          const parts = secVal.split("/");
          if (parts.length > 0) globalSecLec = parts[0].trim();
          if (parts.length > 1) globalSecLab = parts[1].trim();
      }

  } else if (format === "2") {
      // Format 2: With Email
      // Data starts Row 8
      // A: No, B: ID, C: First, D: Last, G: CMU Email
      dataStartRow = 8;
      colMap.studentCode = 2; // B
      colMap.firstName = 3;   // C
      colMap.lastName = 4;    // D
      colMap.email = 7;       // G
      
      const secVal = cellToString(sheet.getCell("C4").value).trim();
      if (secVal) {
          const parts = secVal.split("/");
          if (parts.length > 0) globalSecLec = parts[0].trim();
          if (parts.length > 1) globalSecLab = parts[1].trim();
      }

  } else if (format === "3") {
      // Format 3: Code First / Full Detail
      // Data starts Row 5
      // A: No (Index), B: SecLec, C: SecLab, D: ID, E: First, F: Last, I: Email
      dataStartRow = 5;
      colMap.studentCode = 4; // D
      colMap.secLec = 2;      // B
      colMap.secLab = 3;      // C
      colMap.firstName = 5;   // E
      colMap.lastName = 6;    // F
      colMap.email = 9;       // I
  } else {
      // Fallback / Legacy (Format 4 from previous or "Auto")
      // We can keep it or default to Format 1. 
      // Given the specific request, let's default to Format 1 logic if unknown, 
      // but maybe just error if strict? 
      // Let's keep a basic fallback for safety but prioritize the 3 new ones.
      dataStartRow = 8;
      colMap.studentCode = 2;
      colMap.firstName = 3;
      colMap.lastName = 4;
  }

  // ลบ enrollment เดิมของวิชานี้ก่อน import ใหม่ (กันข้อมูลซ้ำ/ผิด)
  await prisma.enrollment.deleteMany({ where: { courseId: id } });

  let readRows = 0;
  let importedRows = 0;
  const errors: string[] = [];

  // ---------- loop ทีละแถวในตารางนักศึกษา ----------
  for (let r = dataStartRow; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    // Get values based on map
    let studentCode = "";
    if (colMap.studentCode !== -1) studentCode = cellToString(row.getCell(colMap.studentCode).value);
    
    // Try to find student code in first few columns if not mapped (Only for Format 1 or fallback)
    if (!studentCode && format === "1") {
        for(let c=1; c<=5; c++) {
            const val = cellToString(row.getCell(c).value);
            if (/^\d{9}$/.test(val)) {
                studentCode = val;
                break;
            }
        }
    }

    // ข้ามแถวว่าง ๆ (ไม่มีรหัสนักศึกษา)
    if (!studentCode || !/^\d+$/.test(studentCode)) continue;

    let secLec = "";
    let secLab = "";
    
    if (colMap.secLec !== -1) secLec = cellToString(row.getCell(colMap.secLec).value);
    if (colMap.secLab !== -1) secLab = cellToString(row.getCell(colMap.secLab).value);
    if (colMap.section !== -1 && !secLec) secLec = cellToString(row.getCell(colMap.section).value);

    // Fallback to global section info
    if (!secLec && globalSecLec) secLec = globalSecLec;
    if (!secLab && globalSecLab) secLab = globalSecLab;

    // Clean up section (remove leading zeros if needed, or keep as is)
    if (secLec) secLec = secLec.replace(/^0+/, "") || "0"; // Example: 001 -> 1
    if (secLab) secLab = secLab.replace(/^0+/, "") || "0";

    let firstName = "";
    let lastName = "";
    let displayName = "";

    if (colMap.firstName !== -1) firstName = cellToString(row.getCell(colMap.firstName).value);
    if (colMap.lastName !== -1) lastName = cellToString(row.getCell(colMap.lastName).value);
    
    if (colMap.fullName !== -1) {
        const full = cellToString(row.getCell(colMap.fullName).value);
        const nextColVal = cellToString(row.getCell(colMap.fullName + 1).value);
        const prevColVal = cellToString(row.getCell(colMap.fullName - 1).value);
        
        // Logic: If 'full' is one word
        if (full && !full.includes(" ")) {
            // If we have explicit lastName mapped, use it
            if (lastName) {
                firstName = full;
                displayName = `${firstName} ${lastName}`;
            }
            // Otherwise try to guess from adjacent columns
            else if (nextColVal && (format === "1" || format === "2")) {
                // Allow this logic for Format 2 as well if it looks like a split name
                firstName = full;
                lastName = nextColVal;
                displayName = `${firstName} ${lastName}`;
            } else if (prevColVal && (colMap.fullName - 1 !== colMap.studentCode) && (format === "1")) {
                firstName = prevColVal;
                lastName = full;
                displayName = `${firstName} ${lastName}`;
            } else {
                displayName = full;
            }
        } else {
            displayName = full;
            // Try to split
            const parts = full.split(" ").filter(Boolean);
            if (parts.length > 1) {
                firstName = parts[0];
                lastName = parts.slice(1).join(" ");
            } else {
                firstName = full;
            }
        }
    } else {
        displayName = [firstName, lastName].filter(Boolean).join(" ");
    }

    let email = "";
    if (colMap.email !== -1) email = cellToString(row.getCell(colMap.email).value);

    let cmuAccount = "";
    if (colMap.cmuAccount !== -1) cmuAccount = cellToString(row.getCell(colMap.cmuAccount).value);

    // Use CMU Account as email if email is missing and account looks like email
    if (!email && cmuAccount && cmuAccount.includes("@")) {
        email = cmuAccount;
    }

    readRows++;

    try {
      // ---------- upsert User ----------
      // Logic:
      // 1. Try to find user by studentCode
      // 2. If found, update displayName (but keep their real cmuAccount/email if they have one)
      // 3. If not found, create a PLACEHOLDER account
      
      const existingUser = await prisma.user.findUnique({
          where: { studentCode: studentCode }
      });

      let userId = "";

      if (existingUser) {
          userId = existingUser.id;
          // Update display name if provided
          // Also update email if it's a placeholder account and we have a real email now
          const isPlaceholder = existingUser.cmuAccount.startsWith("ROSTER_");
          
          await prisma.user.update({
              where: { id: userId },
              data: {
                  displayNameTh: displayName || undefined,
                  displayNameEn: displayName || undefined,
                  cmuEmail: (isPlaceholder && email) ? email : undefined,
              }
          });
      } else {
          // Create PLACEHOLDER
          // We use a special prefix to indicate this is not a real login account yet (or just a placeholder)
          // But since cmuAccount is unique, we need a unique string.
          const placeholderAccount = `ROSTER_${studentCode}`;
          // Use provided email if available, otherwise fallback to placeholder
          const finalEmail = email || `ROSTER_${studentCode}@placeholder.local`;

          const newUser = await prisma.user.create({
              data: {
                  studentCode,
                  cmuAccount: placeholderAccount,
                  cmuEmail: finalEmail,
                  displayNameTh: displayName || null,
                  displayNameEn: displayName || null,
                  isCmu: true,
              }
          });
          userId = newUser.id;
      }
      
      // We need the user object for the next steps (Role assignment)
      // Since we might have just the ID, let's just use the ID for relations.
      // But wait, the code below uses userRecord.id.
      
      // Let's just return a minimal object or fetch it again if needed, 
      // but actually we just need the ID for the next steps.
      const userRecord = { id: userId };

      // ---------- Assign STUDENT Role ----------
      const studentRole = await prisma.role.upsert({
        where: { name: "STUDENT" },
        update: {},
        create: { name: "STUDENT" },
      });

      // Check if user already has STUDENT role (global)
      const existingStudentRole = await prisma.userRole.findFirst({
        where: {
          userId: userRecord.id,
          roleId: studentRole.id,
          courseId: null,
        },
      });

      if (!existingStudentRole) {
        await prisma.userRole.create({
          data: {
            userId: userRecord.id,
            roleId: studentRole.id,
            courseId: null,
          },
        });
      }

      // ---------- upsert Enrollment (ลงทะเบียนในวิชานี้) ----------
      await prisma.enrollment.upsert({
        where: {
          courseId_studentId: {
            courseId: id,
            studentId: userRecord.id,
          },
        },
        update: {
          studentCode,
          section: secLec || null,
          labSection: secLab || null,
          importIndex: r, // Save row number as import index
        },
        create: {
          courseId: id,
          studentId: userRecord.id,
          studentCode,
          section: secLec || null,
          labSection: secLab || null,
          importIndex: r, // Save row number as import index
        },
      });

      importedRows++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`row ${r}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: true,
    readRows, // จำนวนแถวที่อ่านจากไฟล์
    importedRows, // จำนวนที่ import สำเร็จ
    errors, // ถ้ามี error รายบรรทัดจะอยู่ในนี้
  });
}
