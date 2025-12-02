import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ courseId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { courseId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(courseId);
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          student: {
            select: {
              studentCode: true,
              displayNameTh: true,
              displayNameEn: true,
              cmuAccount: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  return NextResponse.json({ course });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { courseId } = await ctx.params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(courseId);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.ownerId !== me.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.attendance.deleteMany({ where: { classSession: { courseId: id } } }),
    prisma.classSession.deleteMany({ where: { courseId: id } }),
    prisma.enrollment.deleteMany({ where: { courseId: id } }),
    prisma.userRole.deleteMany({ where: { courseId: id } }),
    prisma.course.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
