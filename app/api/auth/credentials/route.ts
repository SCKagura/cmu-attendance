import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { COOKIE } from "@/lib/auth"; // Ensure this import path is correct and COOKIE is exported

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // 1. Verify Hardcoded Credentials
    if (email !== "test@user.com" || password !== "1234") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 2. Upsert Test User
    const user = await prisma.user.upsert({
      where: { cmuEmail: "test@user.com" },
      update: {},
      create: {
        cmuAccount: "testuser",
        cmuEmail: "test@user.com",
        studentCode: "650000000",
        displayNameTh: "Test User",
        displayNameEn: "Test User",
        organizationTh: "Testing Dept",
        organizationEn: "Testing Dept",
        itaccounttype_id: "EmpAcc" // Default to Employee/Teacher for testing power
      },
    });

    // 3. Assign Roles (Ensure Teacher + Admin for full access testing)
    const rolesToAssign = ["STUDENT", "TEACHER", "ADMIN"];
    
    for (const roleName of rolesToAssign) {
        // Find or create role definition
        const role = await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: { name: roleName }
        });

        // Check if user already has this global role
        const existingUserRole = await prisma.userRole.findFirst({
            where: {
                userId: user.id,
                roleId: role.id,
                courseId: null
            }
        });

        if (!existingUserRole) {
            await prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: role.id,
                    courseId: null
                }
            });
        }
    }

    // 4. Set Session Cookie
    const response = NextResponse.json({ ok: true });
    
    // Check if SSL
    const isSecure = process.env.NODE_ENV === "production" || req.headers.get("x-forwarded-proto") === "https";

    response.cookies.set(COOKIE, user.id, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
