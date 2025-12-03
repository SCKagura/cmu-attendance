import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import SessionList from "./SessionList";

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <div className="p-6">ยังไม่ได้ล็อกอินผ่าน CMU Mobile</div>;

  const { courseId } = await params;
  const id = Number(courseId);
  if (!Number.isFinite(id))
    return <div className="p-6 text-red-400">invalid courseId</div>;

  const course = await prisma.course.findFirst({
    where: { id, ownerId: user.id },
    select: {
      id: true,
      courseCode: true,
      courseNameTh: true,
      academicYear: true,
      semester: true,
      ownerId: true,
      userRoles: {
        where: { userId: user.id },
        include: { role: true },
      },
    },
  });
  if (!course) return <div className="p-6">Course not found</div>;

  const isOwner = course.ownerId === user.id;
  const isTeacher = course.userRoles.some((ur: any) => ur.role.name === "TEACHER");
  const canManage = isOwner || isTeacher;

  const classSessions = await prisma.classSession.findMany({
    where: { courseId: id },
    orderBy: { date: "desc" },
    include: { _count: { select: { attendances: true } } },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">
          {course.courseCode} – {course.courseNameTh ?? ""} (ปี{" "}
          {course.academicYear} เทอม {course.semester})
        </div>
        <Link
          href={`/teacher/courses/${id}/roster`}
          className="text-sm underline"
        >
          รายชื่อนักศึกษา
        </Link>
      </div>

      {canManage && (
        <Link
          href={`/teacher/courses/${id}/sessions/create`}
          className="px-3 py-1 rounded bg-violet-600 hover:bg-violet-500"
        >
          สร้างคาบ
        </Link>
      )}

      <SessionList 
        sessions={classSessions} 
        courseId={id} 
        canManage={canManage} 
      />
    </div>
  );
}
