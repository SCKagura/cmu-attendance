import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ courseId: string }> };

// Get all TAs for a course
export async function GET(req: NextRequest, ctx: Ctx) {
  const { courseId } = await ctx.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cid = Number(courseId);

  // Check if user is the course owner
  const course = await prisma.course.findFirst({
    where: { id: cid, ownerId: user.id },
  });

  if (!course) {
    return NextResponse.json(
      { error: "Course not found or access denied" },
      { status: 404 }
    );
  }

  // Get all TAs for this course
  const taRoles = await prisma.userRole.findMany({
    where: {
      courseId: cid,
      role: {
        name: { in: ["TA", "TEACHER", "CO_TEACHER"] },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          cmuAccount: true,
          cmuEmail: true,
          displayNameTh: true,
          displayNameEn: true,
        },
      },
      role: true, // Include role info
    },
  });

  return NextResponse.json({ tas: taRoles });
}

// Add a TA to the course
export async function POST(req: NextRequest, ctx: Ctx) {
  const { courseId } = await ctx.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cid = Number(courseId);
  const body = await req.json();
  const { input, role = "TA" } = body;

  if (!input) {
    return NextResponse.json(
      { error: "Missing input (cmuAccount or email)" },
      { status: 400 }
    );
  }

  // Check if user is the course owner
  const course = await prisma.course.findFirst({
    where: { id: cid, ownerId: user.id },
  });

  if (!course) {
    return NextResponse.json(
      { error: "Course not found or access denied" },
      { status: 404 }
    );
  }

  // Determine account and email
  let account = input.trim();
  let email = "";

  if (account.includes("@")) {
    email = account;
    if (email.endsWith("@cmu.ac.th")) {
      account = email.split("@")[0];
    } else {
      account = email.split("@")[0];
    }
  } else {
    email = `${account}@cmu.ac.th`;
  }

  console.log("Received role from request:", role);
  // If role is TEACHER, we assign TEACHER role
  const targetRoleName = role === "TEACHER" ? "TEACHER" : "TA";
  console.log("Target role name:", targetRoleName);

  // Find or create the user
  const targetUser = await prisma.user.upsert({
    where: { cmuAccount: account },
    update: {},
    create: {
      cmuAccount: account,
      cmuEmail: email,
    },
  });

  // Get Role
  const roleRecord = await prisma.role.upsert({
    where: { name: targetRoleName },
    update: {},
    create: { name: targetRoleName },
  });

  // Remove existing roles for this user in this course AND global TA/CO_TEACHER roles
  // This ensures the user only has the specific role assigned for this course
  await prisma.userRole.deleteMany({
    where: {
      userId: targetUser.id,
      OR: [
        { courseId: cid }, // Remove any existing role for this course
        {
          courseId: null,
          role: { name: { in: ["TA", "TEACHER", "CO_TEACHER"] } }, // Remove global TA/TEACHER/CO_TEACHER roles
        },
      ],
    },
  });

  // Create UserRole
  const userRole = await prisma.userRole.create({
    data: {
      userId: targetUser.id,
      roleId: roleRecord.id,
      courseId: cid,
    },
  });

  return NextResponse.json({ ok: true, userRole });
}

// Remove a TA from the course
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { courseId } = await ctx.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cid = Number(courseId);
  const url = new URL(req.url);
  const userRoleId = url.searchParams.get("userRoleId");

  if (!userRoleId) {
    return NextResponse.json(
      { error: "Missing userRoleId" },
      { status: 400 }
    );
  }

  // Check if user is the course owner
  const course = await prisma.course.findFirst({
    where: { id: cid, ownerId: user.id },
  });

  if (!course) {
    return NextResponse.json(
      { error: "Course not found or access denied" },
      { status: 404 }
    );
  }

  // Delete the UserRole
  await prisma.userRole.delete({
    where: {
      id: Number(userRoleId),
      courseId: cid,
    },
  });

  return NextResponse.json({ ok: true });
}
