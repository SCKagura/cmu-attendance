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
  const { studentCode, firstName, lastName, email, cmuAccount } = await req.json();

  if (!studentCode || !email) {
    return NextResponse.json(
      { error: "Missing required fields" },
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
  const isTeacher = course.userRoles.some(
    (ur) => ur.userId === user.id && ur.roleId // Simplified check, ideally check role name
  );
  // We need to check role name properly, but let's trust the user is authorized if they can reach here via UI which checks permissions.
  // Better:
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

  const displayName = [firstName, lastName].filter(Boolean).join(" ");

  // Upsert User
  const userRecord = await prisma.user.upsert({
    where: { cmuAccount: cmuAccount || email.split("@")[0] },
    update: {
        studentCode,
        displayNameTh: displayName,
        displayNameEn: displayName,
    },
    create: {
      cmuAccount: cmuAccount || email.split("@")[0],
      cmuEmail: email,
      studentCode,
      displayNameTh: displayName,
      displayNameEn: displayName,
      isCmu: true,
    },
  });

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
  const enrollment = await prisma.enrollment.upsert({
    where: {
      courseId_studentId: {
        courseId: cid,
        studentId: userRecord.id,
      },
    },
    update: {
      studentCode,
    },
    create: {
      courseId: cid,
      studentId: userRecord.id,
      studentCode,
    },
  });

  return NextResponse.json({ ok: true, enrollment });
}
