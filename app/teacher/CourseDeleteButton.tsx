"use client";

import { useState, useTransition } from "react";

export function CourseDeleteButton({ courseId }: { courseId: number }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const ok = confirm(
      "ยืนยันลบรายวิชานี้?\nข้อมูลคาบเรียน รายชื่อ และการเช็กชื่อทั้งหมดของวิชานี้จะถูกลบด้วย"
    );
    if (!ok) return;

    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}`, {
          method: "DELETE",
        });
        const data: { error?: string } = await res
          .json()
          .catch(() => ({} as { error?: string }));

        if (!res.ok) {
          setError(data.error || "ลบรายวิชาไม่สำเร็จ");
          return;
        }

        window.location.reload();
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError(String(e) || "Unknown error");
        }
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500 disabled:opacity-50"
      >
        {isPending ? "กำลังลบ..." : "ลบรายวิชา"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
