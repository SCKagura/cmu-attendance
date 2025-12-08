"use client";

import { useState } from "react";

export function TeacherCourseForm() {
  const [courseCode, setCourseCode] = useState("");
  const [courseNameTh, setCourseNameTh] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [semester, setSemester] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode,
          courseNameTh,
          academicYear: year,
          semester,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
      };

      if (!res.ok) {
        const msg =
          data.error ||
          data.detail ||
          `Create course failed (status ${res.status})`;
        setError(msg);
        return;
      }

      // success
      setCourseCode("");
      setCourseNameTh("");
      // reload ให้ list วิชาอัปเดต
      window.location.reload();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(String(error) || "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-xl p-4 space-y-3 bg-neutral-900/40"
    >
      <h2 className="font-semibold mb-1">สร้างรายวิชาใหม่</h2>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-sm mb-1">รหัสวิชา</label>
          <input
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            placeholder="261361"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm mb-1">ชื่อวิชา (ภาษาไทย)</label>
          <input
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            value={courseNameTh}
            onChange={(e) => setCourseNameTh(e.target.value)}
            placeholder="Computer Network Engineering"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div>
          <label className="block text-sm mb-1">ปีการศึกษา</label>
          <input
            type="number"
            className="w-28 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">เทอม</label>
          <input
            type="number"
            min={1}
            max={3}
            className="w-20 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            value={semester}
            onChange={(e) => setSemester(Number(e.target.value))}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "กำลังสร้าง..." : "สร้างรายวิชา"}
      </button>
    </form>
  );
}
