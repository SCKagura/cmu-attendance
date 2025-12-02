"use client";

import { useMemo, useState, useTransition } from "react";

type Props = {
  courseId: number;
  compact?: boolean;
  onCreated?: (info: { sessionId: number; tokens: number }) => void;
};

function toLocalDateStr(d = new Date()) {
  // YYYY-MM-DD (local)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toLocalTimeStr(d = new Date()) {
  // HH:MM (local)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function combine(dateStr: string, timeStr: string) {
  // สร้าง Date จากวันที่+เวลาแบบ local
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const [hh, mm] = timeStr.split(":").map((x) => Number(x));
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function CreateSessionButton({ courseId, compact, onCreated }: Props) {
  const now = useMemo(() => new Date(), []);
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(toLocalDateStr(now));
  const [start, setStart] = useState(toLocalTimeStr(now));
  const [end, setEnd] = useState(
    toLocalTimeStr(new Date(now.getTime() + 2 * 3600000))
  );
  const [expireMin, setExpireMin] = useState(20);
  const [keyword, setKeyword] = useState("CHECKIN");
  const [name, setName] = useState<string>("Class");
  const [loading, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const submit = () => {
    setErr(null);
    setOkMsg(null);
    startTransition(async () => {
      try {
        const body = {
          name,
          keyword: keyword.trim(),
          date: combine(date, "00:00").toISOString(),
          startTime: combine(date, start).toISOString(),
          endTime: combine(date, end).toISOString(),
          expiresAt: new Date(Date.now() + expireMin * 60000).toISOString(),
        };
        const res = await fetch(`/api/courses/${courseId}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data.error || `สร้างคาบไม่สำเร็จ (status ${res.status})`);
          return;
        }
        setOkMsg(`สร้างคาบสำเร็จ (tokens: ${data.tokens})`);
        onCreated?.(data);
        // ปิดแล้วรีโหลดให้ลิสต์คาบอัพเดต
        setTimeout(() => {
          setOpen(false);
          if (typeof window !== "undefined") window.location.reload();
        }, 800);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setErr(e.message);
        } else if (typeof e === "string") {
          setErr(e);
        } else {
          setErr("Unknown error");
        }
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500"
            : "px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500"
        }
      >
        สร้างคาบ
      </button>
    );
  }

  return (
    <div className="border rounded-lg p-3 bg-neutral-900/40 w-full md:w-[560px]">
      <div className="font-medium mb-2">สร้างคาบใหม่</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">ชื่อคาบ</label>
          <input
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lecture 1 / Lab 2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Keyword</label>
          <div className="flex gap-2">
            <input
              className="flex-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="CHECKIN-1"
            />
            <button
              type="button"
              onClick={() => {
                const gen = Math.random()
                  .toString(36)
                  .substring(2, 8)
                  .toUpperCase();
                setKeyword(gen);
              }}
              className="px-3 py-1 rounded bg-sky-600 text-xs hover:bg-sky-500"
            >
              Generate
            </button>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            คีย์เวิร์ดนี้จะใช้ร่วมกับ “รหัสนักศึกษา + รหัสวิชา” เพื่อสร้าง
            payload
          </p>
        </div>

        <div>
          <label className="block text-sm mb-1">วันที่สอน</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">เริ่ม</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">สิ้นสุด</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">หมดเวลาเช็กอิน (นาที)</label>
          <input
            type="number"
            min={1}
            className="w-28 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
            value={expireMin}
            onChange={(e) => setExpireMin(Number(e.target.value || 0))}
          />
        </div>
      </div>

      {err && <p className="text-sm text-red-400 mt-2">{err}</p>}
      {okMsg && <p className="text-sm text-emerald-400 mt-2">{okMsg}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={submit}
          className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? "กำลังสร้าง..." : "บันทึกคาบ"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded bg-neutral-700 hover:bg-neutral-600"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
