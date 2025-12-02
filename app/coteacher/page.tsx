import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CoTeacherPage() {
    const user = await getCurrentUser();
    if (!user) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold">Co-Teacher Dashboard</h1>
                <p className="mt-2 text-sm text-zinc-400">
                    Please login to continue
                </p>
                <Link href="/" className="underline text-sm">
                    Go to Home
                </Link>
            </div>
        );
    }

    // Check if user is Co-Teacher
    const isCoTeacher = await prisma.userRole.findFirst({
        where: {
            userId: user.id,
            role: { name: "CO_TEACHER" },
            courseId: { not: null },
        },
    });

    if (!isCoTeacher) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
                <p className="mt-2 text-zinc-400">
                    You do not have permission to view the Co-Teacher Dashboard.
                </p>
                <Link href="/" className="mt-4 inline-block text-blue-400 underline">
                    Go to Home
                </Link>
            </div>
        );
    }

    // Get courses where user is Co-Teacher
    const coTeacherRoles = await prisma.userRole.findMany({
        where: {
            userId: user.id,
            role: { is: { name: "CO_TEACHER" } },
            courseId: { not: null },
        },
        include: {
            course: {
                select: {
                    id: true,
                    courseCode: true,
                    courseNameTh: true,
                    academicYear: true,
                    semester: true,
                },
            },
        },
        orderBy: { id: "desc" },
    });
    const coTeacherCourses = coTeacherRoles.map((r: any) => r.course!).filter(Boolean);

    return (
        <div className="p-6 space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Co-Teacher Dashboard</h1>
                    <p className="mt-1 text-sm text-zinc-400">
                        สวัสดี, {user.cmuAccount} (Co-Teacher for {coTeacherCourses.length} course
                        {coTeacherCourses.length !== 1 ? "s" : ""})
                    </p>
                </div>
                <Link
                    href="/"
                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                    ← Back to Dashboard
                </Link>
            </header>

            <section>
                <h2 className="mb-3 text-lg font-semibold">
                    รายวิชาที่คุณเป็นผู้ช่วยสอน (Co-Teacher)
                </h2>
                {coTeacherCourses.length === 0 ? (
                    <div className="text-sm text-zinc-400">ยังไม่มีรายวิชาในบทบาท Co-Teacher</div>
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {coTeacherCourses.map((c: any) => (
                            <li
                                key={c!.id}
                                className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4"
                            >
                                <div className="font-medium">
                                    {c!.courseCode} – {c!.courseNameTh ?? ""}
                                </div>
                                <div className="mb-3 text-xs text-zinc-400">
                                    ปี {c!.academicYear} เทอม {c!.semester}
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        href={`/coteacher/courses/${String(c!.id)}/roster`}
                                        className="rounded bg-purple-600 px-3 py-1 text-sm hover:bg-purple-500"
                                    >
                                        ดูรายชื่อนักศึกษา
                                    </Link>
                                    <Link
                                        href={`/coteacher/courses/${String(c!.id)}/attendance`}
                                        className="rounded bg-green-600 px-3 py-1 text-sm hover:bg-green-500"
                                    >
                                        ดูการเข้าเรียน
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
