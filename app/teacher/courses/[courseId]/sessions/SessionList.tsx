"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Session = {
  id: number;
  name: string;
  date: Date;
  keyword: string;
  _count: { attendances: number };
};

export default function SessionList({
  sessions,
  courseId,
  canManage,
}: {
  sessions: Session[];
  courseId: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(sessionId: number) {
    if (!confirm("Are you sure you want to delete this session?")) return;

    setDeletingId(sessionId);
    try {
      const res = await fetch(
        `/api/courses/${courseId}/sessions/${sessionId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete session");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting session");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ul className="divide-y divide-zinc-700 rounded border border-zinc-700">
      {sessions.map((s) => (
        <li key={s.id} className="p-3 flex items-center justify-between">
          <div>
            <div className="font-medium">{s.name ?? "Class"}</div>
            <div className="text-xs text-zinc-400">
              {new Date(s.date).toLocaleDateString()} • keyword: {s.keyword}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              เช็กชื่อแล้ว {s._count.attendances} คน
            </div>
            {canManage && (
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="text-xs bg-red-600/20 text-red-300 hover:bg-red-600/40 px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                {deletingId === s.id ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        </li>
      ))}
      {sessions.length === 0 && (
        <li className="p-4 text-sm text-zinc-400">ยังไม่มีคาบ</li>
      )}
    </ul>
  );
}
