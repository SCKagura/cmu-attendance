// app/api/internal/log-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, url, ip, userAgent, referer } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Store token log in database
    await prisma.tokenLog.create({
      data: {
        token,
        url,
        ip,
        userAgent,
        referer,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging token:", error);
    return NextResponse.json(
      { error: "Failed to log token" },
      { status: 500 }
    );
  }
}
