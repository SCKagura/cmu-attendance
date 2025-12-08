import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import SessionDetailClient from "@/app/teacher/courses/[courseId]/sessions/[sessionId]/SessionDetailClient";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ courseId: string; sessionId: string }>;
};

export default async function TASessionPage({ params }: Props) {
    const { courseId, sessionId } = await params;
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    const cid = Number(courseId);
    const sid = Number(sessionId);

    if (isNaN(cid) || isNaN(sid)) {
        notFound();
    }

    // Check if user is TA for this course
    const taRole = await prisma.userRole.findFirst({
        where: {
            userId: user.id,
            courseId: cid,
            role: { name: "TA" },
        },
    });

    if (!taRole) {
        return (
            <div className="p-6">
                <p className="text-red-400">Access denied. You must be a TA for this course.</p>
                <Link href="/ta" className="text-blue-400 underline">
                    ← Back to TA Dashboard
                </Link>
            </div>
        );
    }

    // Fetch session details
    const session = await prisma.classSession.findUnique({
        where: { id: sid },
        include: {
            course: true,
        },
    });

    if (!session || session.courseId !== cid) {
        notFound();
    }

    // Fetch all enrolled students
    const enrollments = await prisma.enrollment.findMany({
        where: { courseId: cid },
        include: {
            student: {
                select: {
                    id: true,
                    studentCode: true,
                    displayNameTh: true,
                    displayNameEn: true,
                    cmuAccount: true,
                },
            },
        },
        orderBy: { studentCode: "asc" },
    });

    // Fetch attendance records for this session
    const attendances = await prisma.attendance.findMany({
        where: { classSessionId: sid },
        select: {
            studentId: true,
            status: true,
            checkedAt: true,
            note: true,
        },
    });

    // Prepare data for client
    const students = enrollments.map((e: any) => ({
        id: e.student.id,
        studentCode: e.studentCode || e.student.studentCode || "",
        name:
            e.student.displayNameTh ||
            e.student.displayNameEn ||
            e.student.cmuAccount,
    }));

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <Link
                        href={`/ta/courses/${cid}/attendance`}
                        className="text-white/80 hover:text-white flex items-center gap-2 transition-colors"
                    >
                        ← Back to Attendance
                    </Link>
                </div>

                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded text-blue-200 text-sm">
                    📖 <strong>View Only:</strong> As a TA, you can view session details but cannot delete sessions.
                </div>

                <SessionDetailClient
                    courseId={cid}
                    sessionId={sid}
                    sessionName={session.name}
                    sessionDate={session.date}
                    keyword={session.keyword}
                    students={students}
                    attendances={attendances.map((a: any) => ({
                        ...a,
                        status: a.status,
                    }))}
                    showDeleteButton={false}
                    showExportButton={false}
                    readOnly={true}
                />
            </div>
        </div>
    );
}
