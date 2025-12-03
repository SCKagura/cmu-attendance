import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import CreateSessionForm from "@/app/teacher/_components/CreateSessionForm";
import Link from "next/link";

export default async function CreateSessionPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <div className="p-6">Unauthorized</div>;

  const { courseId } = await params;
  const id = Number(courseId);
  if (!Number.isFinite(id)) return <div className="p-6">Invalid Course ID</div>;

  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      courseCode: true,
      courseNameTh: true,
      courseNameEn: true,
    },
  });

  if (!course) return <div className="p-6">Course not found</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          สร้างคาบเรียน: {course.courseCode}
        </h1>
        <Link
          href={`/teacher/courses/${id}/attendance`}
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← กลับไปหน้าคาบเรียน
        </Link>
      </div>

      <div className="bg-neutral-900/50 rounded-xl p-6 border border-neutral-800">
        <CreateSessionForm courseId={id} />
      </div>
    </div>
  );
}
