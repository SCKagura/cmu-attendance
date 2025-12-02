import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { COOKIE } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const account = url.searchParams.get("account") ?? "devuser";
    const email = url.searchParams.get("email") ?? `${account}@example.com`;
    const roleName = url.searchParams.get("role"); // e.g. "TEACHER", "ADMIN"
    const redirect = url.searchParams.get("redirect") ?? "/";
    const shouldClear = url.searchParams.get("clear") === "true";

    const user = await prisma.user.upsert({
      where: { cmuAccount: account },
      update: { cmuEmail: email },
      create: { cmuAccount: account, cmuEmail: email },
      select: { id: true },
    });

    // If clear is requested, remove all global roles
    if (shouldClear) {
      await prisma.userRole.deleteMany({
        where: {
          userId: user.id,
          courseId: null,
        },
      });
    }

    // If role is specified, assign it
    if (roleName) {
      const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });

      // Check if user already has this role
      const existing = await prisma.userRole.findFirst({
        where: { userId: user.id, roleId: role.id },
      });

      if (!existing) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });
      }
    }

    (await cookies()).set(COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return NextResponse.redirect(new URL(redirect, req.url));
  } catch (error) {
    console.error("Dev login error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
