// app/api/courses/[courseId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Next 16: params เป็น Promise ต้อง await
type RouteCtx = { params: Promise<{ courseId: string }> };

// ไว้เทสต์ว่ารูทนี้ทำงานรึยัง: เปิดเบราว์เซอร์ไปที่ /api/courses/1
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { courseId } = await ctx.params;
  const id = Number(courseId);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, course });
}

// ลบ course + ข้อมูลที่เกี่ยวข้องทั้งหมด
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { courseId } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(courseId);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  // ตรวจว่าเป็นวิชาของอาจารย์คนนี้จริง ๆ
  const course = await prisma.course.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction([
      prisma.attendance.deleteMany({
        where: {
          classSession: { courseId: id },
        },
      }),
      prisma.classSession.deleteMany({
        where: { courseId: id },
      }),
      prisma.enrollment.deleteMany({
        where: { courseId: id },
      }),
      prisma.userRole.deleteMany({
        where: { courseId: id },
      }),
      prisma.course.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("Delete course error:", detail);
    return NextResponse.json(
      { error: "Failed to delete course", detail },
      { status: 500 }
    );
  }
}
