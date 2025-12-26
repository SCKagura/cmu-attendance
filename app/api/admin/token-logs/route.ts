// app/api/admin/token-logs/route.ts
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

    // Get pagination parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Fetch token logs
    const [logs, total] = await Promise.all([
      prisma.tokenLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.tokenLog.count(),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'error' in error) {
      const permError = error as PermissionError;
      return NextResponse.json(permError, { status: 403 });
    }
    console.error("Error fetching token logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch token logs" },
      { status: 500 }
    );
  }
}
