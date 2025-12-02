"use client";

import { useState } from "react";

export default function CreateSessionForm({ courseId }: { courseId: number }) {
  const [name, setName] = useState("Class");
  const [keyword, setKeyword] = useState("CHECKIN");
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  ); // yyyy-mm-dd
  const [start, setStart] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16); // datetime-local
  });
  const [duration, setDuration] = useState<number>(120);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);

    try {
      const startISO = new Date(start).toISOString();
      const dateISO = new Date(date).toISOString();

      const res = await fetch(`/api/courses/${courseId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          keyword,
          date: dateISO,
          startTime: startISO,
          date: dateISO,
          startTime: startISO,
          expiresInMinutes: duration,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || `Create session failed (${res.status})`);
        return;
      }
      // รีโหลดเพื่อเห็นรายการคาบล่าสุด
      window.location.reload();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setErr(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border rounded-xl p-4 space-y-3 bg-neutral-900/40"
    >
      <h2 className="font-semibold mb-1">สร้างคาบใหม่</h2>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">ชื่อคาบ</label>
          <input
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lecture 1 / Lab 2 / ..."
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Keyword</label>
          <input
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm font-mono"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="CHECKIN"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            คีย์เวิร์ดจะถูกใช้รวมกับ “รหัสนักศึกษา + รหัสวิชา” เพื่อสร้าง
            payload
          </p>
        </div>

        <div>
          <label className="block text-sm mb-1">วันที่สอน</label>
          <input
            type="date"
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">เริ่ม (datetime)</label>
          <input
            type="datetime-local"
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">หมดเวลาเช็กอิน (นาที)</label>
          <input
            type="number"
            min={1}
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกคาบ"}
        </button>
      </div>
    </form>
  );
}
