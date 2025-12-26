import { cookies } from "next/headers";
import { prisma } from "./db";

export const COOKIE = "cmu_attendance_session_v2";

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

/**
 * Get all role names for a user
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  
  return userRoles.map(ur => ur.role.name);
}

/**
 * Check if user has a specific role (global or course-specific)
 */
export async function hasRole(userId: string, roleName: string, courseId?: number): Promise<boolean> {
  const role = await prisma.role.findUnique({
    where: { name: roleName },
  });

  if (!role) return false;

  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      roleId: role.id,
      ...(courseId !== undefined ? { courseId } : {}),
    },
  });

  return !!userRole;
}

/**
 * Get unique global role names for current user
 */
export async function getCurrentUserGlobalRoles(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const globalRoles = await prisma.userRole.findMany({
    where: {
      userId: user.id,
      courseId: null, // Only global roles
    },
    include: { role: true },
  });

  // Get unique role names
  const uniqueRoles = new Set(globalRoles.map(ur => ur.role.name));
  return Array.from(uniqueRoles);
}
