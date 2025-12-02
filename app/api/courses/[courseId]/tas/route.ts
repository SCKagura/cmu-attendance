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
      role: { name: "TA" },
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
  const { cmuAccount } = await req.json();

  if (!cmuAccount) {
    return NextResponse.json(
      { error: "Missing cmuAccount" },
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

  // Find or create the TA user
  const taUser = await prisma.user.findUnique({
    where: { cmuAccount },
  });

  if (!taUser) {
    return NextResponse.json(
      { error: "User not found. They need to login at least once." },
      { status: 404 }
    );
  }

  // Get TA role
  const taRole = await prisma.role.findUnique({
    where: { name: "TA" },
  });

  if (!taRole) {
    return NextResponse.json({ error: "TA role not found" }, { status: 500 });
  }

  // Create UserRole
  const userRole = await prisma.userRole.upsert({
    where: {
      userId_roleId_courseId: {
        userId: taUser.id,
        roleId: taRole.id,
        courseId: cid,
      },
    },
    update: {},
    create: {
      userId: taUser.id,
      roleId: taRole.id,
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
