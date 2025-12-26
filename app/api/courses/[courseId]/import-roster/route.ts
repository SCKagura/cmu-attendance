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

// Helper function to scan entire sheet for student data
function scanForStudentData(sheet: ExcelJS.Worksheet): {
  firstDataRow: number | null;
  studentRows: number[];
  totalFound: number;
} {
  const maxRows = Math.min(sheet.rowCount, 300); // Scan up to 300 rows
  const studentRows: number[] = [];
  let firstDataRow: number | null = null;
  
  console.log(`🔍 Scanning sheet for student data (${maxRows} rows)...`);
  
  for (let r = 1; r <= maxRows; r++) {
    const row = sheet.getRow(r);
    
    // Check columns B, C, D, E for student code (9 digits)
    for (let col = 2; col <= 5; col++) {
      const cellValue = cellToString(row.getCell(col).value).trim();
      if (/^\d{9}$/.test(cellValue)) {
        studentRows.push(r);
        if (firstDataRow === null) {
          firstDataRow = r;
          console.log(`✅ Found first student at row ${r}: ${cellValue}`);
        }
        break; // Found student code in this row, move to next row
      }
    }
  }
  
  console.log(`📊 Scan complete: Found ${studentRows.length} rows with student data`);
  return { firstDataRow, studentRows, totalFound: studentRows.length };
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
  // Format is now auto-detected, no longer needed from formData
  const action = formData.get("action") as string || "import"; // 'analyze' or 'import'
  const selectedSectionsJson = formData.get("selectedSections") as string;
  let selectedSections: string[] | null = null;
  
  if (selectedSectionsJson) {
      try {
          selectedSections = JSON.parse(selectedSectionsJson);
      } catch {}
  }

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
    no: -1,
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
  
  // CRITICAL: Validate course code BEFORE processing anything
  if (!c2) {
      return NextResponse.json({ 
          error: `ไม่พบรหัสวิชาในไฟล์ Excel (ช่อง C2)\nกรุณาตรวจสอบว่าใช้ไฟล์ที่ถูกต้อง` 
      }, { status: 400 });
  }
  
  if (c2 !== course.courseCode) {
      return NextResponse.json({ 
          error: `❌ รหัสวิชาไม่ตรงกัน!\n\nในไฟล์: ${c2}\nในระบบ: ${course.courseCode}\n\nกรุณาตรวจสอบว่าเลือกไฟล์ที่ถูกต้อง` 
      }, { status: 400 });
  }

  const instructorName = cellToString(sheet.getCell("C5").value).trim();
  if (instructorName && action === "import") {
      await prisma.course.update({
          where: { id },
          data: { instructorName }
      });
  }

  // ---------- SCAN FOR STUDENT DATA ----------
  // Scan entire sheet to find student data before proceeding
  const scanResult = scanForStudentData(sheet);
  
  if (scanResult.totalFound === 0) {
      return NextResponse.json({
          error: `❌ ไม่พบข้อมูลนักเรียนในไฟล์ Excel\n\nกรุณาตรวจสอบว่า:\n- ไฟล์มีรหัสนักศึกษา 9 หลัก\n- ข้อมูลอยู่ในรูปแบบที่ถูกต้อง\n- ไม่ใช่ไฟล์ว่างหรือไฟล์ template`
      }, { status: 400 });
  }
  
  console.log(`✅ Found ${scanResult.totalFound} students, starting at row ${scanResult.firstDataRow}`);

  // ---------- Get Format from User Selection ----------
  const formatParam = formData.get("format") as string;
  const format = formatParam || "1"; // Default to Format 1 if not specified
  
  console.log(`📋 Using Format ${format} (User Selected)`);
  
  // ---------- Format Logic ----------
  if (format === "1") {
      // Format 1: Standard (Row 8, Global Section, No Email)
      dataStartRow = 8;
      colMap.no = 1;          // A
      colMap.studentCode = 2; // B
      colMap.firstName = 3;   // C
      colMap.lastName = 4;    // D
      
      // Section from header C4: "000/810" -> Lec 000, Lab 810
      const secVal = cellToString(sheet.getCell("C4").value).trim();
      if (secVal) {
          const parts = secVal.split("/");
          if (parts.length > 0) globalSecLec = parts[0].trim();
          if (parts.length > 1) globalSecLab = parts[1].trim();
      }

  } else if (format === "2") {
      // Format 2: CMU Reg (Row 5, Individual Sections, Email at I)
      dataStartRow = 5;
      colMap.no = 1;          // A
      colMap.secLec = 2;      // B
      colMap.secLab = 3;      // C
      colMap.studentCode = 4; // D
      colMap.firstName = 5;   // E
      colMap.lastName = 6;    // F
      colMap.email = 9;       // I

  } else if (format === "3") {
      // Format 3: Standard with Email (Row 8, Global Section, Email at G)
      dataStartRow = 8;
      colMap.no = 1;          // A
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

  } else if (format === "4") {
      // Format 4: CMU Reg Alt (Row 5, Individual Sections, Email at I)
      // Same as Format 2
      dataStartRow = 5;
      colMap.no = 1;          // A
      colMap.secLec = 2;      // B
      colMap.secLab = 3;      // C
      colMap.studentCode = 4; // D
      colMap.firstName = 5;   // E
      colMap.lastName = 6;    // F
      colMap.email = 9;       // I
      
  } else {
      // Fallback
      dataStartRow = 8;
      colMap.studentCode = 2;
      colMap.firstName = 3;
      colMap.lastName = 4;
  }

  // If analyzing, we just want to find unique sections
  const foundSections = new Set<string>();
  const previewRows: { no: number; studentCode: string; firstName: string; lastName: string; displayName: string; section: string; lab: string; email: string; rowNumber: number }[] = [];

  // ========== VALIDATION PASS: Check data quality BEFORE importing ==========
  const validationErrors: string[] = [];
  let validRowCount = 0;
  
  console.log(`🔍 Starting validation pass from row ${dataStartRow}...`);
  console.log(`📋 Will also check ${scanResult.studentRows.length} detected student rows`);
  
  // Use detected student rows OR fall back to sequential scan from dataStartRow
  const rowsToCheck = scanResult.studentRows.length > 0 
    ? scanResult.studentRows 
    : Array.from({ length: sheet.rowCount - dataStartRow + 1 }, (_, i) => dataStartRow + i);
  
  for (const r of rowsToCheck) {
    const row = sheet.getRow(r);
    
    // Get student code
    let studentCode = "";
    if (colMap.studentCode !== -1) studentCode = cellToString(row.getCell(colMap.studentCode).value).trim();
    
    // Try to find in first few columns if not mapped
    if (!studentCode && format === "1") {
        for(let c=1; c<=5; c++) {
            const val = cellToString(row.getCell(c).value).trim();
            if (/^\d{9}$/.test(val)) {
                studentCode = val;
                break;
            }
        }
    }
    
    // Skip empty rows
    if (!studentCode) continue;
    
    // CRITICAL VALIDATION: Student code must be EXACTLY 9 digits
    if (!/^\d{9}$/.test(studentCode)) {
        validationErrors.push(`แถว ${r}: รหัสนักศึกษาไม่ถูกต้อง "${studentCode}" (ต้องเป็นตัวเลข 9 หลักเท่านั้น)`);
        continue;
    }
    
    // Get name
    let firstName = "";
    let lastName = "";
    if (colMap.firstName !== -1) firstName = cellToString(row.getCell(colMap.firstName).value).trim();
    if (colMap.lastName !== -1) lastName = cellToString(row.getCell(colMap.lastName).value).trim();
    
    // VALIDATION: Name must not be empty and should contain valid characters
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName || fullName.length < 2) {
        validationErrors.push(`แถว ${r}: ชื่อ-นามสกุลไม่ถูกต้อง "${fullName}"`);
        continue;
    }
    
    // VALIDATION: Name should only contain Thai, English, spaces, and common punctuation
    if (!/^[ก-๙a-zA-Z\s\.\-]+$/.test(fullName)) {
        validationErrors.push(`แถว ${r}: ชื่อมีอักขระที่ไม่ถูกต้อง "${fullName}"`);
        continue;
    }
    
    // Get sections
    let secLec = "";
    let secLab = "";
    if (colMap.secLec !== -1) secLec = cellToString(row.getCell(colMap.secLec).value).trim();
    if (colMap.secLab !== -1) secLab = cellToString(row.getCell(colMap.secLab).value).trim();
    if (colMap.section !== -1 && !secLec) secLec = cellToString(row.getCell(colMap.section).value).trim();
    
    // Fallback to global
    if (!secLec && globalSecLec) secLec = globalSecLec;
    if (!secLab && globalSecLab) secLab = globalSecLab;
    
    // VALIDATION: Section must be numeric or empty
    if (secLec && !/^\d+$/.test(secLec.replace(/^0+/, "") || "0")) {
        validationErrors.push(`แถว ${r}: Section Lecture ไม่ถูกต้อง "${secLec}" (ต้องเป็นตัวเลขเท่านั้น)`);
        continue;
    }
    
    if (secLab && secLab !== "-" && !/^\d+$/.test(secLab.replace(/^0+/, "") || "0")) {
        validationErrors.push(`แถว ${r}: Section Lab ไม่ถูกต้อง "${secLab}" (ต้องเป็นตัวเลขเท่านั้น)`);
        continue;
    }
    
    // Get email
    let email = "";
    if (colMap.email !== -1) email = cellToString(row.getCell(colMap.email).value).trim();
    
    // VALIDATION: Email must be @cmu.ac.th if present
    if (email && !email.endsWith("@cmu.ac.th")) {
        validationErrors.push(`แถว ${r}: อีเมลไม่ถูกต้อง "${email}" (ต้องเป็น @cmu.ac.th เท่านั้น)`);
        continue;
    }
    
    validRowCount++;
  }
  
  console.log(`✅ Validation complete: ${validRowCount} valid rows, ${validationErrors.length} errors`);
  
  // REJECT if there are validation errors
  if (validationErrors.length > 0) {
      const errorSummary = validationErrors.slice(0, 10).join("\n");
      const moreErrors = validationErrors.length > 10 ? `\n\n... และอีก ${validationErrors.length - 10} ข้อผิดพลาด` : "";
      
      return NextResponse.json({ 
          error: `❌ ไฟล์ Excel มีข้อมูลที่ไม่ถูกต้อง!\n\nพบข้อผิดพลาด ${validationErrors.length} รายการ:\n\n${errorSummary}${moreErrors}\n\n⚠️ กรุณาแก้ไขไฟล์ให้ถูกต้องก่อนนำเข้า`
      }, { status: 400 });
  }
  
  // REJECT if no valid rows found
  if (validRowCount === 0) {
      return NextResponse.json({ 
          error: `❌ ไม่พบข้อมูลนักศึกษาที่ถูกต้องในไฟล์!\n\nกรุณาตรวจสอบว่า:\n- ใช้ format ที่ถูกต้อง\n- มีข้อมูลนักศึกษาในไฟล์\n- รหัสนักศึกษาเป็นตัวเลข 9 หลัก`
      }, { status: 400 });
  }
  
  console.log(`✅ Validation passed! Proceeding with ${action}...`);
  
  // ========== END VALIDATION PASS ==========

  // Update active sections for this course (for roster filtering)
  if (action === "import") {
      const activeSectionsJson = selectedSections && selectedSections.length > 0 
          ? JSON.stringify(selectedSections)
          : null;
      
      await prisma.course.update({
          where: { id },
          data: { activeSections: activeSectionsJson }
      });
  }

  let readRows = 0;
  let importedRows = 0;
  const errors: string[] = [];
  const processedStudentCodes = new Set<string>();

  // ---------- loop ทีละแถวในตารางนักศึกษา ----------
  // Use the same rowsToCheck as validation loop
  for (const r of rowsToCheck) {
    const row = sheet.getRow(r);
    
    // ... (rest of the loop logic) ...

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

    // Collect Section for Analysis (Key: Lec|Lab)
    const secKey = `${secLec}|${secLab}`;
    if (secLec) foundSections.add(secKey);

    // Extract Name & Email (Moved up for Analysis Preview)
    let firstName = "";
    let lastName = "";
    let displayName = "";

    if (colMap.firstName !== -1) firstName = cellToString(row.getCell(colMap.firstName).value).trim();
    if (colMap.lastName !== -1) lastName = cellToString(row.getCell(colMap.lastName).value).trim();
    
    if (colMap.fullName !== -1) {
        const full = cellToString(row.getCell(colMap.fullName).value).trim();
        const nextColVal = cellToString(row.getCell(colMap.fullName + 1).value).trim();
        const prevColVal = cellToString(row.getCell(colMap.fullName - 1).value).trim();
        
        if (full && !full.includes(" ")) {
            if (lastName) {
                firstName = full;
                displayName = `${firstName} ${lastName}`;
            } else if (nextColVal && (format === "1" || format === "2")) {
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
    if (colMap.email !== -1) email = cellToString(row.getCell(colMap.email).value).trim();

    let cmuAccount = "";
    if (colMap.cmuAccount !== -1) cmuAccount = cellToString(row.getCell(colMap.cmuAccount).value).trim();

    if (!email && cmuAccount && cmuAccount.includes("@")) {
        email = cmuAccount;
    }

    // If Analyzing, collect ALL students (not just first 5)
    if (action === "analyze") {
         // Read NO from column A
         let noValue = r;
         if (colMap.no !== -1) {
             const noVal = cellToString(row.getCell(colMap.no).value).trim();
             const parsedNo = parseInt(noVal);
             if (!isNaN(parsedNo)) {
                 noValue = parsedNo;
             }
         }
         
         previewRows.push({
             no: noValue,
             studentCode,
             firstName,
             lastName,
             displayName,
             section: secLec,
             lab: secLab,
             email,
             rowNumber: r
         });
        readRows++;
        continue;
    }

    // If Importing, check if this student is selected
    if (action === "import") {
        const selectedStudentsJson = formData.get("selectedStudents") as string;
        let selectedStudentCodes: string[] | null = null;
        
        if (selectedStudentsJson) {
            try {
                selectedStudentCodes = JSON.parse(selectedStudentsJson);
            } catch {}
        }
        
        // If specific students are selected, only import those
        if (selectedStudentCodes && selectedStudentCodes.length > 0) {
            if (!selectedStudentCodes.includes(studentCode)) {
                continue; // Skip this student
            }
        }
    }

    readRows++;

    try {
      // ---------- upsert User ----------
      // Logic:
      // 1. Try to find user by studentCode
      // 2. If found, update displayName (but keep their real cmuAccount/email if they have one)
      // 3. If not found, create a PLACEHOLDER account
      
      const existingUser = await prisma.user.findUnique({
        where: { studentCode },
      });

      let userRecord;

      if (existingUser) {
          // Check if this is a placeholder account
          const isPlaceholder = existingUser.cmuAccount.startsWith("ROSTER_");
          
          if (isPlaceholder) {
              // ONLY update placeholder accounts
              const updateData: { displayNameTh?: string; cmuEmail?: string } = {};
              
              // Update displayName if empty or is the placeholder dash
              if (!existingUser.displayNameTh || existingUser.displayNameTh === "-") {
                  updateData.displayNameTh = displayName;
              }
              
              // Update email if we have one from Excel
              if (email) {
                  updateData.cmuEmail = email;
              }

              if (Object.keys(updateData).length > 0) {
                  userRecord = await prisma.user.update({
                      where: { id: existingUser.id },
                      data: updateData,
                  });
              } else {
                  userRecord = existingUser;
              }
          } else {
              // Real account (student has logged in via CMU OAuth)
              // DO NOT UPDATE any data from Excel - preserve real CMU data
              userRecord = existingUser;
              console.log(`ℹ️ Skipping data update for real account: ${existingUser.cmuAccount} (Student Code: ${studentCode})`);
          }
      } else {
          // Create new user
          userRecord = await prisma.user.create({
              data: {
                  studentCode,
                  displayNameTh: displayName || "-",
                  cmuAccount: `ROSTER_${studentCode}_${id}`, // Placeholder
                  cmuEmail: email || `${studentCode}@placeholder.cmu.ac.th`, // Use extracted email if available
                  isCmu: false,
              },
          });
      }

      // ---------- Assign STUDENT role ----------
      // Check if user already has STUDENT role
      const studentRole = await prisma.role.findUnique({
        where: { name: "STUDENT" }
      });

      if (studentRole) {
        const existingStudentRole = await prisma.userRole.findFirst({
          where: {
            userId: userRecord.id,
            roleId: studentRole.id,
            courseId: null // Global role
          }
        });

        if (!existingStudentRole) {
          await prisma.userRole.create({
            data: {
              userId: userRecord.id,
              roleId: studentRole.id,
              courseId: null
            }
          });
        }
      }

      // Read "No." from the mapped NO column
      // For Format 1 & 2: Column A starting from row 8
      // For Format 3: Column A starting from row 5
      let finalImportIndex = null;
      if (colMap.no !== -1) {
        const noVal = cellToString(row.getCell(colMap.no).value).trim();
        const parsedNo = parseInt(noVal);
        if (!isNaN(parsedNo)) {
          finalImportIndex = parsedNo;
        }
      }
      // If we couldn't read a valid NO, fallback to null (will be handled by database)
      if (finalImportIndex === null) {
        finalImportIndex = r - dataStartRow + 1; // Relative row number as fallback
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
          importIndex: finalImportIndex,
          isActive: true, // Mark as active when imported
        },
        create: {
          courseId: id,
          studentId: userRecord.id,
          studentCode,
          section: secLec || null,
          labSection: secLab || null,
          importIndex: finalImportIndex,
          isActive: true, // New enrollments are active
        },
      });

      importedRows++;
      
      // Track processed student codes for sync
      processedStudentCodes.add(studentCode);
    } catch (err) {
      console.error(`Error importing row ${r}:`, err);
      errors.push(`Row ${r} (${studentCode}): ${err}`);
    }
  }

  // ---------- SOFT DELETE LOGIC: Mark students not in Excel as inactive ----------
  if (action === "import") {
      try {
          const processedCodesArray = Array.from(processedStudentCodes);
          
          // First, mark ALL enrollments for this course as inactive
          await prisma.enrollment.updateMany({
              where: {
                  courseId: id
              },
              data: {
                  isActive: false
              }
          });
          
          // Then, mark only the imported students as active
          await prisma.enrollment.updateMany({
              where: {
                  courseId: id,
                  studentCode: {
                      in: processedCodesArray
                  }
              },
              data: {
                  isActive: true
              }
          });

          console.log(`Synced Roster: Marked students not in import as inactive (soft delete)`);
      } catch (e) {
          console.error("Error syncing roster:", e);
      }
  }

  if (action === "analyze") {
      return NextResponse.json({ 
          sections: Array.from(foundSections).sort(),
          students: previewRows, // Return ALL students found
          totalStudents: previewRows.length
      });
  }

  return NextResponse.json({
    success: true,
    readRows,
    importedRows,
    errors,
  });
}
