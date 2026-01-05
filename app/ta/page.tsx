import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function TAPage() {
    const user = await getCurrentUser();
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 flex flex-col items-center justify-center p-6 text-white">
                <h1 className="text-2xl font-bold">TA Dashboard</h1>
                <p className="mt-2 text-white/60">
                    Please login via CMU Mobile
                </p>
                <Link href="/" className="mt-4 underline text-sm text-emerald-300 hover:text-emerald-200">
                    Go to Home
                </Link>
            </div>
        );
    }

    // Check if user is TA or ADMIN
    const isTA = await prisma.userRole.findFirst({
        where: { userId: user.id, role: { name: "TA" } },
    });

    const isAdmin = await prisma.userRole.findFirst({
        where: { userId: user.id, role: { name: "ADMIN" } },
    });

    if (!isTA && !isAdmin) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 p-6 flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md w-full text-center">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
                    <p className="text-white/80 mb-2">
                        You do not have permission to view the TA Dashboard.
                    </p>
                    <Link href="/" className="inline-block px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    // Get courses where user is TA
    const taRoles = await prisma.userRole.findMany({
        where: {
            userId: user.id,
            role: { is: { name: "TA" } },
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
    const taCourses = taRoles.map((r: any) => r.course!).filter(Boolean);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">TA Dashboard</h1>
                        <p className="mt-1 text-white/60">
                            Welcome, {user.displayNameTh || user.displayNameEn || user.cmuAccount}
                        </p>
                        <p className="text-white/40 text-sm">
                            TA for {taCourses.length} course{taCourses.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <LogoutButton />
                </header>

                <section>
                    <h2 className="mb-4 text-xl font-semibold text-white">Your Assigned Courses</h2>
                    {taCourses.length === 0 ? (
                        <div className="text-white/40 bg-white/5 rounded-xl p-8 text-center border border-white/10">
                            No courses assigned yet
                        </div>
                    ) : (
                        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {taCourses.map((c: any) => (
                                <li
                                    key={c!.id}
                                    className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-6 hover:bg-white/20 transition-all hover:scale-[1.02] hover:shadow-xl"
                                >
                                    <div className="font-bold text-xl text-white mb-1">
                                        {c!.courseCode}
                                    </div>
                                    <div className="text-white/80 mb-4 line-clamp-1">
                                        {c!.courseNameTh ?? ""}
                                    </div>
                                    <div className="mb-6 text-sm text-white/50">
                                        Year {c!.academicYear} Semester {c!.semester}
                                    </div>
                                    <div className="flex gap-3">
                                        <Link
                                            href={`/ta/courses/${String(c!.id)}/roster`}
                                            className="flex-1 rounded-lg bg-purple-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 text-center transition-colors"
                                        >
                                            Roster
                                        </Link>
                                        <Link
                                            href={`/ta/courses/${String(c!.id)}/attendance`}
                                            className="flex-1 rounded-lg bg-pink-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 text-center transition-colors"
                                        >
                                            Attendance
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
