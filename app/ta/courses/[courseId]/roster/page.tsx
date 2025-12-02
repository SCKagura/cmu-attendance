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
        <div className="space-y-4 p-6">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold">
                        {course.courseCode} – {course.courseNameTh ?? course.courseNameEn}
                    </h1>
                    <p className="text-xs text-zinc-400">
                        ปี {course.academicYear} เทอม {course.semester}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Link
                        href={`/ta/courses/${id}/attendance`}
                        className="inline-block rounded bg-green-600 px-3 py-2 text-sm hover:bg-green-500"
                    >
                        📊 Attendance
                    </Link>
                    <Link
                        href="/ta"
                        className="inline-block rounded bg-gray-600 px-3 py-2 text-sm hover:bg-gray-500"
                    >
                        ← Back
                    </Link>
                </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded text-blue-200 text-sm">
                📖 <strong>View Only:</strong> As a TA, you can view the roster but cannot make changes.
            </div>

            <RosterTable enrollments={enrollments} />
        </div>
    );
}
