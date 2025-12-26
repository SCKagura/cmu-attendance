import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
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
}
