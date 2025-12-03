import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildToken } from "@/lib/payload";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ courseId: string; sessionId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { courseId, sessionId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cid = Number(courseId);
  const sid = Number(sessionId);
  const scan = await req.json(); // payload จาก CMU Mobile (มี qr, student_id, email, it_account ฯลฯ)

  const session = await prisma.classSession.findFirst({
    where: { id: sid, courseId: cid },
  });
  if (!session)
    return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (session.expiresAt && new Date() > session.expiresAt) {
    return NextResponse.json(
      { error: "Session expired", status: "EXPIRED" },
      { status: 400 }
    );
  }

  // Check if scanner is authorized (TA, Teacher, or Co-Teacher of this course)
  const course = await prisma.course.findUnique({
    where: { id: cid },
    include: {
      userRoles: {
        where: {
          userId: user.id,
          role: { name: { in: ["TA", "TEACHER", "CO_TEACHER"] } },
        },
      },
    },
  });

  const isOwner = course?.ownerId === user.id;
  const isAuthorizedStaff = course && course.userRoles.length > 0;

  if (!isOwner && !isAuthorizedStaff) {
    return NextResponse.json(
      { error: "Unauthorized: Only TA, Teacher, or Co-Teacher of this course can scan students" },
      { status: 403 }
    );
  }

  const qr: string | undefined = scan?.qr;
  const studentCodeFromScan: string | undefined =
    scan?.student_id || scan?.studentId || scan?.studentCode;

  if (!qr)
    return NextResponse.json({ error: "Missing qr payload" }, { status: 400 });
  if (!studentCodeFromScan) {
    return NextResponse.json({ error: "Missing student_id" }, { status: 400 });
  }

  // ต้องเป็น นศ ที่ลงทะเบียนในวิชานี้
  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId: cid, studentCode: studentCodeFromScan },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  // เปรียบเทียบ token (pre-hash)
  const expected = buildToken(studentCodeFromScan, cid, session.keyword);
  if (expected !== qr) {
    return NextResponse.json(
      { error: "Invalid payload", status: "INVALID" },
      { status: 400 }
    );
  }

  // กันเช็กซ้ำ
  const dup = await prisma.attendance.findUnique({
    where: {
      classSessionId_studentId: {
        classSessionId: sid,
        studentId: enrollment.studentId,
      },
    },
  });
  if (dup) {
    return NextResponse.json({ ok: true, status: "DUPLICATE" });
  }

  await prisma.attendance.create({
    data: {
      classSessionId: sid,
      studentId: enrollment.studentId,
      scannerId: user.id,
      status: "PRESENT",
      payloadRaw: JSON.stringify(scan),
    },
  });

  return NextResponse.json({ ok: true, status: "PRESENT" });
}
