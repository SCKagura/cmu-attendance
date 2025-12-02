// app/student/page.tsx
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic"; // ให้รันบน server ทุกครั้ง

export default async function StudentPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Student</h1>
        <p>ยังไม่ได้ล็อกอินผ่าน CMU Mobile</p>
      </div>
    );
  }

  // ดึง course ที่ลงทะเบียนไว้ (เดี๋ยวอนาคตจะมีให้ select วิชาแล้ว gen QR)
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: user.id },
    include: { course: true },
  });

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Student dashboard</h1>

      <div className="border rounded-xl p-4">
        <p className="font-semibold">
          สวัสดี, {user.displayNameTh || user.cmuAccount}
        </p>
        <p className="text-sm text-gray-500">
          email: {user.cmuEmail} | student code: {user.studentCode ?? "-"}
        </p>
        <p className="text-sm text-gray-500">
          {user.organizationTh} / {user.organizationEn}
        </p>
      </div>

      <div>
        <h2 className="font-semibold mb-2">
          รายวิชาที่ลงทะเบียน (จาก Excel/ระบบ)
        </h2>
        {enrollments.length === 0 && (
          <p className="text-sm">ยังไม่มีข้อมูลรายวิชา</p>
        )}
        <ul className="space-y-2">
          {enrollments.map((e) => (
            <li
              key={e.id}
              className="border rounded-lg p-3 flex justify-between items-center"
            >
              <div>
                <div className="font-medium">
                  {e.course.courseCode} -{" "}
                  {e.course.courseNameTh ?? e.course.courseNameEn}
                </div>
                <div className="text-xs text-gray-500">
                  ปี {e.course.academicYear} เทอม {e.course.semester} | รหัส นศ.
                  ในวิชานี้: {e.studentCode}
                </div>
              </div>
              {/* ตรงนี้อนาคตใส่ปุ่ม "Generate QR" ได้ */}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
