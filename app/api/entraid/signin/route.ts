import axios from "axios";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { COOKIE } from "@/lib/auth";

type SuccessResponse = {
  ok: true;
};

type ErrorResponse = {
  ok: false;
  message: string;
};

export type SignInResponse = SuccessResponse | ErrorResponse;

interface CmuEntraIDBasicInfo {
  cmuitaccount_name?: string;
  cmuitaccount?: string;
  student_id?: string;
  prename_id?: string;
  prename_TH?: string;
  prename_EN?: string;
  firstname_TH?: string;
  firstname_EN?: string;
  lastname_TH?: string;
  lastname_EN?: string;
  organization_code?: string;
  organization_name_TH?: string;
  organization_name_EN?: string;
  itaccounttype_id?: string; // "StdAcc" or "EmpAcc"
  itaccounttype_TH?: string;
  itaccounttype_EN?: string;
}

// Get EntraID access token
async function getEntraIDAccessToken(
  authorizationCode: string
): Promise<string | null> {
  try {
    const tokenUrl = process.env.CMU_ENTRAID_GET_TOKEN_URL as string;
    const redirectUrl = process.env.CMU_ENTRAID_REDIRECT_URL as string;
    const clientId = process.env.CMU_ENTRAID_CLIENT_ID as string;
    const clientSecret = process.env.CMU_ENTRAID_CLIENT_SECRET as string;
    const scope = process.env.SCOPE as string;

    const response = await axios.post(
      tokenUrl,
      {
        code: authorizationCode,
        redirect_uri: redirectUrl,
        client_id: clientId,
        client_secret: clientSecret,
        scope: scope,
        grant_type: "authorization_code",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error("❌ Failed to get EntraID access token:", error);
    return null;
  }
}

// Get CMU basic info using access token
async function getCMUBasicInfo(
  accessToken: string
): Promise<CmuEntraIDBasicInfo | null> {
  try {
    const basicInfoUrl = process.env.CMU_ENTRAID_GET_BASIC_INFO as string;
    const response = await axios.get(basicInfoUrl, {
      headers: { Authorization: "Bearer " + accessToken },
    });
    return response.data as CmuEntraIDBasicInfo;
  } catch (err) {
    console.error("❌ Failed to get CMU basic info:", err);
    return null;
  }
}

// Helper: Ensure user has a global role
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

export async function POST(
  req: NextRequest
): Promise<NextResponse<SignInResponse>> {
  try {
    const { authorizationCode } = await req.json();

    if (!authorizationCode || typeof authorizationCode !== "string") {
      return NextResponse.json(
        { ok: false, message: "Invalid authorization code" },
        { status: 400 }
      );
    }

    // Step 1: Exchange authorization code for access token
    const accessToken = await getEntraIDAccessToken(authorizationCode);
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Cannot get EntraID access token" },
        { status: 400 }
      );
    }

    // Step 2: Get user basic info from CMU API
    const cmuBasicInfo = await getCMUBasicInfo(accessToken);
    if (!cmuBasicInfo || !cmuBasicInfo.cmuitaccount) {
      return NextResponse.json(
        { ok: false, message: "Cannot get CMU basic info" },
        { status: 400 }
      );
    }

    console.log("✅ CMU EntraID Login - Basic Info:", {
      cmuitaccount: cmuBasicInfo.cmuitaccount,
      student_id: cmuBasicInfo.student_id,
      itaccounttype_id: cmuBasicInfo.itaccounttype_id,
      name: `${cmuBasicInfo.firstname_TH} ${cmuBasicInfo.lastname_TH}`,
    });

    // Step 3: Create or update user in database
    const cmuAccount = cmuBasicInfo.cmuitaccount; // Already includes @cmu.ac.th
    const email = cmuAccount; // Don't add @cmu.ac.th again!
    const studentCode = cmuBasicInfo.student_id ?? null;
    const itaccounttype_id = cmuBasicInfo.itaccounttype_id ?? null;

    const displayNameTh =
      cmuBasicInfo.firstname_TH && cmuBasicInfo.lastname_TH
        ? `${cmuBasicInfo.firstname_TH} ${cmuBasicInfo.lastname_TH}`
        : undefined;

    const displayNameEn =
      cmuBasicInfo.firstname_EN && cmuBasicInfo.lastname_EN
        ? `${cmuBasicInfo.firstname_EN} ${cmuBasicInfo.lastname_EN}`
        : undefined;

    const orgTh = cmuBasicInfo.organization_name_TH;
    const orgEn = cmuBasicInfo.organization_name_EN;

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { cmuAccount },
    });

    if (!user && studentCode) {
      // Check if placeholder exists by studentCode
      const existingByCode = await prisma.user.findUnique({
        where: { studentCode },
      });

      if (existingByCode) {
        // Claim placeholder
        user = await prisma.user.update({
          where: { id: existingByCode.id },
          data: {
            cmuAccount,
            cmuEmail: email,
            displayNameTh: displayNameTh || existingByCode.displayNameTh,
            displayNameEn: displayNameEn || existingByCode.displayNameEn,
            organizationTh: orgTh,
            organizationEn: orgEn,
            itaccounttype_id,
          },
        });
      }
    }

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          cmuAccount,
          cmuEmail: email,
          studentCode,
          displayNameTh,
          displayNameEn,
          organizationTh: orgTh,
          organizationEn: orgEn,
          itaccounttype_id,
        },
      });
    } else {
      // Update existing user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          displayNameTh: displayNameTh || undefined,
          displayNameEn: displayNameEn || undefined,
          organizationTh: orgTh || undefined,
          organizationEn: orgEn || undefined,
          itaccounttype_id: itaccounttype_id || undefined,
        },
      });
    }

    // Step 4: Auto-assign role based on itaccounttype_id
    // Priority 1: Use itaccounttype_id if available
    if (itaccounttype_id === "StdAcc") {
      await ensureGlobalRole(user.id, "STUDENT");
      console.log("✅ Assigned STUDENT role (via itaccounttype_id)");
    } else if (itaccounttype_id === "EmpAcc") {
      await ensureGlobalRole(user.id, "TEACHER");
      console.log("✅ Assigned TEACHER role (via itaccounttype_id)");
    }
    // Priority 2: Fallback to student_id check
    else if (studentCode) {
      await ensureGlobalRole(user.id, "STUDENT");
      console.log("✅ Assigned STUDENT role (via student_id fallback)");
    } else {
      await ensureGlobalRole(user.id, "TEACHER");
      console.log("✅ Assigned TEACHER role (default fallback)");
    }

    // Step 5: Set session cookie
    const isSecure =
      process.env.NODE_ENV === "production" ||
      req.headers.get("x-forwarded-proto") === "https";

    (await cookies()).set(COOKIE, user.id, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    console.log("✅ CMU EntraID Login successful:", {
      userId: user.id,
      cmuAccount: user.cmuAccount,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ CMU EntraID login error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, message: `Login failed: ${message}` },
      { status: 500 }
    );
  }
}
