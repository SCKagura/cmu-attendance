// app/student/page.tsx
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic"; // ให้รันบน server ทุกครั้ง

export default async function StudentPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 max-w-md w-full">
          <h1 className="text-3xl font-bold text-white mb-4">Student Portal</h1>
          <p className="text-white/80 mb-6">ยังไม่ได้ล็อกอินผ่าน CMU Mobile</p>
          <a
            href="/api/auth/dev-login?account=student1&email=student1@cmu.ac.th&redirect=/student"
            className="block w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-lg text-center transition-all shadow-lg"
          >
            Dev Login (Student)
          </a>
        </div>
      </div>
    );
  }

  // ดึง course ที่ลงทะเบียนไว้
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: user.id },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Student Dashboard
          </h1>
          <div className="text-white/80">
            <p className="font-semibold text-lg">
              สวัสดี, {user.displayNameTh || user.cmuAccount}
            </p>
            <p className="text-sm">
              Email: {user.cmuEmail} | Student Code: {user.studentCode ?? "-"}
            </p>
            {(user.organizationTh || user.organizationEn) && (
              <p className="text-sm">
                {user.organizationTh} / {user.organizationEn}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-4">
            รายวิชาที่ลงทะเบียน
          </h2>
          {enrollments.length === 0 ? (
            <p className="text-white/70">
              ยังไม่มีข้อมูลรายวิชา — อาจารย์จะเพิ่มรายชื่อของคุณผ่านระบบ
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((e) => (
                <div
                  key={e.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/20 transition-all"
                >
                  <div className="mb-3">
                    <div className="font-semibold text-white text-lg">
                      {e.course.courseCode}
                    </div>
                    <div className="text-white/80 text-sm">
                      {e.course.courseNameTh ?? e.course.courseNameEn}
                    </div>
                    <div className="text-white/60 text-xs mt-1">
                      ปี {e.course.academicYear} เทอม {e.course.semester}
                    </div>
                    <div className="text-white/60 text-xs">
                      รหัส นศ.: {e.studentCode}
                    </div>
                  </div>
                  <Link
                    href={`/student/generate?courseId=${e.courseId}&courseName=${encodeURIComponent(
                      e.course.courseCode
                    )}`}
                    className="block w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-2 px-4 rounded-lg text-center transition-all shadow-lg text-sm"
                  >
                    Generate QR Code
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
