import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CourseRosterUpload } from "@/app/teacher/CourseRosterUpload";
import { ManualEnrollStudent } from "@/app/teacher/ManualEnrollStudent";
import RosterTable from "../_components/RosterTable";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RosterPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <div className="p-6">Unauthorized</div>;

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
      ownerId: true,
      instructorName: true,
      activeSections: true,
      userRoles: {
        where: { userId: user.id },
        include: { role: true },
      },
    },
  });
  if (!course) return <div className="p-6 text-red-400">ไม่พบรายวิชา</div>;

  const isOwner = course.ownerId === user.id;
  const isTeacher = course.userRoles.some((ur: any) => ["TEACHER", "CO_TEACHER"].includes(ur.role.name));
  const canManage = isOwner || isTeacher;

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
    courseId: id,
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

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    include: {
      student: {
        select: {
          studentCode: true,
          displayNameTh: true,
          displayNameEn: true,
          cmuEmail: true,
        },
      },
    },
    orderBy: { importIndex: "asc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <Link
              href="/teacher"
              className="text-white/60 hover:text-white text-sm mb-2 inline-block transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white">
              {course.courseCode} – {course.courseNameTh ?? course.courseNameEn}
            </h1>
            <p className="text-white/60">
              Year {course.academicYear} Semester {course.semester}
            </p>
            {course.instructorName && (
               <p className="text-purple-300 mt-1 font-medium">
                  Instructor: {course.instructorName}
               </p>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              href={`/teacher/courses/${id}/attendance`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-600/40 transition-colors"
            >
              📊 Attendance
            </Link>
            {canManage && (
              <Link
                href={`/teacher/courses/${id}/tas`}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600/20 border border-purple-500/30 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-600/40 transition-colors"
              >
                👥 Manage Team
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
          {canManage && (
            <div className="flex gap-2 mb-6">
              <CourseRosterUpload courseId={id} />
              <ManualEnrollStudent courseId={id} />
            </div>
          )}
          <div className={canManage ? "" : "mt-6"}>
            <RosterTable enrollments={enrollments} />
          </div>
        </div>
      </div>
    </div>
  );
}
