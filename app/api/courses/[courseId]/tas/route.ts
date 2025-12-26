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
  try {
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

    console.log("Adding member:", { account, email, role, courseId: cid });

    // If role is TEACHER, we assign TEACHER role
    const targetRoleName = role === "TEACHER" ? "TEACHER" : "TA";

    // Find or create the user
    // NOTE: This might fail if cmuAccount is unique and exists but email is different?
    // Using upsert on cmuAccount which is unique.
    const targetUser = await prisma.user.upsert({
      where: { cmuAccount: account },
      update: {}, 
      create: {
        cmuAccount: account,
        cmuEmail: email,
      },
    });

    console.log("Target user:", targetUser.id);

    // Get Role (Upsert to ensure it exists)
    const roleRecord = await prisma.role.upsert({
      where: { name: targetRoleName },
      update: {},
      create: { name: targetRoleName },
    });

    console.log("Role record:", roleRecord);

    // Remove existing roles for this user in this course AND global TA/CO_TEACHER roles
    // We simplify this logic to avoid complex OR queries which might be buggy in some Prisma/SQLite versions
    
    // 1. Delete course-specific role if exists
    await prisma.userRole.deleteMany({
      where: {
        userId: targetUser.id,
        courseId: cid,
      },
    });

    // 2. We do NOT delete global roles automatically anymore as it might be confusing
    // Users can be global TAs and also TAs for a specific course (though redundant, it's safer)
    // Or if we strictly want to prevent duplicates, we can just check.
    // But logically, if I assign someone as TA for course A, I don't want to remove their global TA status if they have one.
    // So I will removed the second condition about global roles to be safe and simplify.

    // Create UserRole
    const userRole = await prisma.userRole.create({
      data: {
        userId: targetUser.id,
        roleId: roleRecord.id,
        courseId: cid,
      },
    });

    console.log("UserRole created:", userRole);

    return NextResponse.json({ ok: true, userRole });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
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
