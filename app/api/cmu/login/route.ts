import { NextRequest, NextResponse } from "next/server";
import { verifyCmuOneTimeToken } from "@/lib/cmuMobile";
import { prisma } from "@/lib/db";
import { COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

// helper: ให้ user มี role แบบ global (courseId = null)
async function ensureGlobalRole(userId: string, roleName: string) {
  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName },
  });

  const existing = await prisma.userRole.findFirst({
    where: {
      userId,
      roleId: role.id,
      courseId: null,
    },
  });

  if (!existing) {
    await prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
        courseId: null,
      },
    });
  }

  return role;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const redirectTo = searchParams.get("redirect") || "/student";

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    // ---------- DEV SHORTCUT ----------
    // ใช้ใน dev: token = dev-student
    if (process.env.NODE_ENV !== "production" && token === "dev-student") {
      const cmuAccount = "dev_student";
      const email = "dev_student@example.com";

      const user = await prisma.user.upsert({
        where: { cmuAccount },
        update: {
          cmuEmail: email,
          displayNameTh: "นศ.ทดสอบระบบ",
        },
        create: {
          cmuAccount,
          cmuEmail: email,
          displayNameTh: "นศ.ทดสอบระบบ",
        },
      });

      // dev user: เป็นทั้ง STUDENT + TEACHER + ADMIN
      await ensureGlobalRole(user.id, "STUDENT");
      await ensureGlobalRole(user.id, "TEACHER");
      await ensureGlobalRole(user.id, "ADMIN");

      const isSecure = process.env.NODE_ENV === "production" || req.headers.get("x-forwarded-proto") === "https";

      (await cookies()).set(COOKIE, user.id, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
      const proto = req.headers.get("x-forwarded-proto") || "http";
      const absoluteRedirectUrl = `${proto}://${host}${redirectTo}`;

      return NextResponse.redirect(absoluteRedirectUrl);
    }
    // ---------- END DEV SHORTCUT ----------

    // โหมดจริง: เรียก CMU API
    interface CmuResponse {
      it_account?: string;
      email?: string;
      student_id?: string;
      name?: string;
      firstname_th?: string;
      firstname_en?: string;
      lastname_th?: string;
      lastname_en?: string;
      organization_name_th?: string;
      organization_name_en?: string;
    }

    const cmu = (await verifyCmuOneTimeToken(token)) as CmuResponse;

    if (!cmu) {
        console.error("❌ CMU Token Verification FAILED: API returned null (Token expired or used?)");
        return NextResponse.json(
            { error: "Token verification failed (expired or invalid)" },
            { status: 400 }
        );
    }

    const cmuAccount = cmu.it_account;
    if (!cmuAccount) {
        console.error("❌ CMU Token Verification FAILED: No IT Account in response", cmu);
      return NextResponse.json(
        { error: "CMU response missing it_account" },
        { status: 500 }
      );
    }

    const email = cmu.email;
    const studentCode = cmu.student_id ?? null;

    // Build full name from firstname + lastname
    const displayNameTh = cmu.firstname_th && cmu.lastname_th
      ? `${cmu.firstname_th} ${cmu.lastname_th}`
      : cmu.name || cmu.firstname_th || undefined;

    const displayNameEn = cmu.firstname_en && cmu.lastname_en
      ? `${cmu.firstname_en} ${cmu.lastname_en}`
      : cmu.firstname_en || undefined;

    const orgTh =
      typeof cmu.organization_name_th === "string"
        ? cmu.organization_name_th
        : undefined;
    const orgEn =
      typeof cmu.organization_name_en === "string"
        ? cmu.organization_name_en
        : undefined;

    // 1. Try to find by cmuAccount (Real account already exists)
    let user = await prisma.user.findUnique({
      where: { cmuAccount },
    });

    if (!user && studentCode) {
      // 2. If not found by cmuAccount, try to find by studentCode (Placeholder exists?)
      const existingByCode = await prisma.user.findUnique({
        where: { studentCode },
      });

      if (existingByCode) {
        // FOUND PLACEHOLDER! -> Claim it (Update to real cmuAccount)
        user = await prisma.user.update({
          where: { id: existingByCode.id },
          data: {
            cmuAccount, // Set real account
            cmuEmail: email ?? "",
            displayNameTh: displayNameTh || existingByCode.displayNameTh,
            displayNameEn: displayNameEn || existingByCode.displayNameEn,
            organizationTh: orgTh,
            organizationEn: orgEn,
          },
        });
      }
    }

    if (!user) {
      // 3. Still not found -> Create new real account
      user = await prisma.user.create({
        data: {
          cmuAccount,
          cmuEmail: email ?? "",
          studentCode,
          displayNameTh,
          displayNameEn,
          organizationTh: orgTh,
          organizationEn: orgEn,
        },
      });
    } else {
        // Ensure data is up to date if we found it by cmuAccount
        if (user.cmuAccount === cmuAccount) {
             await prisma.user.update({
                where: { id: user.id },
                data: {
                    displayNameTh: displayNameTh || undefined,
                    displayNameEn: displayNameEn || undefined,
                    organizationTh: orgTh || undefined,
                    organizationEn: orgEn || undefined,
                }
             });
        }
    }

    // Auto-assign role based on student_id
    // If has student_id = STUDENT, else = TEACHER
    // Auto-assign role based on student_id
    // If has student_id = STUDENT, else = TEACHER
    if (studentCode) {
      // มีรหัสนักศึกษา = เป็น Student
      await ensureGlobalRole(user.id, "STUDENT");
    } else {
      // ไม่มีรหัสนักศึกษา = เป็น Teacher
      await ensureGlobalRole(user.id, "TEACHER");
    }

    // Create response object first
    // Construct absolute URL using headers to ensure it works behind ngrok/proxy
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const absoluteRedirectUrl = `${proto}://${host}${redirectTo}`;
    
    // Use the absolute URL for redirect
    const response = NextResponse.redirect(absoluteRedirectUrl);

    // 1. Force delete with all possible variations that might exist
    response.cookies.delete(COOKIE);
    response.cookies.set(COOKIE, "", { maxAge: 0, path: "/" }); 

    console.log("✅ Setting CMU Login Cookie (Direct Response):", {
        id: user.id,
        cmuAccount: user.cmuAccount,
        studentCode: user.studentCode
    });

    // Check if running on SSL (including behind proxy like ngrok)
    const isSecure = process.env.NODE_ENV === "production" || req.headers.get("x-forwarded-proto") === "https";

    // 2. Set new cookie
    response.cookies.set(COOKIE, user.id, {
        httpOnly: true,
        secure: isSecure, 
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (e: unknown) {
    console.error("CMU login error:", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Login failed", detail },
      { status: 500 }
    );
  }
}
