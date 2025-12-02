import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ courseId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { courseId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(courseId);
  const body = await req.json();

  const {
    name = "Class",
    classIndex = null,
    date,
    startTime,
    endTime,
    keyword,
    expiresInMinutes = 120,
  } = body;

  if (!keyword) {
    return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!course)
    return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const now = new Date();
  const d = date ? new Date(date) : now;
  const st = startTime ? new Date(startTime) : now;
  const et = endTime
    ? new Date(endTime)
    : new Date(st.getTime() + 60 * 60 * 1000);
  const expiresAt = new Date(et.getTime() + expiresInMinutes * 60 * 1000);

  const session = await prisma.classSession.create({
    data: {
      courseId: id,
      name,
      classIndex,
      date: d,
      startTime: st,
      endTime: et,
      keyword,
      expiresAt,
    },
  });

  return NextResponse.json({ ok: true, id: session.id });
}
