// app/api/cmu/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCmuOneTimeToken } from "@/lib/cmuMobile";
import { prisma } from "@/lib/db";
import { COOKIE } from "@/lib/auth";

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

      // dev user: เป็นทั้ง STUDENT + TEACHER
      await ensureGlobalRole(user.id, "STUDENT");
      await ensureGlobalRole(user.id, "TEACHER");

      const res = NextResponse.redirect(new URL(redirectTo, req.url));
      res.cookies.set(COOKIE, user.id, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
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
      organization_name_th?: string;
      organization_name_en?: string;
    }

    const cmu = (await verifyCmuOneTimeToken(token)) as CmuResponse;

    const cmuAccount = cmu.it_account;
    if (!cmuAccount) {
      return NextResponse.json(
        { error: "CMU response missing it_account" },
        { status: 500 }
      );
    }

    const email = cmu.email;
    const studentCode = cmu.student_id ?? null;

    const displayNameTh =
      typeof cmu.name === "string"
        ? cmu.name
        : typeof cmu.firstname_th === "string"
        ? cmu.firstname_th
        : undefined;

    const displayNameEn =
      typeof cmu.firstname_en === "string" ? cmu.firstname_en : undefined;

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

    // user จริง: ให้ role STUDENT global ไว้ก่อน
    await ensureGlobalRole(user.id, "STUDENT");

    const res = NextResponse.redirect(new URL(redirectTo, req.url));
    res.cookies.set(COOKIE, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e: unknown) {
    console.error("CMU login error:", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Login failed", detail },
      { status: 500 }
    );
  }
}
