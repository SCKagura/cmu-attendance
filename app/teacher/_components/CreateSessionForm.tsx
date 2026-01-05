"use client";

import { useState } from "react";

export default function CreateSessionForm({ courseId }: { courseId: number }) {
  const [name, setName] = useState("Class");
  const [keyword, setKeyword] = useState("CHECKIN");
  
  // Helper to get local ISO string for datetime-local input
  const toLocalISO = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  // Default start time: current time rounded to nearest minute
  const [start, setStart] = useState<string>(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return toLocalISO(d);
  });

  // Default deadline: start time + 1.5 hours (90 minutes)
  const [deadline, setDeadline] = useState<string>(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 90);
    return toLocalISO(d);
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStart(val);
    
    // Auto-update deadline to 1.5 hours after new start time
    if (val) {
      const startDate = new Date(val);
      if (!isNaN(startDate.getTime())) {
        const deadlineDate = new Date(startDate.getTime() + 90 * 60000); // +90 mins
        setDeadline(toLocalISO(deadlineDate));
      }
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);

    try {
      const startDateTime = new Date(start);
      const startISO = startDateTime.toISOString();
      
      const deadlineDate = new Date(deadline);
      const deadlineISO = deadlineDate.toISOString();

      const res = await fetch(`/api/courses/${courseId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          keyword,
          date: startISO, // Use start datetime for the date
          startTime: startISO, // Use start datetime for the start time
          endTime: deadlineISO,
          expiresInMinutes: 0,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || `Create session failed (${res.status})`);
        return;
      }
      // Redirect to attendance page after successful creation
      window.location.href = `/teacher/courses/${courseId}/attendance`;
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
      className="space-y-4"
    >
      <h2 className="font-semibold mb-1 text-white">สร้างคาบใหม่</h2>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1 text-white/80">ชื่อคาบ</label>
          <input
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm text-white placeholder:text-neutral-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lecture 1 / Lab 2 / ..."
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-white/80">Keyword</label>
          <input
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm font-mono text-white placeholder:text-neutral-500"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="CHECKIN"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            คีย์เวิร์ดจะถูกใช้รวมกับ “รหัสนักศึกษา + รหัสวิชา” เพื่อสร้าง
            payload
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1 text-white/80">เวลาเริ่ม (Start Time)</label>
          <input
            type="datetime-local"
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm text-white"
            value={start}
            onChange={handleStartChange}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1 text-white/80">หมดเวลาเช็กอิน (Deadline)</label>
          <input
            type="datetime-local"
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm text-white"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกคาบ"}
        </button>
      </div>
    </form>
  );
}
