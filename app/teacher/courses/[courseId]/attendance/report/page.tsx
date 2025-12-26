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
        select: {
            id: true,
            courseCode: true,
            courseNameTh: true,
            courseNameEn: true,
            activeSections: true,
            classSessions: {
                orderBy: { date: "asc" },
            },
        },
    });

    if (!course) {
        return <div className="p-6 text-white">Course not found or access denied</div>;
    }

    // Parse active sections for filtering
    let activeSections: string[] = [];
    if (course.activeSections) {
        try {
            activeSections = JSON.parse(course.activeSections);
        } catch (e) {
            console.error("Failed to parse activeSections:", e);
        }
    }

    // Build filter for enrollments based on active sections
    const enrollmentWhere: any = { 
        courseId: cid,
        isActive: true // Only show active students from latest import
    };
    if (activeSections.length > 0) {
        const orConditions = activeSections.map(s => {
            const [lec, lab] = s.split("|");
            return {
                section: lec,
                labSection: (lab === "null" || lab === "" || lab === "0") ? null : lab
            };
        });
        enrollmentWhere.OR = orConditions;
    }

    // Fetch enrollments with active section filter
    const enrollments = await prisma.enrollment.findMany({
        where: enrollmentWhere,
        include: {
            student: true,
        },
        orderBy: { importIndex: "asc" },
    });

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
            course={{
                ...course,
                enrollments,
            }}
            attendances={attendances}
        />
    );
}
