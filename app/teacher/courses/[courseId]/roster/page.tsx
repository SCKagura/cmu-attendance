import { prisma } from "@/lib/db";
import { CourseRosterUpload } from "@/app/teacher/CourseRosterUpload";
import RosterTable from "../_components/RosterTable";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RosterPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
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
    },
  });
  if (!course) return <div className="p-6 text-red-400">ไม่พบรายวิชา</div>;

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
            href={`/teacher/courses/${id}/attendance`}
            className="inline-block rounded bg-green-600 px-3 py-2 text-sm hover:bg-green-500"
          >
            📊 Attendance
          </Link>
          <Link
            href={`/teacher/courses/${id}/tas`}
            className="inline-block rounded bg-purple-600 px-3 py-2 text-sm hover:bg-purple-500"
          >
            👥 Manage TAs
          </Link>

        </div>
      </div>

      <CourseRosterUpload courseId={id} />
      <RosterTable enrollments={enrollments} />
    </div>
  );
}
