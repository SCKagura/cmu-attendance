// app/teacher/courses/[courseId]/page.tsx
import { redirect } from "next/navigation";

export default function CourseIndex({
  params,
}: {
  params: { courseId: string };
}) {
  redirect(`/teacher/courses/${params.courseId}/roster`);
}
