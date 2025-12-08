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
  const action = formData.get("action") as string || "import"; // 'analyze' or 'import'
  const selectedSectionsJson = formData.get("selectedSections") as string;
  let selectedSections: string[] | null = null;
  
  if (selectedSectionsJson) {
      try {
          selectedSections = JSON.parse(selectedSectionsJson);
      } catch (e) {}
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
  if (c2 !== course.courseCode) {
      return NextResponse.json({ 
          error: `รหัสวิชาในไฟล์ (${c2}) ไม่ตรงกับวิชานี้ (${course.courseCode})` 
      }, { status: 400 });
  }

  const instructorName = cellToString(sheet.getCell("C5").value).trim();
  if (instructorName && action === "import") {
      await prisma.course.update({
          where: { id },
          data: { instructorName }
      });
  }

  // ---------- Format Logic ----------
  if (format === "1") {
      // Format 1: Standard
      dataStartRow = 8;
      colMap.no = 1;          // A
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

  } else if (format === "3") {
      // Format 3: Code First / Full Detail
      dataStartRow = 5;
      colMap.no = 1;          // A
      colMap.studentCode = 4; // D
      colMap.secLec = 2;      // B
      colMap.secLab = 3;      // C
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
  const previewRows: any[] = [];

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
  for (let r = dataStartRow; r <= sheet.rowCount; r++) {
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

    // If Analyzing, collect preview and continue
    if (action === "analyze") {
        if (previewRows.length < 5) {
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
                 section: secLec,
                 lab: secLab,
                 email
             });
        }
        readRows++;
        continue;
    }

    // If Importing, check if section is selected
    if (selectedSections && selectedSections.length > 0) {
        const isMatch = selectedSections.includes(secKey);
        console.log(`DEBUG: Row ${r}: Code=${studentCode} SecKey=${secKey} Match=${isMatch} Selected=${JSON.stringify(selectedSections)}`);
        if (!isMatch) continue;
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
          // Update existing user
          // Only update email if it's a placeholder account AND we have a new email
          const isPlaceholder = existingUser.cmuAccount.startsWith("ROSTER_");
          const updateData: any = {};
          
          // Update displayName if it's a placeholder or empty
          if (isPlaceholder || !existingUser.displayNameTh) {
              updateData.displayNameTh = displayName;
          }
          
          if (isPlaceholder && email) {
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
        },
        create: {
          courseId: id,
          studentId: userRecord.id,
          studentCode,
          section: secLec || null,
          labSection: secLab || null,
          importIndex: finalImportIndex,
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

  // ---------- SYNC LOGIC: Remove students not in Excel ----------
  if (action === "import") {
      try {
          const processedCodesArray = Array.from(processedStudentCodes);
          
          const deleteWhere: any = {
              courseId: id,
              studentCode: {
                  notIn: processedCodesArray
              }
          };

          // If filtering by section, only remove missing students from those sections
          if (selectedSections && selectedSections.length > 0) {
              // Extract secLec and secLab from "Lec|Lab" strings
              // This is a bit complex due to "OR" logic for multiple sections
              // Simpler approach: If syncing specific sections, we iterate and delete matchers
              
              // However, Prisma doesn't support complex OR in deleteMany easily with related fields mixed
              // So we might need to find them first then delete, or make a generalized assumption.
              
              // Let's rely on the fact that if a student is NOT in the processed list, 
              // AND they are currently enrolled in one of the selected sections, they should be removed.
              
              // Construct OR conditions for each selected section
              const sectionConditions = selectedSections.map(s => {
                  const [lec, lab] = s.split("|");
                  return {
                      section: lec === "0" || lec === "" ? null : lec,
                      labSection: lab === "0" || lab === "" ? null : lab
                  };
              });

              deleteWhere.OR = sectionConditions;
          }

          const deleted = await prisma.enrollment.deleteMany({
              where: deleteWhere
          });

          console.log(`Synced Roster: Deleted ${deleted.count} students not in import list`);
      } catch (e) {
          console.error("Error syncing roster:", e);
      }
  }

  if (action === "analyze") {
      return NextResponse.json({ 
          sections: Array.from(foundSections).sort(),
          preview: previewRows
      });
  }

  return NextResponse.json({
    success: true,
    readRows,
    importedRows,
    errors,
  });
}
