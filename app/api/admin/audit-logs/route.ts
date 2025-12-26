import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin, PermissionError } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    await requireAdmin(user.id);

    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit")) || 100;
    const offset = Number(url.searchParams.get("offset")) || 0;

    // Get audit logs
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            cmuAccount: true,
            displayNameTh: true,
            displayNameEn: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.auditLog.count();

    return NextResponse.json({ logs, total });
  } catch (error) {
    if (error && typeof error === 'object' && 'error' in error) {
      const permError = error as PermissionError;
      return NextResponse.json(permError, { status: 403 });
    }
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
