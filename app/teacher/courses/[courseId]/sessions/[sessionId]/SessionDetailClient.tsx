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
    note?: string | null;
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
    const [filter, setFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "LATE" | "LEAVE">("ALL");
    const [search, setSearch] = useState("");
    const [editingStudent, setEditingStudent] = useState<any | null>(null);
    const [editStatus, setEditStatus] = useState("PRESENT");
    const [editNote, setEditNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);

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
                status: att?.status || "ABSENT",
                note: att?.note,
                checkedAt: att?.checkedAt,
            };
        });
    }, [students, attendanceMap]);

    const filteredRows = useMemo(() => {
        return rows.filter((r) => {
            // Filter by status
            if (filter !== "ALL") {
                if (filter === "PRESENT" && r.status !== "PRESENT") return false;
                if (filter === "ABSENT" && r.status !== "ABSENT") return false;
                if (filter === "LATE" && r.status !== "LATE") return false;
                if (filter === "LEAVE" && r.status !== "LEAVE") return false;
            }

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

    const presentCount = rows.filter((r) => r.status === "PRESENT").length;
    const lateCount = rows.filter((r) => r.status === "LATE").length;
    const leaveCount = rows.filter((r) => r.status === "LEAVE").length;
    const absentCount = rows.filter((r) => r.status === "ABSENT").length;

    const handleSaveAttendance = async () => {
        if (!editingStudent) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/courses/${courseId}/sessions/${sessionId}/attendance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: editingStudent.id,
                    status: editStatus,
                    note: editNote
                })
            });

            if (res.ok) {
                // Reload page to reflect changes (simple way)
                window.location.reload();
            } else {
                alert("Failed to update attendance");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating attendance");
        } finally {
            setIsSaving(false);
        }
    };

    const openEditModal = (student: any) => {
        setEditingStudent(student);
        setEditStatus(student.status === "ABSENT" ? "PRESENT" : student.status);
        setEditNote(student.note || "");
    };

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
                            <div className="bg-purple-500/20 p-3 rounded-xl border border-purple-500/30 min-w-[80px]">
                                <div className="text-2xl font-bold text-purple-400">
                                    {students.length}
                                </div>
                                <div className="text-xs text-purple-200/70 uppercase tracking-wider">
                                    All
                                </div>
                            </div>
                            <div className="bg-green-500/20 p-3 rounded-xl border border-green-500/30 min-w-[80px]">
                                <div className="text-2xl font-bold text-green-400">
                                    {presentCount}
                                </div>
                                <div className="text-xs text-green-200/70 uppercase tracking-wider">
                                    Present
                                </div>
                            </div>
                            <div className="bg-yellow-500/20 p-3 rounded-xl border border-yellow-500/30 min-w-[80px]">
                                <div className="text-2xl font-bold text-yellow-400">
                                    {lateCount}
                                </div>
                                <div className="text-xs text-yellow-200/70 uppercase tracking-wider">
                                    Late
                                </div>
                            </div>
                            <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-500/30 min-w-[80px]">
                                <div className="text-2xl font-bold text-blue-400">
                                    {leaveCount}
                                </div>
                                <div className="text-xs text-blue-200/70 uppercase tracking-wider">
                                    Leave
                                </div>
                            </div>
                            <div className="bg-red-500/20 p-3 rounded-xl border border-red-500/30 min-w-[80px]">
                                <div className="text-2xl font-bold text-red-400">
                                    {absentCount}
                                </div>
                                <div className="text-xs text-red-200/70 uppercase tracking-wider">
                                    Absent
                                </div>
                            </div>
                        </div>
                        <a
                            href={`/api/courses/${courseId}/sessions/${sessionId}/export`}
                            download
                            className="px-4 py-2 rounded-lg bg-green-600/20 text-green-300 hover:bg-green-600/40 border border-green-500/30 text-sm font-medium transition-colors text-center"
                        >
                            📊 Export to Excel
                        </a>
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
                        onClick={() => setFilter("LATE")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "LATE"
                                ? "bg-yellow-500 text-white"
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                    >
                        Late
                    </button>
                    <button
                        onClick={() => setFilter("LEAVE")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "LEAVE"
                                ? "bg-blue-500 text-white"
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                    >
                        Leave
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
                                <th className="px-6 py-4 font-semibold">Note</th>
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
                                        <button
                                            onClick={() => openEditModal(row)}
                                            className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-xs transition-transform hover:scale-105 ${
                                                row.status === "PRESENT"
                                                    ? "bg-green-500 text-white"
                                                    : row.status === "LATE"
                                                    ? "bg-yellow-500 text-white"
                                                    : row.status === "LEAVE"
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                                            }`}
                                        >
                                            {row.status}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white/80 max-w-[200px] truncate" title={row.note || ""}>
                                        {row.note || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white/60">
                                        {row.checkedAt
                                            ? new Date(row.checkedAt).toLocaleString("th-TH", {
                                                dateStyle: "short",
                                                timeStyle: "medium",
                                            })
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


            {/* Edit Modal */}
            {editingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">
                            Edit Attendance: {editingStudent.name}
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {["PRESENT", "LATE", "LEAVE", "ABSENT"].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setEditStatus(s)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                editStatus === s
                                                    ? s === "PRESENT" ? "bg-green-600 text-white"
                                                    : s === "LATE" ? "bg-yellow-600 text-white"
                                                    : s === "LEAVE" ? "bg-blue-600 text-white"
                                                    : "bg-red-600 text-white"
                                                    : "bg-white/10 text-white hover:bg-white/20"
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-white/60 mb-2">Note (Optional)</label>
                                <textarea
                                    value={editNote}
                                    onChange={(e) => setEditNote(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400 min-h-[80px]"
                                    placeholder="Add a note..."
                                />
                            </div>

                            <div className="flex gap-3 justify-end mt-6">
                                <button
                                    onClick={() => setEditingStudent(null)}
                                    className="px-4 py-2 rounded-lg text-white/60 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveAttendance}
                                    disabled={isSaving}
                                    className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
