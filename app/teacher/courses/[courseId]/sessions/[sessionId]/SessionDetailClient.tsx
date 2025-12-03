"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Student = {
    id: string;
    studentCode: string;
    name: string;
};

type AttendanceRecord = {
    studentId: string;
    status: string;
    checkedAt: Date;
};

type Props = {
    courseId: number;
    sessionId: number;
    sessionName: string;
    sessionDate: Date;
    keyword: string;
    students: Student[];
    attendances: AttendanceRecord[];
    showDeleteButton?: boolean;
};

export default function SessionDetailClient({
    courseId,
    sessionId,
    sessionName,
    sessionDate,
    keyword,
    students,
    attendances,
    showDeleteButton = true,
}: Props) {
    const [filter, setFilter] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");
    const [search, setSearch] = useState("");

    // Map student ID to attendance status
    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceRecord>();
        attendances.forEach((a) => map.set(a.studentId, a));
        return map;
    }, [attendances]);

    const rows = useMemo(() => {
        return students.map((s) => {
            const att = attendanceMap.get(s.id);
            const isPresent = !!att;
            return {
                ...s,
                isPresent,
                status: isPresent ? 1 : 0,
                checkedAt: att?.checkedAt,
            };
        });
    }, [students, attendanceMap]);

    const filteredRows = useMemo(() => {
        return rows.filter((r) => {
            // Filter by status
            if (filter === "PRESENT" && !r.isPresent) return false;
            if (filter === "ABSENT" && r.isPresent) return false;

            // Filter by search
            if (search) {
                const q = search.toLowerCase();
                return (
                    r.studentCode.toLowerCase().includes(q) ||
                    r.name.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [rows, filter, search]);

    const presentCount = rows.filter((r) => r.isPresent).length;
    const absentCount = rows.length - presentCount;

    return (
        <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{sessionName}</h1>
                        <p className="text-white/70">
                            {sessionDate.toLocaleDateString("th-TH", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm text-white/60">Keyword:</span>
                            <code className="bg-black/30 px-2 py-1 rounded text-yellow-400 font-mono">
                                {keyword}
                            </code>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-4 text-center">
                            <div className="bg-green-500/20 p-3 rounded-xl border border-green-500/30 min-w-[100px]">
                                <div className="text-2xl font-bold text-green-400">
                                    {presentCount}
                                </div>
                                <div className="text-xs text-green-200/70 uppercase tracking-wider">
                                    Present
                                </div>
                            </div>
                            <div className="bg-red-500/20 p-3 rounded-xl border border-red-500/30 min-w-[100px]">
                                <div className="text-2xl font-bold text-red-400">
                                    {absentCount}
                                </div>
                                <div className="text-xs text-red-200/70 uppercase tracking-wider">
                                    Absent
                                </div>
                            </div>
                        </div>
                        {showDeleteButton && (
                            <button
                                onClick={async () => {
                                    if (!confirm("Are you sure you want to delete this session? This action cannot be undone.")) return;
                                    try {
                                        const res = await fetch(`/api/courses/${courseId}/sessions/${sessionId}`, {
                                            method: "DELETE"
                                        });
                                        if (res.ok) {
                                            window.location.href = `/teacher/courses/${courseId}/attendance`;
                                        } else {
                                            alert("Failed to delete session");
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert("Error deleting session");
                                    }
                                }}
                                className="px-4 py-2 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/40 border border-red-500/30 text-sm font-medium transition-colors"
                            >
                                🗑️ Delete Session
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter("ALL")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "ALL"
                                ? "bg-white text-purple-900"
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter("PRESENT")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "PRESENT"
                                ? "bg-green-500 text-white"
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                    >
                        Present
                    </button>
                    <button
                        onClick={() => setFilter("ABSENT")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "ABSENT"
                                ? "bg-red-500 text-white"
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                    >
                        Absent
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Search name or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 w-full sm:w-64"
                />
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-white">
                        <thead className="bg-white/10 border-b border-white/20">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Student ID</th>
                                <th className="px-6 py-4 font-semibold">Name</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                                <th className="px-6 py-4 font-semibold">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {filteredRows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="hover:bg-white/5 transition-colors"
                                >
                                    <td className="px-6 py-4 font-mono text-sm opacity-90">
                                        {row.studentCode}
                                    </td>
                                    <td className="px-6 py-4">{row.name}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span
                                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${row.status === 1
                                                    ? "bg-green-500 text-white"
                                                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                                                }`}
                                        >
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white/60">
                                        {row.checkedAt
                                            ? new Date(row.checkedAt).toLocaleTimeString("th-TH")
                                            : "-"}
                                    </td>
                                </tr>
                            ))}
                            {filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-white/50">
                                        No students found matching criteria
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end">
                <Link
                    href={`/teacher/courses/${courseId}/sessions/${sessionId}/payload`}
                    className="text-xs text-white/20 hover:text-white/50 transition-colors"
                >
                    View Payload (Secret)
                </Link>
            </div>
        </div>
    );
}
