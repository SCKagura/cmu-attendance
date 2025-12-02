// lib/auth.ts
import * as jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE_NAME = "attendance_session";

interface SessionPayload {
  userId: string;
}

export function signSessionToken(payload: SessionPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not set");
    return jwt.verify(token, secret) as SessionPayload;
  } catch {
    return null;
  }
}

// ใช้ใน Server Component / Route Handler เพื่อดึง user ปัจจุบัน
export async function getCurrentUser() {
  // 👇 ต้อง await เพราะ cookies() ส่ง Promise<ReadonlyRequestCookies>
  const cookieStore = await cookies();

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null; // บรรทัดนี้โอเคแล้ว ไม่ต้องแก้อะไร

  return prisma.user.findUnique({ where: { id: payload.userId } });
}

export const sessionCookieName = SESSION_COOKIE_NAME;
