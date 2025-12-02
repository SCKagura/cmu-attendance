"use client";

import { useState } from "react";

export function CourseRosterUpload({ courseId }: { courseId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function onUpload() {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setLoading(true);
    const res = await fetch(`/api/courses/${courseId}/import-roster`, {
      method: "POST",
      body: form,
    });
    setLoading(false);
    if (!res.ok) {
      alert("อัปโหลดไม่สำเร็จ");
      return;
    }
    location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept=".xlsx,.csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-white"
      />
      <button
        onClick={onUpload}
        disabled={!file || loading}
        className="rounded bg-sky-600 px-3 py-2 text-sm hover:bg-sky-500 disabled:opacity-60"
      >
        {loading ? "กำลังอัปโหลด…" : "นำเข้าจาก Excel"}
      </button>
    </div>
  );
}
