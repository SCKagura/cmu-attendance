"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteCourseButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function onDelete() {
    if (!confirm("ยืนยันลบรายวิชาและข้อมูลทั้งหมด?")) return;
    setLoading(true);
    const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      alert("Failed to delete course");
      return;
    }
    router.refresh();
  }
  return (
    <button
      onClick={onDelete}
      disabled={loading}
      className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-500 disabled:opacity-60"
    >
      ลบรายวิชา
    </button>
  );
}
