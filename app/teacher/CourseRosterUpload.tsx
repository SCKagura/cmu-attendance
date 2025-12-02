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
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "อัปโหลดไม่สำเร็จ");
      return;
    }

    let msg = `อ่าน ${data.readRows} แถว, นำเข้าสำเร็จ ${data.importedRows} คน`;
    if (data.errors && data.errors.length > 0) {
      msg += "\n\nพบข้อผิดพลาดบางรายการ:\n" + data.errors.slice(0, 10).join("\n");
      if (data.errors.length > 10) msg += `\n...และอีก ${data.errors.length - 10} รายการ`;
    }
    alert(msg);
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
