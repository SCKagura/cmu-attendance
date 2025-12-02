// app/api/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    courseCode?: string;
    courseNameTh?: string;
    academicYear?: number;
    semester?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { courseCode, courseNameTh, academicYear, semester } = body;

  if (!courseCode || !academicYear || !semester) {
    return NextResponse.json(
      {
        error: "Missing fields",
        detail: "courseCode, academicYear, semester are required",
      },
      { status: 400 }
    );
  }

  try {
    const course = await prisma.course.create({
      data: {
        courseCode,
        courseNameTh: courseNameTh ?? null,
        academicYear,
        semester,
        ownerId: user.id,
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("Create course error:", detail);
    return NextResponse.json(
      { error: "Failed to create course", detail },
      { status: 500 }
    );
  }
}
