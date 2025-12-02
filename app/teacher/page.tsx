import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TeacherCourseForm } from "./TeacherCourseForm";
import { CourseRosterUpload } from "./CourseRosterUpload";
import { CourseDeleteButton } from "./CourseDeleteButton";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Teacher dashboard</h1>
        <p>ยังไม่ได้ล็อกอินผ่าน CMU Mobile</p>
      </div>
    );
  }

  const courses = await prisma.course.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Teacher dashboard</h1>
        <p className="text-sm text-gray-400">
          สวัสดี, {user.displayNameTh || user.cmuAccount} (owner of{" "}
          {courses.length} course{courses.length === 1 ? "" : "s"})
        </p>
      </div>

      <TeacherCourseForm />

      <div>
        <h2 className="font-semibold mb-2">รายวิชาที่คุณเป็นผู้สอน</h2>
        {courses.length === 0 ? (
          <p className="text-sm text-gray-500">
            ยังไม่มีรายวิชา ลองสร้างวิชาแรกจากฟอร์มด้านบน
          </p>
        ) : (
          <ul className="space-y-2">
            {courses.map((c) => (
              <li
                key={c.id}
                className="border rounded-lg p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-medium">
                    {c.courseCode} - {c.courseNameTh ?? c.courseNameEn}
                  </div>
                  <div className="text-xs text-gray-500">
                    ปี {c.academicYear} เทอม {c.semester}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-2 items-end md:items-center">
                  <CourseRosterUpload courseId={c.id} />
                  <CourseDeleteButton courseId={c.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
