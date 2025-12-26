import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ courseId: string; sessionId: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
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
    include: { userRoles: { include: { role: true } } },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const isOwner = course.ownerId === user.id;
  const isTeacher = course.userRoles.some(
    (ur) => ur.userId === user.id && ["TEACHER", "CO_TEACHER"].includes(ur.role.name)
  );

  if (!isOwner && !isTeacher) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Delete session
  await prisma.classSession.delete({
    where: { id: sid },
  });

  return NextResponse.json({ ok: true });
}
