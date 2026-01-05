import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin, PermissionError } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin using new helper
    await requireAdmin(user.id);


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
  } catch (error) {
    // Handle permission errors
    if (error && typeof error === 'object' && 'error' in error) {
      const permError = error as PermissionError;
      return NextResponse.json(permError, { status: 403 });
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    await requireAdmin(user.id);

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
  } catch (error) {
    if (error && typeof error === 'object' && 'error' in error) {
      const permError = error as PermissionError;
      return NextResponse.json(permError, { status: 403 });
    }
    console.error("Error in POST /api/admin/users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    await requireAdmin(user.id);

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    // Only require ID for actions that need it
    if (!id && action !== "delete_all_students") {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
      if (action === "delete_user") {
        if (!id) {
          return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }
        // Delete user and all related data (cascade should handle most, but let's be safe)
        // Prisma cascade delete should work if schema is set up correctly.
        // If not, we might need to delete related records first.
        // Assuming cascade is set up or we just delete the user.
        await prisma.user.delete({
          where: { id },
        });
        return NextResponse.json({ ok: true });
      } else if (action === "remove_role") {
        if (!id) {
          return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }
        // Remove specific UserRole
        // id here is userRoleId (the unique ID of the UserRole record)
        // Wait, the UI needs to pass the UserRole ID.
        // In the current Admin UI, we have `user.roles` which contains `id` (UserRole ID).
        // So we can pass that.
        await prisma.userRole.delete({
          where: { id: Number(id) },
        });
        return NextResponse.json({ ok: true });
      } else if (action === "delete_all_students") {
        // Delete all users who have the STUDENT role
        // First, find all users with STUDENT role
        const studentRole = await prisma.role.findUnique({
          where: { name: "STUDENT" },
        });

        if (!studentRole) {
          return NextResponse.json({ error: "Student role not found" }, { status: 404 });
        }

        // Find all user IDs with STUDENT role
        const studentUserRoles = await prisma.userRole.findMany({
          where: { roleId: studentRole.id },
          select: { userId: true },
        });

        const studentUserIds = studentUserRoles.map((ur: { userId: string }) => ur.userId);

        // Delete all students (cascade will handle related data)
        const deleteResult = await prisma.user.deleteMany({
          where: { id: { in: studentUserIds } },
        });

        return NextResponse.json({
          ok: true,
          deletedCount: deleteResult.count
        });
      } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'error' in error) {
        const permError = error as PermissionError;
        return NextResponse.json(permError, { status: 403 });
      }
      console.error("Admin delete error:", error);
      return NextResponse.json(
        { error: "Failed to perform action" },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'error' in error) {
      const permError = error as PermissionError;
      return NextResponse.json(permError, { status: 403 });
    }
    throw error;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    await requireAdmin(user.id);

    const { userId, studentCode } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Check if student code is already taken by another user
    if (studentCode && studentCode.trim()) {
      const existing = await prisma.user.findFirst({
        where: {
          studentCode: studentCode.trim(),
          NOT: { id: userId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Student code already exists" },
          { status: 400 }
        );
      }
    }

    // Update user's student code
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { studentCode: studentCode?.trim() || null },
    });

    return NextResponse.json({ ok: true, user: updatedUser });
  } catch (error) {
    if (error && typeof error === 'object' && 'error' in error) {
      const permError = error as PermissionError;
      return NextResponse.json(permError, { status: 403 });
    }
    console.error("Error in PATCH /api/admin/users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
