import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <h1 className="text-4xl font-bold mb-4">CMU Attendance</h1>
        <p className="mb-8 text-white/70">Please login to continue</p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <a
            href="/api/auth/dev-login?account=student1&role=STUDENT&redirect=/"
            className="bg-blue-600 hover:bg-blue-500 text-white py-3 px-6 rounded-lg text-center font-semibold transition-colors"
          >
            Dev Login (Student)
          </a>
          <a
            href="/api/auth/dev-login?account=teacher1&role=TEACHER&redirect=/"
            className="bg-purple-600 hover:bg-purple-500 text-white py-3 px-6 rounded-lg text-center font-semibold transition-colors"
          >
            Dev Login (Teacher)
          </a>
          <a
            href="/api/auth/dev-login?account=ta1&role=TA&redirect=/"
            className="bg-pink-600 hover:bg-pink-500 text-white py-3 px-6 rounded-lg text-center font-semibold transition-colors"
          >
            Dev Login (TA)
          </a>
        </div>
      </div>
    );
  }

  // Check roles
  const isTeacher = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      role: { name: { in: ["TEACHER", "CO_TEACHER"] } },
    },
  });
  const isTA = await prisma.userRole.findFirst({
    where: { userId: user.id, role: { name: "TA" } },
  });
  // Everyone can access student view
  const isStudent = true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-white/60 mt-1">
              Welcome, {user.displayNameTh || user.displayNameEn || user.cmuAccount}
            </p>
          </div>
          <a
            href="/api/auth/dev-logout"
            className="text-sm text-red-300 hover:text-red-200 underline"
          >
            Logout
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Student Card - Only show if NOT Teacher */}
          {!isTeacher && (
            <Link
              href="/student"
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 p-8 transition-transform hover:scale-[1.02] hover:shadow-2xl"
            >
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-2">Student Portal</h2>
                <p className="text-blue-100 mb-6">
                  Check-in to your classes and view your attendance history.
                </p>
                <span className="inline-block bg-white/20 backdrop-blur px-4 py-2 rounded-lg text-white font-semibold group-hover:bg-white/30 transition-colors">
                  Go to Check-in →
                </span>
              </div>
              <div className="absolute -right-4 -bottom-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            </Link>
          )}

          {/* Teacher Card */}
          {isTeacher && (
            <Link
              href="/teacher"
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-8 transition-transform hover:scale-[1.02] hover:shadow-2xl"
            >
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Teacher Portal
                </h2>
                <p className="text-purple-100 mb-6">
                  Manage your courses, sessions, and attendance.
                </p>
                <span className="inline-block bg-white/20 backdrop-blur px-4 py-2 rounded-lg text-white font-semibold group-hover:bg-white/30 transition-colors">
                  Go to Dashboard →
                </span>
              </div>
              <div className="absolute -right-4 -bottom-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            </Link>
          )}



          {/* TA Card */}
          {isTA && (
            <Link
              href="/ta"
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-8 transition-transform hover:scale-[1.02] hover:shadow-2xl"
            >
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-2">
                  TA Portal
                </h2>
                <p className="text-emerald-100 mb-6">
                  View course details and attendance records.
                </p>
                <span className="inline-block bg-white/20 backdrop-blur px-4 py-2 rounded-lg text-white font-semibold group-hover:bg-white/30 transition-colors">
                  Go to TA Dashboard →
                </span>
              </div>
              <div className="absolute -right-4 -bottom-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            </Link>
          )}
        </div>

        {/* Test Login Section */}
        <div className="mt-12 p-6 bg-white/5 rounded-xl border border-white/10">
          <h3 className="text-xl font-semibold text-white mb-4">
            Test Login (Dev Only)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <a
              href="/api/auth/dev-login?account=student1&role=STUDENT&redirect=/&clear=true"
              className="px-4 py-2 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 text-center text-sm font-medium transition-colors"
            >
              Student
            </a>
            <a
              href="/api/auth/dev-login?account=teacher1&role=TEACHER&redirect=/&clear=true"
              className="px-4 py-2 rounded bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 text-center text-sm font-medium transition-colors"
            >
              Teacher
            </a>
            <a
              href="/api/auth/dev-login?account=ta1&role=TA&redirect=/&clear=true"
              className="px-4 py-2 rounded bg-pink-600/20 text-pink-300 hover:bg-pink-600/30 text-center text-sm font-medium transition-colors"
            >
              TA
            </a>
            <a
              href="/api/auth/dev-login?account=coteacher1&role=CO_TEACHER&redirect=/&clear=true"
              className="px-4 py-2 rounded bg-fuchsia-600/20 text-fuchsia-300 hover:bg-fuchsia-600/30 text-center text-sm font-medium transition-colors"
            >
              Co-Teacher
            </a>
            <a
              href="/api/auth/dev-login?account=admin&role=ADMIN&redirect=/admin&clear=true"
              className="px-4 py-2 rounded bg-red-600/20 text-red-300 hover:bg-red-600/30 text-center text-sm font-medium transition-colors"
            >
              Admin
            </a>
          </div>
          <p className="text-white/40 text-xs mt-4">
            Clicking these links will log you in as a test user with the specified role.
          </p>
        </div>
      </div>
    </div>
  );
}
