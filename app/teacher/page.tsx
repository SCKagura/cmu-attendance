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
  const taCourses = taRoles.map((r) => r.course!).filter(Boolean);

  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teacher dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            สวัสดี, {user.cmuAccount} (owner of {ownerCourses.length} course
            {ownerCourses.length !== 1 ? "s" : ""})
          </p>
        </div>
        <CreateCourseButton />
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">รายวิชาที่คุณเป็นผู้สอน</h2>
        {ownerCourses.length === 0 ? (
          <div className="text-sm text-zinc-400">
            ยังไม่มีวิชา — กด “สร้างรายวิชา” มุมขวาบน
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ownerCourses.map(
              ({ id, courseCode, courseNameTh, academicYear, semester }) => (
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

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          รายวิชาที่คุณเป็นผู้ช่วยสอน (TA)
        </h2>
        {taCourses.length === 0 ? (
          <div className="text-sm text-zinc-400">ยังไม่มีรายวิชาในบทบาท TA</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {taCourses.map((c) => (
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
                    href={`/teacher/courses/${String(c!.id)}/roster`}
                    className="rounded bg-sky-600 px-3 py-1 text-sm hover:bg-sky-500"
                  >
                    เปิดรายชื่อนักศึกษา
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
