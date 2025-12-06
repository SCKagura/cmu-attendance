
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

// Helper from route.ts
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
    if (typeof v.text === "string") return v.text;
    if (Array.isArray(v.richText)) {
      return v.richText.map((p: { text?: string }) => p.text ?? "").join("");
    }
    if (v.result != null) return String(v.result);
  }

  return String(value);
}

async function testFile(filename: string) {
    const filePath = path.join(process.cwd(), "app", "example_excel", filename);
    console.log(`\n--------------------------------------------------`);
    console.log(`Testing file: ${filename}`);
    
    if (!fs.existsSync(filePath)) {
        console.error("File not found:", filePath);
        return;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];

    if (!sheet) {
        console.error("No worksheet found");
        return;
    }

    // --- LOGIC FROM route.ts START ---
    let dataStartRow = 0;
    let colMap = {
        studentCode: -1,
        firstName: -1,
        lastName: -1,
        fullName: -1,
        email: -1,
        cmuAccount: -1,
        secLec: -1,
        secLab: -1,
        section: -1,
    };

    let headerRowIndex = 0;
    let globalSecLec = "";
    let globalSecLab = "";

    // First pass: Find the header row AND look for metadata "SECTION (lec/lab) :"
    sheet.eachRow((row, rowNumber) => {
        if (headerRowIndex > 0) return; // Stop if header found

        // Check for metadata in first few columns
        row.eachCell((cell) => {
            const text = cellToString(cell.value).trim(); // Keep case for now, or lower?
            const lowerText = text.toLowerCase();
            
            // Check for "SECTION (lec/lab) :" pattern
            if (lowerText.includes("section") && (lowerText.includes("lec") || lowerText.includes("lab"))) {
                 // Try to extract value from this cell or next cell
                 let val = text.split(":")[1]?.trim();
                 if (!val) {
                     // Check next cell
                     const nextCell = row.getCell(cell.col + 1);
                     val = cellToString(nextCell.value).trim();
                 }

                 if (val) {
                     // Expected format "000 / 810" or similar
                     const parts = val.split("/").map(s => s.trim());
                     if (parts.length >= 1) globalSecLec = parts[0];
                     if (parts.length >= 2) globalSecLab = parts[1];
                 }
            }

            if (lowerText.includes("รหัสนักศึกษา") || lowerText.includes("student code") || lowerText.includes("student id")) {
                headerRowIndex = rowNumber;
            }
        });
    });

    console.log("Global Section Info:", { globalSecLec, globalSecLab });

    if (headerRowIndex > 0) {
        dataStartRow = headerRowIndex + 1;
        
        // Map columns based on the identified header row
        const row = sheet.getRow(headerRowIndex);
        row.eachCell((cell, colNumber) => {
             const text = cellToString(cell.value).toLowerCase().replace(/\s+/g, " ").trim();
             
             if (text.includes("รหัสนักศึกษา") || text.includes("student code") || text.includes("student id")) {
                 colMap.studentCode = colNumber;
             } else if (text === "ชื่อ" || text === "first name") {
                 colMap.firstName = colNumber;
             } else if (text === "นามสกุล" || text === "last name") {
                 colMap.lastName = colNumber;
             } else if ((text.includes("ชื่อ") && text.includes("นามสกุล")) || (text.includes("name") && !text.includes("first") && !text.includes("last"))) {
                 colMap.fullName = colNumber;
             } else if (text.includes("email") || text.includes("อีเมล")) {
                 colMap.email = colNumber;
             } else if (text.includes("cmu it account") || text.includes("cmu account")) {
                 colMap.cmuAccount = colNumber;
             } else if (text.includes("seclec") || (text.includes("sec") && text.includes("lec"))) {
                 colMap.secLec = colNumber;
             } else if (text.includes("seclab") || (text.includes("sec") && text.includes("lab"))) {
                 colMap.secLab = colNumber;
             } else if (text === "sec" || text === "section" || text === "กลุ่ม") {
                 colMap.section = colNumber;
             }
        });
    }

    if (!dataStartRow) {
        for(let r = 1; r <= Math.min(20, sheet.rowCount); r++) {
            const row = sheet.getRow(r);
            const cell1 = cellToString(row.getCell(1).value);
            const cell2 = cellToString(row.getCell(2).value);
            if (/^\d{9}$/.test(cell1) || /^\d{9}$/.test(cell2)) {
                dataStartRow = r;
                if (/^\d{9}$/.test(cell1)) colMap.studentCode = 1;
                else if (/^\d{9}$/.test(cell2)) colMap.studentCode = 2;
                break;
            }
        }
        if (!dataStartRow) dataStartRow = 5;
    }

    console.log("Detected Start Row:", dataStartRow);
    console.log("Detected Columns:", colMap);

    let extractedCount = 0;
    const samples: any[] = [];

    for (let r = dataStartRow; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        let studentCode = "";
        if (colMap.studentCode !== -1) studentCode = cellToString(row.getCell(colMap.studentCode).value);
        
        if (!studentCode) {
            for(let c=1; c<=5; c++) {
                const val = cellToString(row.getCell(c).value);
                if (/^\d{9}$/.test(val)) {
                    studentCode = val;
                    break;
                }
            }
        }

        if (!studentCode || !/^\d+$/.test(studentCode)) continue;

        let secLec = "";
        let secLab = "";
        
        if (colMap.secLec !== -1) secLec = cellToString(row.getCell(colMap.secLec).value);
        if (colMap.secLab !== -1) secLab = cellToString(row.getCell(colMap.secLab).value);
        if (colMap.section !== -1 && !secLec) secLec = cellToString(row.getCell(colMap.section).value);

        // Fallback to global section info
        if (!secLec && globalSecLec) secLec = globalSecLec;
        if (!secLab && globalSecLab) secLab = globalSecLab;

        if (secLec) secLec = secLec.replace(/^0+/, "") || "0";
        if (secLab) secLab = secLab.replace(/^0+/, "") || "0";

        let firstName = "";
        let lastName = "";
        let displayName = "";

        if (colMap.firstName !== -1) firstName = cellToString(row.getCell(colMap.firstName).value);
        if (colMap.lastName !== -1) lastName = cellToString(row.getCell(colMap.lastName).value);
        
        if (colMap.fullName !== -1) {
            const full = cellToString(row.getCell(colMap.fullName).value);
            const nextColVal = cellToString(row.getCell(colMap.fullName + 1).value);
            
            if (full && !full.includes(" ") && nextColVal) {
                firstName = full;
                lastName = nextColVal;
                displayName = `${firstName} ${lastName}`;
            } else {
                displayName = full;
            }
        } else {
            displayName = [firstName, lastName].filter(Boolean).join(" ");
        }

        extractedCount++;
        if (extractedCount <= 3 || extractedCount > sheet.rowCount - dataStartRow - 3) { // Show first 3
             samples.push({ r, studentCode, displayName, secLec, secLab });
        }
    }
    // --- LOGIC END ---

    console.log(`Extracted ${extractedCount} students.`);
    console.log("Samples:", samples.slice(0, 5)); // Show first 5 samples
}

async function run() {
    const files = [
        "EXCEL.xlsx",
        "EXCEL261492AllSection-Cleaned.xlsx",
        "EXCELLOG-CMUITACCOUNT.xlsx",
        "EXCELStudentPointRecord.xlsx"
    ];

    for (const f of files) {
        await testFile(f);
    }
}

run();
