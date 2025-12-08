import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ courseId: string; sessionId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
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
    include: {
      userRoles: { include: { role: true } },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const isOwner = course.ownerId === user.id;
  const isTeacher = course.userRoles.some(
    (ur) => ur.userId === user.id && ["TEACHER", "CO_TEACHER", "TA"].includes(ur.role.name)
  );

  if (!isOwner && !isTeacher) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { studentId, status, note } = body;

    if (!studentId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (status === "ABSENT") {
      // Delete attendance record if exists
      await prisma.attendance.deleteMany({
        where: {
          classSessionId: sid,
          studentId: studentId,
        },
      });
      return NextResponse.json({ success: true, status: "ABSENT" });
    } else {
      // Upsert attendance record
      const attendance = await prisma.attendance.upsert({
        where: {
          classSessionId_studentId: {
            classSessionId: sid,
            studentId: studentId,
          },
        },
        update: {
          status: status,
          note: note || null,
          scannerId: user.id, // The teacher marking it is the "scanner"
          checkedAt: new Date(),
        },
        create: {
          classSessionId: sid,
          studentId: studentId,
          scannerId: user.id,
          status: status,
          note: note || null,
          checkedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, attendance });
    }
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
