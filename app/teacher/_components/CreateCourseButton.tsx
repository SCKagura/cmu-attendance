"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateCourseButton({
  defaultYear = new Date().getFullYear(),
  defaultSemester = 2,
}: {
  defaultYear?: number;
  defaultSemester?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [courseNameTh, setCourseNameTh] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultYear);
  const [semester, setSemester] = useState(defaultSemester);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseCode,
        courseNameTh,
        academicYear,
        semester,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: number;
      error?: string;
    };
    setLoading(false);
    if (!res.ok) {
      setErr(data?.error ?? "สร้างรายวิชาไม่สำเร็จ");
      return;
    }
    setOpen(false);
    setCourseCode("");
    setCourseNameTh("");
    if (data?.id != null)
      router.push(`/teacher/courses/${String(data.id)}/roster`);
    else router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-fuchsia-600 text-white px-4 py-2 text-sm hover:bg-fuchsia-500"
      >
        + สร้างรายวิชา
      </button>
      <div
        className={`fixed inset-0 z-50 ${open ? "" : "hidden"}`}
        aria-hidden={!open}
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setOpen(false)}
        />
        <div className="absolute inset-x-0 top-14 mx-auto w-[min(560px,92vw)] rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">สร้างรายวิชาใหม่</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-300">รหัสวิชา</span>
              <input
                className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                required
                placeholder="261361"
              />
            </label>
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-sm text-zinc-300">ชื่อวิชา (ภาษาไทย)</span>
              <input
                className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={courseNameTh}
                onChange={(e) => setCourseNameTh(e.target.value)}
                placeholder="Computer Network Engineering"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-300">ปีการศึกษา</span>
              <input
                type="number"
                className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={academicYear}
                onChange={(e) => setAcademicYear(Number(e.target.value))}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-300">เทอม</span>
              <input
                type="number"
                min={1}
                max={3}
                className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                required
              />
            </label>
            {err && (
              <div className="md:col-span-2 text-sm text-red-400">{err}</div>
            )}
            <div className="md:col-span-2 flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-zinc-800 px-3 py-2 hover:bg-zinc-700"
              >
                ยกเลิก
              </button>
              <button
                disabled={loading}
                className="rounded-md bg-fuchsia-600 px-4 py-2 hover:bg-fuchsia-500 disabled:opacity-60"
              >
                {loading ? "กำลังบันทึก…" : "สร้างรายวิชา"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
