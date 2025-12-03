import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import CreateCourseButton from "./_components/CreateCourseButton";
import DeleteCourseButton from "./_components/DeleteCourseButton";

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

  // Check permissions - Teachers only
  const isTeacher = await prisma.userRole.findFirst({
    where: { userId: user.id, role: { name: "TEACHER" } },
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

  const ownerCourses = await prisma.course.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      courseCode: true,
      courseNameTh: true,
      academicYear: true,
      semester: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

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
          <CreateCourseButton />
        </header>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">Your Courses</h2>
          {ownerCourses.length === 0 ? (
            <div className="text-white/40 bg-white/5 rounded-xl p-8 text-center border border-white/10">
              No courses yet — click "Create Course" to get started
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ownerCourses.map(
                ({ id, courseCode, courseNameTh, academicYear, semester }: any) => (
                  <li
                    key={id}
                    className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-6 hover:bg-white/20 transition-all hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div className="font-bold text-xl text-white mb-1">
                      {courseCode}
                    </div>
                    <div className="text-white/80 mb-4 line-clamp-1">
                      {courseNameTh ?? ""}
                    </div>
                    <div className="mb-6 text-sm text-white/50">
                      Year {academicYear} Semester {semester}
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href={`/teacher/courses/${String(id)}/roster`}
                        className="flex-1 rounded-lg bg-purple-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 text-center transition-colors"
                      >
                        Manage
                      </Link>
                      <DeleteCourseButton id={id} />
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
