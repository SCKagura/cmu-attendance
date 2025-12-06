import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AttendanceMatrixClient from "./AttendanceMatrixClient";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ courseId: string }>;
};

export default async function AttendanceReportPage({ params }: Props) {
    const { courseId } = await params;
    const user = await getCurrentUser();

    if (!user) {
        return <div className="p-6 text-white">Please login first</div>;
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
                            role: { name: "TA" },
                        },
                    },
                },
            ],
        },
        include: {
            classSessions: {
                orderBy: { date: "asc" },
            },
            enrollments: {
                include: {
                    student: true,
                },
                orderBy: { importIndex: "asc" },
            },
        },
    });

    if (!course) {
        return <div className="p-6 text-white">Course not found or access denied</div>;
    }

    // Get all attendance records for this course
    const attendances = await prisma.attendance.findMany({
        where: {
            classSession: {
                courseId: cid,
            },
        },
        select: {
            studentId: true,
            classSessionId: true,
            status: true,
            checkedAt: true,
        },
    });

    return (
        <AttendanceMatrixClient
            course={course}
            attendances={attendances}
        />
    );
}
