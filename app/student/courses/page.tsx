// app/student/courses/page.tsx
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import StudentCoursesClient from "./StudentCoursesClient";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <StudentCoursesClient user={null} enrollments={[]} />;
  }

  // ดึง course ที่ลงทะเบียนไว้ (เฉพาะที่ active)
  const enrollments = await prisma.enrollment.findMany({
    where: { 
      studentId: user.id,
      isActive: true // Only show active enrollments from latest import
    },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  return <StudentCoursesClient user={user} enrollments={enrollments} />;
}
