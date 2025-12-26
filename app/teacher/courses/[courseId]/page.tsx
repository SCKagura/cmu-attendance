// app/teacher/courses/[courseId]/page.tsx
import { redirect } from "next/navigation";

export default async function CourseIndex({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/teacher/courses/${courseId}/roster`);
}
