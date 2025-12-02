import Link from "next/link";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  return (
    <div className="p-6 space-y-6">
      <nav className="flex gap-2">
        <Link
          href={`/teacher/courses/${courseId}/roster`}
          className="px-3 py-2 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700"
        >
          รายชื่อนักศึกษา
        </Link>
        <Link
          href={`/teacher/courses/${courseId}/sessions`}
          className="px-3 py-2 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700"
        >
          สร้างคาบ / เช็คชื่อ
        </Link>
      </nav>
      <div>{children}</div>
    </div>
  );
}
