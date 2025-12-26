import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

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
    },
  });

  if (!isAdmin) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { cmuAccount, cmuEmail, displayName, studentCode, roleName } = await req.json();

  if (!cmuAccount || !cmuEmail || !displayName) {
    return NextResponse.json(
      { error: "Account, email, and name are required" },
      { status: 400 }
    );
  }

  // Validate student code if provided
  if (studentCode && !/^\d{9}$/.test(studentCode)) {
    return NextResponse.json(
      { error: "Student code must be 9 digits" },
      { status: 400 }
    );
  }

  try {
    // Create user
    const newUser = await prisma.user.create({
      data: {
        cmuAccount,
        cmuEmail,
        displayNameTh: displayName,
        displayNameEn: displayName,
        studentCode: studentCode || null,
        isCmu: true,
      },
    });

    // Assign role if specified
    if (roleName) {
      const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });

      await prisma.userRole.create({
        data: {
          userId: newUser.id,
          roleId: role.id,
          courseId: null,
        },
      });
    }

    return NextResponse.json({ ok: true, user: newUser });
  } catch (err: unknown) {
    // Prisma unique constraint violation
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "User with this account, email, or student code already exists" },
        { status: 400 }
      );
    }
    const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
