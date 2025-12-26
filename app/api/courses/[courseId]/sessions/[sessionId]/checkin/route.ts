import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildToken } from "@/lib/payload";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ courseId: string; sessionId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { courseId, sessionId } = await ctx.params;
  
  // Try to get user from session cookie first
  let user = await getCurrentUser();
  
  const cid = Number(courseId);
  const sid = Number(sessionId);
  const scan = await req.json(); // payload from CMU Mobile (qr, student_id, email, it_account, etc)

  // If no session user, try to identify scanner from payload (CMU Mobile Scenario)
  if (!user) {
    const scannerAccount = scan?.it_account || scan?.cmuAccount || scan?.email?.split('@')[0];
    if (scannerAccount) {
      // Find scanner in DB
      user = await prisma.user.findFirst({
        where: { 
          OR: [
            { cmuAccount: scannerAccount },
            { cmuEmail: scannerAccount }, // handling if full email passed
            { cmuEmail: `${scannerAccount}@cmu.ac.th` }
          ]
        },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });
      
      if (!user) {
         return NextResponse.json({ error: `Scanner account '${scannerAccount}' not found in system` }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Unauthorized: Please login or provide scanner info" }, { status: 401 });
    }
  }

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
          role: { name: { in: ["TA", "TEACHER", "CO_TEACHER", "ADMIN"] } },
        },
      },
    },
  });

  const isOwner = course?.ownerId === user.id;
  const isAuthorizedStaff = course && course.userRoles.length > 0;
  // TODO: Maybe allow ADMIN role globally? But existing logic checks per course. 
  // For now, assume Admin has enrolled as Teacher/TA or is Owner.
  // Actually, let's allow if user has global ADMIN role? 
  // Just sticking to course roles for safety for now.

  if (!isOwner && !isAuthorizedStaff) {
    return NextResponse.json(
      { error: "Unauthorized: Only TA, Teacher, or Co-Teacher of this course can scan students" },
      { status: 403 }
    );
  }

  const qrRaw: string | undefined = scan?.qr;
  
  // Parse QR: It might be JSON now
  let studentCodeFromScan: string | undefined = scan?.student_id || scan?.studentId || scan?.studentCode;
  let qrHash = qrRaw;

  if (qrRaw && qrRaw.startsWith('{')) {
    try {
      const parsed = JSON.parse(qrRaw);
      if (parsed.code && parsed.hash) {
        studentCodeFromScan = parsed.code;
        qrHash = parsed.hash;
      }
    } catch (e) {
      // ignore, treat as raw string
    }
  }

  if (!qrHash)
    return NextResponse.json({ error: "Missing qr payload" }, { status: 400 });
    
  if (!studentCodeFromScan) {
    return NextResponse.json({ error: "Missing student_id (Cannot extract from QR)" }, { status: 400 });
  }

  // Must be enrolled student
  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId: cid, studentCode: studentCodeFromScan },
  });
  if (!enrollment) {
    return NextResponse.json({ error: `Student ${studentCodeFromScan} not enrolled` }, { status: 403 });
  }

  // Verify Token
  const expected = buildToken(studentCodeFromScan, cid, session.keyword, sid);
  if (expected !== qrHash) {
    return NextResponse.json(
      { error: "Invalid payload/hash mismatch", status: "INVALID" },
      { status: 400 }
    );
  }

  // Check Duplicate
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
      ip: req.headers.get("x-forwarded-for") || "unknown",
      deviceInfo: req.headers.get("user-agent") || "unknown",
    },
  });

  return NextResponse.json({ ok: true, status: "PRESENT" });
}
