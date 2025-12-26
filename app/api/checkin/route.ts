import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildToken } from "@/lib/payload";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Try to get user from session cookie first
  let user: Awaited<ReturnType<typeof getCurrentUser>> | Awaited<ReturnType<typeof prisma.user.findFirst>> = await getCurrentUser();
  const scan = await req.json(); // payload from CMU Mobile

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
        }
      });
      
      if (!user) {
         return NextResponse.json({ error: `Scanner account '${scannerAccount}' not found in system` }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Unauthorized: Please login or provide scanner info" }, { status: 401 });
    }
  }

  // Parse QR to get Session Info
  const qrRaw: string | undefined = scan?.qr;
  
  // Debug logging
  console.log("📦 [Checkin] Received payload:", JSON.stringify(scan, null, 2));
  console.log("🔍 [Checkin] QR Raw:", qrRaw);
  
  if (!qrRaw) {
    console.log("❌ [Checkin] Missing QR payload");
    return NextResponse.json({ error: "Missing qr payload" }, { status: 400 });
  }

  let cid: number | undefined;
  let sid: number | undefined;
  let studentCodeFromScan: string | undefined;
  let qrHash = qrRaw;

  // Parse CMU Mobile format: "reference *reference <url> <json>"
  // or legacy JSON format: "{...}"
  let jsonPart = qrRaw;
  
  if (qrRaw.startsWith('reference *reference') || qrRaw.startsWith('engqr:reference')) {
    // Extract JSON part after the URL
    // Format: "reference *reference https://... {...}"
    const parts = qrRaw.split(' ');
    // Find the part that starts with '{'
    const jsonIndex = parts.findIndex(p => p.startsWith('{'));
    if (jsonIndex !== -1) {
      jsonPart = parts.slice(jsonIndex).join(' ');
      console.log("🔧 [Checkin] Extracted JSON from CMU Mobile format:", jsonPart);
    }
  }

  // Attempt JSON Parse
  if (jsonPart.startsWith('{')) {
    try {
      const parsed = JSON.parse(jsonPart);
      if (parsed.courseId) cid = Number(parsed.courseId);
      if (parsed.sessionId) sid = Number(parsed.sessionId);
      if (parsed.code) studentCodeFromScan = parsed.code;
      if (parsed.hash) qrHash = parsed.hash;
      console.log("✅ [Checkin] Parsed QR data:", { cid, sid, studentCodeFromScan, hashLength: qrHash?.length });
    } catch (e) {
      console.log("❌ [Checkin] JSON parse error:", e);
    }
  }

  // If ID missing in QR, check if provided in body (unlikely for global webhook but possible)
  if (!cid || !sid) {
      return NextResponse.json({ error: "QR Code must contain courseId and sessionId for Global Webhook" }, { status: 400 });
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

  // Check if scanner is authorized
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

  if (!isOwner && !isAuthorizedStaff) {
    return NextResponse.json(
      { error: "Unauthorized: Only TA, Teacher, or Co-Teacher of this course can scan students" },
      { status: 403 }
    );
  }
    
  if (!studentCodeFromScan) {
    return NextResponse.json({ error: "Missing student_id in QR" }, { status: 400 });
  }

  // Must be enrolled student
  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId: cid, studentCode: studentCodeFromScan },
    include: {
      student: {
        select: {
          displayNameTh: true,
          displayNameEn: true,
          organizationTh: true,
          organizationEn: true,
        }
      }
    }
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

  // Return success response with SCANNED STUDENT info (not scanner info)
  const studentName = enrollment.student.displayNameTh || enrollment.student.displayNameEn || studentCodeFromScan;
  const faculty = enrollment.student.organizationTh || enrollment.student.organizationEn || "ไม่ระบุ";
  const courseName = course?.courseNameTh || course?.courseCode || "ไม่ระบุ";
  const section = enrollment.section ? `Section ${enrollment.section}` : "";
  const labSection = enrollment.labSection ? ` Lab ${enrollment.labSection}` : "";
  
  return NextResponse.json({ 
    success: true,
    message: `✅ เช็คชื่อสำเร็จ\n\n👤 ${studentName}\n🎓 รหัส: ${studentCodeFromScan}\n🏛️ ${faculty}\n📚 ${courseName} (${course?.courseCode})${section}${labSection}\n📝 ${session.name}\n⏰ ${new Date().toLocaleString('th-TH')}`,
    data: {
      studentCode: studentCodeFromScan,
      studentName: studentName,
      faculty: faculty,
      course: courseName,
      courseCode: course?.courseCode,
      section: enrollment.section,
      labSection: enrollment.labSection,
      status: "PRESENT",
      session: session.name,
      time: new Date().toLocaleString('th-TH')
    }
  });
}
