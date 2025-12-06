import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TAAttendancePage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const user = await getCurrentUser();
    if (!user) return <div className="p-6">Unauthorized</div>;

    const { courseId } = await params;
    const cid = Number(courseId);
    if (!Number.isFinite(cid))
        return <div className="p-6 text-red-400">Invalid courseId</div>;

    // Check access - TA only
    const course = await prisma.course.findFirst({
        where: {
            id: cid,
            userRoles: {
                some: {
                    userId: user.id,
                    role: { name: "TA" },
                },
            },
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

    const allAttendances = await prisma.attendance.findMany({
        where: { classSession: { courseId: cid } },
        include: {
            student: {
                select: {
                    id: true,
                    studentCode: true,
                    displayNameTh: true,
                    displayNameEn: true,
                },
            },
            classSession: {
                select: {
                    id: true,
                    name: true,
                    date: true,
                },
            },
        },
        orderBy: { checkedAt: "desc" },
    });

    
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {course.courseCode} – {course.courseNameTh ?? ""}
                        </h1>
                        <p className="text-white/60">
                            Year {course.academicYear} Semester {course.semester}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`/ta/courses/${cid}/roster`}
                            className="inline-flex items-center gap-2 rounded-lg bg-purple-600/20 border border-purple-500/30 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-600/40 transition-colors"
                        >
                            รายชื่อนักศึกษา
                        </Link>
                        <Link
                            href="/ta"
                            className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                        >
                            ← Back to TA Dashboard
                        </Link>
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
                    <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded text-blue-200 text-sm">
                        📖 <strong>View Only:</strong> As a TA, you can view attendance records but cannot create sessions or modify data.
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">Sessions</h2>
                        {course.classSessions.length === 0 ? (
                            <p className="text-white/60">No sessions yet.</p>
                        ) : (
                            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {course.classSessions.map((s: any) => (
                                    <li key={s.id}>
                                        <Link
                                            href={`/ta/courses/${cid}/sessions/${s.id}`}
                                            className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-colors"
                                        >
                                            <div className="font-medium text-white mb-1">{s.name ?? "Class"}</div>
                                            <div className="text-sm text-white/60">
                                                {new Date(s.date).toLocaleDateString("th-TH")}
                                            </div>
                                            <div className="text-xs text-white/40 mt-2">
                                                {new Date(s.startTime).toLocaleTimeString("th-TH", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}{" "}
                                                -{" "}
                                                {new Date(s.endTime).toLocaleTimeString("th-TH", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">All Check-ins</h2>
                        {allAttendances.length === 0 ? (
                            <p className="text-white/60">No attendance records yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-white">
                                    <thead className="bg-white/10 border-b border-white/20">
                                        <tr>
                                            <th className="px-4 py-3">Session</th>
                                            <th className="px-4 py-3">Student ID</th>
                                            <th className="px-4 py-3">Name</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Checked At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allAttendances.map((att: any) => (
                                            <tr key={att.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3">
                                                    {att.classSession.name}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-sm">
                                                    {att.student.studentCode || "-"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {att.student.displayNameTh || att.student.displayNameEn || "-"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs font-semibold ${
                                                            att.status === "PRESENT"
                                                                ? "bg-green-500/20 text-green-300"
                                                                : att.status === "LATE"
                                                                ? "bg-yellow-500/20 text-yellow-300"
                                                                : att.status === "LEAVE"
                                                                ? "bg-blue-500/20 text-blue-300"
                                                                : "bg-red-500/20 text-red-300"
                                                        }`}
                                                    >
                                                        {att.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {new Date(att.checkedAt).toLocaleString("th-TH")}
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
        </div>
    );
}
