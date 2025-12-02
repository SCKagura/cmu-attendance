// app/teacher/CourseRosterUpload.tsx
"use client";

import { useState, FormEvent } from "react";

export function CourseRosterUpload({ courseId }: { courseId: number }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
      setError("กรุณาเลือกไฟล์ Excel");
      setLoading(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/courses/${courseId}/import-roster`, {
        method: "POST",
        body: fd,
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        readRows?: number;
        importedRows?: number;
      };

      if (!res.ok) {
        setError(data.error || `นำเข้ารายชื่อไม่สำเร็จ (status ${res.status})`);
        return;
      }

      setStatus(
        `นำเข้ารายชื่อแล้ว ${data.importedRows ?? 0}/${data.readRows ?? 0} แถว`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : String(err) || "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="flex flex-col md:flex-row gap-2 items-start md:items-center"
    >
      <input type="file" name="file" accept=".xlsx,.xls" />

      <button
        type="submit"
        disabled={loading}
        className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-xs text-white disabled:opacity-50"
      >
        {loading ? "กำลังนำเข้ารายชื่อ..." : "นำเข้ารายชื่อจาก Excel"}
      </button>

      {status && <p className="text-xs text-green-400">{status}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
