import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isTeacher, isAdmin } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only teachers and admins can create courses
  const canCreate = await isTeacher(me.id) || await isAdmin(me.id);
  if (!canCreate) {
    return NextResponse.json(
      { 
        error: "Access denied",
        message: "Only teachers can create courses. Please contact an administrator if you need teacher access."
      },
      { status: 403 }
    );
  }

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
