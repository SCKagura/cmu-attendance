import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseCode, courseNameTh, academicYear, semester } = await req.json();
  if (!courseCode || !academicYear || !semester) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const course = await prisma.course.create({
    data: {
      courseCode,
      courseNameTh,
      academicYear: Number(academicYear),
      semester: Number(semester),
      ownerId: me.id,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: course.id });
}
