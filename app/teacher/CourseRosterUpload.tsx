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
    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
      <div className="flex-1 w-full sm:w-auto">
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-white/80
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-purple-600 file:text-white
            hover:file:bg-purple-500
            cursor-pointer"
        />
      </div>
      
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          onClick={onUpload}
          disabled={!file || loading}
          className="flex-1 sm:flex-none rounded-lg bg-sky-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Uploading..." : "Import Excel"}
        </button>

        <button
          onClick={async () => {
              if(!confirm("Add 'student1' to this course for testing?")) return;
              setLoading(true);
              try {
                  const res = await fetch(`/api/courses/${courseId}/enroll-student`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                          studentCode: "650610001",
                          firstName: "Test",
                          lastName: "Student1",
                          email: "student1@cmu.ac.th",
                          cmuAccount: "student1"
                      })
                  });
                  if(res.ok) {
                      alert("Added student1 successfully!");
                      location.reload();
                  } else {
                      const data = await res.json();
                      alert(data.error || "Failed to add student1");
                  }
              } catch(e) {
                  alert("Error adding student");
              } finally {
                  setLoading(false);
              }
          }}
          disabled={loading}
          className="flex-1 sm:flex-none rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          + Test Student
        </button>
      </div>
    </div>
  );
}
