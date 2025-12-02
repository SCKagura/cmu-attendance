import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const isAdmin = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      role: { name: "ADMIN" },
      courseId: null, // Global admin role
    },
  });

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all users with their roles
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: {
          role: true,
          course: {
            select: {
              id: true,
              courseCode: true,
              courseNameTh: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const isAdmin = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      role: { name: "ADMIN" },
      courseId: null,
    },
  });

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, roleName } = await req.json();

  if (!userId || !roleName) {
    return NextResponse.json(
      { error: "Missing userId or roleName" },
      { status: 400 }
    );
  }

  // Get role
  const role = await prisma.role.findUnique({
    where: { name: roleName },
  });

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  // Create or update UserRole (global role, no courseId)
  const existingRole = await prisma.userRole.findFirst({
    where: {
      userId,
      roleId: role.id,
      courseId: null,
    },
  });

  let userRole;
  if (existingRole) {
    userRole = existingRole; // Already exists, nothing to update for now
  } else {
    userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
        courseId: null,
      },
    });
  }

  return NextResponse.json({ ok: true, userRole });
}
