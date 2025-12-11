import { cookies } from "next/headers";
import { prisma } from "./db";

export const COOKIE = "cmu_user_id";

export async function getCurrentUser() {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  
  if (!id) {
    console.log("❌ [Auth] No session cookie found");
    return null;
  }

  console.log("🔍 [Auth] Reading cookie:", COOKIE, "=", id);

  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });

  if (user) {
    console.log("✅ [Auth] Found user:", { id: user.id, cmuAccount: user.cmuAccount });
  } else {
    console.log("⚠️ [Auth] User not found for ID:", id);
  }

  return user;
}
