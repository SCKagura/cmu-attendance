// lib/logToken.ts
"use server";

import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { verifyCmuOneTimeToken } from "@/lib/cmuMobile";

export async function logTokenFromHeaders() {
  try {
    const headersList = await headers();
    const token = headersList.get("x-cmu-token");

    if (!token) {
      return; // No token to log
    }

    const device = headersList.get("x-cmu-device") || null;
    const url = headersList.get("x-cmu-token-url") || "";
    const ip = headersList.get("x-cmu-token-ip") || "unknown";
    const userAgent = headersList.get("x-cmu-token-ua") || "unknown";
    const referer = headersList.get("x-cmu-token-referer") || null;

    // Log to database
    await prisma.tokenLog.create({
      data: {
        token,
        device,
        url,
        ip,
        userAgent,
        referer: referer || null,
      },
    });

    console.log(`✅ Token logged: ${token.substring(0, 10)}... | Device: ${device || "N/A"}`);

    // Try to verify token and log the result
    /* 
    NOTE: Commented out because verifying consumes the ONE-TIME token!
    This checks causes the actual login to fail.
    
    try {
      const cmuData = await verifyCmuOneTimeToken(token);
      console.log("✅ CMU Token Verification SUCCESS:");
      console.log("   Full Response:", JSON.stringify(cmuData, null, 2));
      console.log("   IT Account:", cmuData.it_account);
      console.log("   Email:", cmuData.email);
      console.log("   Student ID:", cmuData.student_id);
      console.log("   Name (TH):", `${cmuData.firstname_th} ${cmuData.lastname_th}`);
      console.log("   Name (EN):", `${cmuData.firstname_en} ${cmuData.lastname_en}`);
      console.log("   Organization:", cmuData.organization_name_th);
    } catch (verifyError) {
      console.error("❌ CMU Token Verification FAILED:", verifyError instanceof Error ? verifyError.message : String(verifyError));
    } 
    */
  } catch (error) {
    console.error("Failed to log token:", error);
  }
}
