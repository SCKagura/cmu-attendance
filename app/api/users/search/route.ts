import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const studentCode = searchParams.get("studentCode");

  if (!studentCode) {
    return NextResponse.json(
      { error: "Student code is required" },
      { status: 400 }
    );
  }

  // Search for user by student code
  const foundUser = await prisma.user.findUnique({
    where: { studentCode },
    select: {
      id: true,
      studentCode: true,
      cmuAccount: true,
      cmuEmail: true,
      displayNameTh: true,
      displayNameEn: true,
    },
  });

  if (!foundUser) {
    return NextResponse.json(
      { error: "Student not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ user: foundUser });
}
