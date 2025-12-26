import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ courseId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { courseId } = await ctx.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cid = Number(courseId);
  const { studentCode, section, labSection } = await req.json();

  if (!studentCode) {
    return NextResponse.json(
      { error: "Student code is required" },
      { status: 400 }
    );
  }

  // Validate student code format (9 digits)
  if (!/^\d{9}$/.test(studentCode)) {
    return NextResponse.json(
      { error: "Student code must be 9 digits" },
      { status: 400 }
    );
  }

  // Check permissions (Owner or Teacher)
  const course = await prisma.course.findFirst({
    where: { id: cid },
    include: { userRoles: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const isOwner = course.ownerId === user.id;
  const hasPermission = isOwner || await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      courseId: cid,
      role: { name: { in: ["TEACHER", "TA", "CO_TEACHER"] } }
    }
  });

  if (!hasPermission) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Calculate next importIndex
  const maxEnrollment = await prisma.enrollment.findFirst({
    where: { courseId: cid },
    orderBy: { importIndex: "desc" },
    select: { importIndex: true },
  });

  const nextImportIndex = (maxEnrollment?.importIndex ?? 0) + 1;

  // Find user by studentCode
  const userRecord = await prisma.user.findUnique({
    where: { studentCode },
  });

  if (!userRecord) {
    return NextResponse.json(
      { error: "Student not found in system" },
      { status: 404 }
    );
  }

  // Assign STUDENT Role
  const studentRole = await prisma.role.upsert({
    where: { name: "STUDENT" },
    update: {},
    create: { name: "STUDENT" },
  });

  const existingStudentRole = await prisma.userRole.findFirst({
    where: {
      userId: userRecord.id,
      roleId: studentRole.id,
      courseId: null,
    },
  });

  if (!existingStudentRole) {
    await prisma.userRole.create({
      data: {
        userId: userRecord.id,
        roleId: studentRole.id,
        courseId: null,
      },
    });
  }

  // Upsert Enrollment
  console.log("Creating enrollment for:", {
    courseId: cid,
    studentId: userRecord.id,
    studentCode,
    section,
    labSection,
    nextImportIndex,
  });

  const enrollment = await prisma.enrollment.upsert({
    where: {
      courseId_studentId: {
        courseId: cid,
        studentId: userRecord.id,
      },
    },
    update: {
      studentCode,
      section: section || null,
      labSection: labSection || null,
    },
    create: {
      courseId: cid,
      studentId: userRecord.id,
      studentCode,
      section: section || null,
      labSection: labSection || null,
      importIndex: nextImportIndex,
    },
  });

  console.log("Enrollment created/updated:", enrollment);

  return NextResponse.json({ ok: true, enrollment });
}
