import { prisma } from "./db";

/**
 * Permission Helper Functions
 * Centralized logic for checking user permissions
 */

export type PermissionError = {
  error: string;
  message: string;
  requiredRole?: string;
  requiredPermission?: string;
};

/**
 * Check if user has global ADMIN role
 */
export async function isAdmin(userId: string): Promise<boolean> {
  console.log("🔐 [Permission] Checking ADMIN access for user:", userId);
  
  const adminRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: { name: "ADMIN" },
      courseId: null, // Must be global admin
    },
  });

  const hasAccess = !!adminRole;
  console.log("🔐 [Permission] ADMIN check result:", hasAccess);
  
  return hasAccess;
}

/**
 * Require user to be global ADMIN, throw error if not
 */
export async function requireAdmin(userId: string): Promise<void> {
  const hasAccess = await isAdmin(userId);
  
  if (!hasAccess) {
    console.log("❌ [Permission] Access denied - user is not ADMIN");
    throw {
      error: "Access denied",
      message: "You need ADMIN role to perform this action. Please contact an administrator.",
      requiredRole: "ADMIN",
    };
  }
}

/**
 * Check if user owns a specific course
 */
export async function isCourseOwner(
  userId: string,
  courseId: number
): Promise<boolean> {
  console.log("🔐 [Permission] Checking course ownership:", { userId, courseId });
  
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ownerId: userId,
    },
  });

  const isOwner = !!course;
  console.log("🔐 [Permission] Course owner check result:", isOwner);
  
  return isOwner;
}

/**
 * Require user to own a course, throw error if not
 */
export async function requireCourseOwner(
  userId: string,
  courseId: number
): Promise<void> {
  const isOwner = await isCourseOwner(userId, courseId);
  
  if (!isOwner) {
    console.log("❌ [Permission] Access denied - user is not course owner");
    throw {
      error: "Access denied",
      message: "You must be the course owner to perform this action.",
      requiredPermission: "course_owner",
    };
  }
}

/**
 * Check if user has specific role for a course (TA, TEACHER, etc.)
 */
export async function hasCourseRole(
  userId: string,
  courseId: number,
  roleNames: string[]
): Promise<boolean> {
  console.log("🔐 [Permission] Checking course role:", { userId, courseId, roleNames });
  
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      courseId,
      role: {
        name: { in: roleNames },
      },
    },
  });

  const hasRole = !!userRole;
  console.log("🔐 [Permission] Course role check result:", hasRole);
  
  return hasRole;
}

/**
 * Check if user has access to a course (owner, TA, or teacher)
 */
export async function hasCourseAccess(
  userId: string,
  courseId: number
): Promise<boolean> {
  console.log("🔐 [Permission] Checking course access:", { userId, courseId });
  
  // Check if owner
  const isOwner = await isCourseOwner(userId, courseId);
  if (isOwner) {
    console.log("🔐 [Permission] Access granted - user is course owner");
    return true;
  }

  // Check if TA or Teacher
  const hasRole = await hasCourseRole(userId, courseId, ["TA", "TEACHER", "CO_TEACHER"]);
  if (hasRole) {
    console.log("🔐 [Permission] Access granted - user has course role");
    return true;
  }

  console.log("❌ [Permission] Access denied - no course access");
  return false;
}

/**
 * Require user to have access to a course, throw error if not
 */
export async function requireCourseAccess(
  userId: string,
  courseId: number
): Promise<void> {
  const hasAccess = await hasCourseAccess(userId, courseId);
  
  if (!hasAccess) {
    throw {
      error: "Access denied",
      message: "You don't have permission to access this course.",
      requiredPermission: "course_access",
    };
  }
}

/**
 * Check if user has a specific global role
 */
export async function hasGlobalRole(
  userId: string,
  roleName: string
): Promise<boolean> {
  console.log("🔐 [Permission] Checking global role:", { userId, roleName });
  
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: { name: roleName },
      courseId: null, // Must be global role
    },
  });

  const hasRole = !!userRole;
  console.log("🔐 [Permission] Global role check result:", hasRole);
  
  return hasRole;
}

/**
 * Require user to have a specific global role, throw error if not
 */
export async function requireGlobalRole(
  userId: string,
  roleName: string
): Promise<void> {
  const hasRole = await hasGlobalRole(userId, roleName);
  
  if (!hasRole) {
    console.log("❌ [Permission] Access denied - missing global role:", roleName);
    throw {
      error: "Access denied",
      message: `You need ${roleName} role to perform this action.`,
      requiredRole: roleName,
    };
  }
}

/**
 * Check if user is a student
 */
export async function isStudent(userId: string): Promise<boolean> {
  return hasGlobalRole(userId, "STUDENT");
}

/**
 * Check if user is a teacher (global or for any course)
 */
export async function isTeacher(userId: string): Promise<boolean> {
  console.log("🔐 [Permission] Checking if user is teacher:", userId);
  
  const teacherRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        name: { in: ["TEACHER", "CO_TEACHER"] },
      },
    },
  });

  const isTeacher = !!teacherRole;
  console.log("🔐 [Permission] Teacher check result:", isTeacher);
  
  return isTeacher;
}
