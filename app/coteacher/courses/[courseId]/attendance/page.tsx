import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CoTeacherAttendancePage({
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

    // Check access - Co-Teacher only
    const course = await prisma.course.findFirst({
        where: {
            id: cid,
            userRoles: {
                some: {
                    userId: user.id,
                    role: { name: "CO_TEACHER" },
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
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        {course.courseCode} – {course.courseNameTh ?? ""}
                    </h1>
                    <p className="text-sm text-zinc-400">
                        ปี {course.academicYear} เทอม {course.semester}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/coteacher/courses/${cid}/roster`}
                        className="text-sm underline"
                    >
                        รายชื่อนักศึกษา
                    </Link>
                    <Link href="/coteacher" className="text-sm underline">
                        ← Back to Co-Teacher Dashboard
                    </Link>
                </div>
            </div>

            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded text-purple-200 text-sm">
                📖 <strong>View Only:</strong> As a Co-Teacher, you can view attendance records but cannot create sessions or modify data.
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">All Check-ins</h2>
                {allAttendances.length === 0 ? (
                    <p className="text-zinc-400">No attendance records yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-zinc-800">
                                <tr>
                                    <th className="px-3 py-2 border border-zinc-700">Session</th>
                                    <th className="px-3 py-2 border border-zinc-700">Student ID</th>
                                    <th className="px-3 py-2 border border-zinc-700">Name</th>
                                    <th className="px-3 py-2 border border-zinc-700">Status</th>
                                    <th className="px-3 py-2 border border-zinc-700">Checked At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allAttendances.map((att: any) => (
                                    <tr key={att.id} className="hover:bg-zinc-800/50">
                                        <td className="px-3 py-2 border border-zinc-700">
                                            {att.classSession.name}
                                        </td>
                                        <td className="px-3 py-2 border border-zinc-700 font-mono text-sm">
                                            {att.student.studentCode || "-"}
                                        </td>
                                        <td className="px-3 py-2 border border-zinc-700">
                                            {att.student.displayNameTh || att.student.displayNameEn || "-"}
                                        </td>
                                        <td className="px-3 py-2 border border-zinc-700">
                                            <span
                                                className={
                                                    att.status === "present"
                                                        ? "text-green-400"
                                                        : "text-red-400"
                                                }
                                            >
                                                {att.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 border border-zinc-700 text-sm">
                                            {new Date(att.checkedAt).toLocaleString("th-TH")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">Sessions</h2>
                {course.classSessions.length === 0 ? (
                    <p className="text-zinc-400">No sessions yet.</p>
                ) : (
                    <ul className="divide-y divide-zinc-700 rounded border border-zinc-700">
                        {course.classSessions.map((s: any) => (
                            <li key={s.id} className="p-3 flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{s.name ?? "Class"}</div>
                                    <div className="text-xs text-zinc-400">
                                        {new Date(s.date).toLocaleDateString("th-TH")} •{" "}
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
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
