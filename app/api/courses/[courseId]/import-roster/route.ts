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
  sheet.eachRow((row, rowNumber) => {
    const text = cellToString(row.getCell(4).value); // D น่าจะเป็น "รหัสนักศึกษา"
    if (text.includes("รหัสนักศึกษา")) {
      dataStartRow = rowNumber + 1;
    }
  });

  if (!dataStartRow) {
    dataStartRow = 5; // fallback
  }

  // ลบ enrollment เดิมของวิชานี้ก่อน import ใหม่ (กันข้อมูลซ้ำ/ผิด)
  await prisma.enrollment.deleteMany({ where: { courseId: id } });

  let readRows = 0;
  let importedRows = 0;
  const errors: string[] = [];

  // ---------- loop ทีละแถวในตารางนักศึกษา ----------
  for (let r = dataStartRow; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    // mapping ให้ตรง excel (จากรูปที่ส่งมา)
    const secLec = cellToString(row.getCell(2).value); // B = SECLEC
    const secLab = cellToString(row.getCell(3).value); // C = SECLAB
    const studentCode = cellToString(row.getCell(4).value); // D = รหัสนักศึกษา

    const firstName = cellToString(row.getCell(5).value); // E = ชื่อ
    const lastName = cellToString(row.getCell(6).value); // F = นามสกุล
    const displayName = [firstName, lastName].filter(Boolean).join(" "); // ✅ ใช้ชื่อเดียว

    const email = cellToString(row.getCell(9).value); // I = email

    // ข้ามแถวว่าง ๆ (ไม่มีรหัสนักศึกษา)
    if (!studentCode) continue;

    readRows++;

    try {
      // เดา it_account จาก email ถ้ามี
      const cmuAccount =
        email && email.includes("@")
          ? email.split("@")[0]
          : `stu_${studentCode}`;

      // ---------- upsert User ----------
      const userRecord = await prisma.user.upsert({
        where: studentCode
          ? { studentCode } // ใช้ studentCode เป็น key หลัก
          : { cmuEmail: email }, // fallback ถ้าไม่มีก็ใช้ email
        update: {
          cmuEmail: email || undefined,
          // ✅ เก็บ displayName ตัวเดียว แต่ใส่ทั้ง Th/En ไว้ให้เหมือนกัน
          displayNameTh: displayName || undefined,
          displayNameEn: displayName || undefined,
          studentCode: studentCode || undefined,
        },
        create: {
          cmuAccount,
          cmuEmail: email || `${studentCode}@example.com`,
          studentCode,
          displayNameTh: displayName || null,
          displayNameEn: displayName || null,
          isCmu: true,
        },
      });

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
        },
        create: {
          courseId: id,
          studentId: userRecord.id,
          studentCode,
          section: secLec || null,
          labSection: secLab || null,
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
