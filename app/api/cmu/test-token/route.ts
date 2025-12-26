// app/api/cmu/test-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCmuOneTimeToken } from "@/lib/cmuMobile";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Verify token with CMU Mobile API
    const cmuData = await verifyCmuOneTimeToken(token);

    // Try to find user in database
    let userInfo = null;
    let userRoles: string[] = [];

    if (cmuData.it_account) {
      const user = await prisma.user.findUnique({
        where: { cmuAccount: cmuData.it_account },
        include: {
          roles: {
            include: {
              role: true,
              course: true,
            },
          },
        },
      });

      if (user) {
        userInfo = {
          id: user.id,
          cmuAccount: user.cmuAccount,
          cmuEmail: user.cmuEmail,
          studentCode: user.studentCode,
          displayNameTh: user.displayNameTh,
          displayNameEn: user.displayNameEn,
          organizationTh: user.organizationTh,
          organizationEn: user.organizationEn,
        };

        // Get unique global roles (where courseId is null)
        const globalRoles = user.roles
          .filter((ur: { courseId: number | null }) => ur.courseId === null)
          .map((ur: { role: { name: string } }) => ur.role.name);
        
        userRoles = [...new Set(globalRoles)] as string[];
      }
    }

    return NextResponse.json({
      success: true,
      cmuData,
      userInfo,
      userRoles,
      message: userInfo
        ? "User found in database"
        : "User not found in database (would be created on login)",
    });
  } catch (error) {
    console.error("CMU token test error:", error);
    return NextResponse.json(
      {
        error: "Token verification failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
