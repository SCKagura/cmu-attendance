import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import CreateCourseButton from "./_components/CreateCourseButton";
import DeleteCourseButton from "./_components/DeleteCourseButton";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Teacher dashboard</h1>
        <p className="mt-2 text-sm text-zinc-400">
          ยังไม่ได้ล็อกอินผ่าน CMU Mobile
        </p>
        <a
          className="underline text-sm"
          href={`/api/auth/dev-login?account=dev&email=dev%40example.com&role=TEACHER&redirect=%2Fteacher`}
        >
          Dev-login
        </a>
      </div>
    );
  }

  // Check permissions - Teachers only
  const isTeacher = await prisma.userRole.findFirst({
    where: { userId: user.id, role: { name: "TEACHER" } },
  });

  if (!isTeacher) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
        <p className="mt-2 text-zinc-400">
          You do not have permission to view the Teacher Dashboard.
        </p>
        <p className="mt-1 text-zinc-400 text-sm">
          This portal is for Teachers only. If you are a Co-Teacher, please use the Co-Teacher Portal. If you are a TA, please use the TA Portal.
        </p>
        <Link href="/" className="mt-4 inline-block text-blue-400 underline">
          Go to Home
        </Link>
      </div>
    );
  }

  const ownerCourses = await prisma.course.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      courseCode: true,
      courseNameTh: true,
      academicYear: true,
      semester: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teacher dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            สวัสดี, {user.cmuAccount}
          </p>
        </div>
        <CreateCourseButton />
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">รายวิชาที่คุณเป็นผู้สอน</h2>
        {ownerCourses.length === 0 ? (
          <div className="text-sm text-zinc-400">
            ยังไม่มีวิชา — กด "สร้างรายวิชา" มุมขวาบน
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ownerCourses.map(
              ({ id, courseCode, courseNameTh, academicYear, semester }: any) => (
                <li
                  key={id}
                  className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4"
                >
                  <div className="font-medium">
                    {courseCode} – {courseNameTh ?? ""}
                  </div>
                  <div className="mb-3 text-xs text-zinc-400">
                    ปี {academicYear} เทอม {semester}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/teacher/courses/${String(id)}/roster`}
                      className="rounded bg-fuchsia-600 px-3 py-1 text-sm hover:bg-fuchsia-500"
                    >
                      จัดการคอร์ส
                    </Link>
                    <DeleteCourseButton id={id} />
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
