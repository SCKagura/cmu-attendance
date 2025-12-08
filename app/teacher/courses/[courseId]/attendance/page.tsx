import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ClassSession } from "@prisma/client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function AttendancePage({ params }: Props) {
  const { courseId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="p-6">
        <p>Please login first</p>
      </div>
    );
  }

  const cid = Number(courseId);

  // Check access
  const course = await prisma.course.findFirst({
    where: {
      id: cid,
      OR: [
        { ownerId: user.id },
        {
          userRoles: {
            some: {
              userId: user.id,
              role: { name: { in: ["TA", "TEACHER"] } },
            },
          },
        },
      ],
    },
    include: {
      classSessions: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!course) {
    return (
      <div className="p-6">
        <p>Course not found or access denied</p>
      </div>
    );
  }

  // Get all attendance records
  const attendances = await prisma.attendance.findMany({
    where: {
      classSession: {
        courseId: cid,
      },
    },
    include: {
      student: {
        select: {
          cmuAccount: true,
          displayNameTh: true,
          displayNameEn: true,
          studentCode: true,
        },
      },
      scanner: {
        select: {
          cmuAccount: true,
          displayNameTh: true,
          displayNameEn: true,
        },
      },
      classSession: {
        select: {
          id: true,
          name: true,
          classIndex: true,
          date: true,
        },
      },
    },
    orderBy: {
      checkedAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/teacher"
            className="text-white/80 hover:text-white flex items-center gap-2 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Attendance Records
          </h1>
          <p className="text-white/80">
            {course.courseCode} - {course.courseNameTh}
          </p>
          <p className="text-white/60 text-sm">
            Academic Year {course.academicYear}, Semester {course.semester}
          </p>
        </div>

        {/* Sessions Section (Top) */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-white">
              Sessions ({course.classSessions.length})
            </h2>
            <div className="flex gap-2">
              <Link
                href={`/teacher/courses/${cid}/sessions/create`}
                className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
              >
                + สร้างคาบเรียน
              </Link>
              <Link
                href={`/teacher/courses/${cid}/attendance/report`}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                ดูรายละเอียดการเช็คชื่อ
              </Link>
            </div>
          </div>

          {course.classSessions.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {course.classSessions.map((session: ClassSession) => {
                const sessionAttendances = attendances.filter(
                  (a: any) => a.classSessionId === session.id
                );
                return (
                  <Link
                    key={session.id}
                    href={`/teacher/courses/${cid}/sessions/${session.id}`}
                    className="block hover:scale-105 transition-transform"
                  >
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 h-full hover:bg-white/20 transition-colors">
                      <div className="font-semibold text-white">
                        {session.name}
                      </div>
                      <div className="text-white/60 text-sm">
                        {new Date(session.date).toLocaleDateString("th-TH")}
                      </div>
                      <div className="text-white/80 text-sm mt-2">
                        Keyword:{" "}
                        <span className="font-mono">{session.keyword}</span>
                      </div>
                      <div className="text-white/80 text-sm">
                        Check-ins: {sessionAttendances.length}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-white/70">No sessions created yet</p>
          )}
        </div>

        {/* Recent Scan Section (Bottom) */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Recent Scan
          </h2>

          {attendances.length === 0 ? (
            <p className="text-white/70">No attendance records yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-white">
                <thead className="bg-white/10 border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Student Code</th>
                    <th className="px-4 py-3">Scanned By</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((att: any) => (
                    <tr
                      key={att.id}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{att.classSession.name}</div>
                        <div className="text-xs text-white/60">
                          {new Date(att.classSession.date).toLocaleDateString(
                            "th-TH"
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {att.student.displayNameTh ||
                          att.student.displayNameEn ||
                          att.student.cmuAccount}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {att.student.studentCode}
                      </td>
                      <td className="px-4 py-3">
                        {att.scanner.displayNameTh ||
                          att.scanner.displayNameEn ||
                          att.scanner.cmuAccount}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(att.checkedAt).toLocaleString("th-TH")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${att.status === "PRESENT"
                            ? "bg-green-500/20 text-green-300"
                            : att.status === "DUPLICATE"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-red-500/20 text-red-300"
                            }`}
                        >
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
