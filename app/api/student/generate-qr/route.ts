import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildToken } from "@/lib/payload";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId, keyword } = await req.json();

  if (!courseId || !keyword) {
    return NextResponse.json(
      { error: "Missing courseId or keyword" },
      { status: 400 }
    );
  }

  const cid = Number(courseId);

  // Check if student is enrolled in this course
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      courseId: cid,
      studentId: user.id,
    },
    include: {
      course: true,
    },
  });

  if (!enrollment) {
    return NextResponse.json(
      { error: "You are not enrolled in this course" },
      { status: 403 }
    );
  }

  // Find active session by keyword
  const session = await prisma.classSession.findFirst({
    where: {
      courseId: cid,
      keyword: keyword.trim(),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!session) {
    return NextResponse.json(
      { error: "No session found with this keyword" },
      { status: 404 }
    );
  }

  // Check if session is expired
  // Check if session is expired
  // if (session.expiresAt && new Date() > session.expiresAt) {
  //   return NextResponse.json(
  //     { error: "This session has expired" },
  //     { status: 400 }
  //   );
  // }

  // Generate QR token
  const qrToken = buildToken(
    enrollment.studentCode,
    cid,
    session.keyword
  );

  return NextResponse.json({
    ok: true,
    qrToken,
    session: {
      id: session.id,
      name: session.name,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      expiresAt: session.expiresAt,
    },
    course: {
      courseCode: enrollment.course.courseCode,
      courseNameTh: enrollment.course.courseNameTh,
    },
    studentCode: enrollment.studentCode,
  });
}
