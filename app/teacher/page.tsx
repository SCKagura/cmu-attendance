import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import CreateCourseButton from "./_components/CreateCourseButton";
import TeacherDashboardClient from "./TeacherDashboardClient";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center p-6 text-white">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <p className="mt-2 text-white/60">
          Please login via CMU Mobile
        </p>
        <a
          className="mt-4 underline text-sm text-blue-300 hover:text-blue-200"
          href={`/api/auth/dev-login?account=dev&email=dev%40example.com&role=TEACHER&redirect=%2Fteacher`}
        >
          Dev-login
        </a>
      </div>
    );
  }

  // Check permissions - Teachers and Co-Teachers
  const isTeacher = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      role: { name: { in: ["TEACHER", "CO_TEACHER", "ADMIN"] } },
    },
  });

  if (!isTeacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-white/80 mb-2">
            You do not have permission to view the Teacher Dashboard.
          </p>
          <p className="text-white/60 text-sm mb-6">
            This portal is for Teachers only.
          </p>
          <Link href="/" className="inline-block px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        {
          userRoles: {
            some: {
              userId: user.id,
              role: { name: { in: ["TEACHER", "CO_TEACHER"] } },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      courseCode: true,
      courseNameTh: true,
      academicYear: true,
      semester: true,
      createdAt: true,
      ownerId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const ownedCourses = courses.filter((c) => c.ownerId === user.id);
  const coTaughtCourses = courses.filter((c) => c.ownerId !== user.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Teacher Dashboard</h1>
            <p className="mt-1 text-white/60">
              Welcome, {user.displayNameTh || user.displayNameEn || user.cmuAccount}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CreateCourseButton />
            <LogoutButton />
          </div>
        </header>

        <TeacherDashboardClient
          ownedCourses={ownedCourses}
          coTaughtCourses={coTaughtCourses}
        />
      </div>
    </div>
  );
}
