import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import RosterTable from "@/app/teacher/courses/[courseId]/_components/RosterTable";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TARosterPage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const user = await getCurrentUser();
    if (!user) return <div className="p-6">Unauthorized</div>;

    const { courseId } = await params;
    const id = Number(courseId);
    if (!Number.isFinite(id))
        return <div className="p-6 text-red-400">invalid courseId</div>;

    const course = await prisma.course.findUnique({
        where: { id },
        select: {
            id: true,
            courseCode: true,
            courseNameTh: true,
            courseNameEn: true,
            academicYear: true,
            semester: true,
            userRoles: {
                where: { userId: user.id },
                include: { role: true },
            },
        },
    });
    if (!course) return <div className="p-6 text-red-400">ไม่พบรายวิชา</div>;

    // Check if user is TA for this course
    const isTA = course.userRoles.some((ur: any) => ur.role.name === "TA");
    if (!isTA) {
        return <div className="p-6 text-red-400">Access Denied</div>;
    }

    const enrollments = await prisma.enrollment.findMany({
        where: { courseId: id },
        include: {
            student: {
                select: {
                    studentCode: true,
                    displayNameTh: true,
                    displayNameEn: true,
                    cmuAccount: true,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {course.courseCode} – {course.courseNameTh ?? course.courseNameEn}
                        </h1>
                        <p className="text-white/60">
                            Year {course.academicYear} Semester {course.semester}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Link
                            href={`/ta/courses/${id}/attendance`}
                            className="inline-flex items-center gap-2 rounded-lg bg-purple-600/20 border border-purple-500/30 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-600/40 transition-colors"
                        >
                            📊 Attendance
                        </Link>
                        <Link
                            href="/ta"
                            className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                        >
                            ← Back
                        </Link>
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
                    <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded text-blue-200 text-sm">
                        📖 <strong>View Only:</strong> As a TA, you can view the roster but cannot make changes.
                    </div>
                    <RosterTable enrollments={enrollments} />
                </div>
            </div>
        </div>
    );
}
