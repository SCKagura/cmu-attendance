// app/student/page.tsx
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import StudentPageClient from "./StudentPageClient";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <StudentPageClient user={null} enrollments={[]} />;
  }

  // ดึง course ที่ลงทะเบียนไว้
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: user.id },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  return <StudentPageClient user={user} enrollments={enrollments} />;
}
