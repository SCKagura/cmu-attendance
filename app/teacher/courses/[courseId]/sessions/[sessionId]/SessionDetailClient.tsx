"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Student = {
    id: string;
    studentCode: string;
    name: string;
    section: string;
    labSection: string;
    importIndex: number;
};

type AttendanceRecord = {
    studentId: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
    note?: string | null;
    checkedAt: Date;
    payloadRaw?: string | null;
    ip?: string | null;
    deviceInfo?: string | null;
    scanner: {
        displayNameTh: string | null;
        displayNameEn: string | null;
        cmuAccount: string;
    } | null;
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
    showExportButton?: boolean;
    readOnly?: boolean;
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
    showExportButton = true,
    readOnly = false,
}: Props) {
    const [filter, setFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "LATE" | "LEAVE">("ALL");
    const [search, setSearch] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState<any>(null);

    // Map attendance by studentId
    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceRecord>();
        attendances.forEach((a) => map.set(a.studentId, a));
        return map;
    }, [attendances]);

    // Combine student + attendance
    const rows = useMemo(() => {
        return students.map((s) => {
            const att = attendanceMap.get(s.id);
            return {
                ...s,
                status: att ? att.status : "ABSENT",
                checkedAt: att ? att.checkedAt : null,
                scanner: att ? att.scanner : null,
                payloadRaw: att?.payloadRaw,
                ip: att?.ip,
                deviceInfo: att?.deviceInfo,
                note: att?.note || null,
            };
        });
    }, [students, attendanceMap]);

    // Filter & Search
    const filteredRows = useMemo(() => {
        return rows.filter((r) => {
            const matchesFilter = filter === "ALL" || r.status === filter;
            const matchesSearch =
                r.name.toLowerCase().includes(search.toLowerCase()) ||
                r.studentCode.includes(search);
            return matchesFilter && matchesSearch;
        });
    }, [rows, filter, search]);

    // Stats
    const stats = useMemo(() => {
        const total = students.length;
        const present = rows.filter((r) => r.status === "PRESENT").length;
        const late = rows.filter((r) => r.status === "LATE").length;
        const leave = rows.filter((r) => r.status === "LEAVE").length;
        const absent = rows.filter((r) => r.status === "ABSENT").length;
        return { total, present, late, leave, absent };
    }, [students.length, rows]);

    const handleSaveAttendance = async (status: string, note: string) => {
        if (!selectedAttendance) return;

        try {
            const res = await fetch(
                `/api/courses/${courseId}/sessions/${sessionId}/attendance`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        studentId: selectedAttendance.id,
                        status,
                        note,
                    }),
                }
            );

            if (!res.ok) throw new Error("Failed to update");

            // Refresh page
            window.location.reload();
        } catch (err) {
            alert("Error updating attendance");
        }
    };

    const openEditModal = (row: any) => {
        if (readOnly) return;
        setSelectedAttendance(row);
        setIsEditModalOpen(true);
    };

    const openLogModal = (row: any) => {
        if (!row.checkedAt) return; // Only if attended
        setSelectedAttendance(row);
        setIsLogModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
                    <h1 className="text-3xl font-bold text-white mb-2">{sessionName}</h1>
                    <p className="text-white/60">
                        {new Date(sessionDate).toLocaleDateString("th-TH", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                    <div className="mt-4 flex items-center gap-4">
                        <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                            <span className="text-white/40 text-sm block">Keyword</span>
                            <span className="text-xl font-mono text-emerald-400 font-bold tracking-wider">
                                {keyword}
                            </span>
                        </div>
                        {showExportButton && (
                            <a
                                href={`/api/courses/${courseId}/sessions/${sessionId}/export`}
                                target="_blank"
                                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                            >
                                📊 Export to Excel
                            </a>
                        )}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total - Left Column */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 flex flex-col items-center justify-center h-full min-h-[140px]">
                        <span className="text-5xl font-bold text-white mb-2">
                            {stats.total}
                        </span>
                        <span className="text-white/60 text-lg">Total Students</span>
                    </div>

                    {/* Statuses - Right 2x2 Grid */}
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div className="bg-emerald-500/10 backdrop-blur-lg rounded-2xl p-4 border border-emerald-500/20 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-emerald-400">
                                {stats.present}
                            </span>
                            <span className="text-emerald-200/60 text-sm">Present</span>
                        </div>
                        <div className="bg-red-500/10 backdrop-blur-lg rounded-2xl p-4 border border-red-500/20 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-red-400">
                                {stats.absent}
                            </span>
                            <span className="text-red-200/60 text-sm">Absent</span>
                        </div>
                        <div className="bg-yellow-500/10 backdrop-blur-lg rounded-2xl p-4 border border-yellow-500/20 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-yellow-400">
                                {stats.late}
                            </span>
                            <span className="text-yellow-200/60 text-sm">Late</span>
                        </div>
                        <div className="bg-blue-500/10 backdrop-blur-lg rounded-2xl p-4 border border-blue-500/20 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-blue-400">
                                {stats.leave}
                            </span>
                            <span className="text-blue-200/60 text-sm">Leave</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    {(["ALL", "PRESENT", "ABSENT", "LATE", "LEAVE"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                filter === f
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "text-white/40 hover:text-white/80"
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Search student..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 pl-10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <svg
                        className="w-5 h-5 text-white/30 absolute left-3 top-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-black/20 text-white/60 text-sm uppercase tracking-wider">
                                <th className="px-6 py-4 text-left font-medium">No.</th>
                                <th className="px-6 py-4 text-left font-medium">SECLEC</th>
                                <th className="px-6 py-4 text-left font-medium">SECLAB</th>
                                <th className="px-6 py-4 text-left font-medium">Student ID</th>
                                <th className="px-6 py-4 text-left font-medium">Name</th>
                                <th className="px-6 py-4 text-center font-medium">Status</th>
                                <th className="px-6 py-4 text-left font-medium">Scanner</th>
                                <th className="px-6 py-4 text-left font-medium">Note</th>
                                <th className="px-6 py-4 text-left font-medium">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {filteredRows.map((row, index) => (
                                <tr
                                    key={row.id}
                                    className="text-white hover:bg-white/5 transition-colors"
                                >
                                    <td className="px-6 py-4 text-white/60">{row.importIndex || (index + 1)}</td>
                                    <td className="px-6 py-4">{row.section || "-"}</td>
                                    <td className="px-6 py-4">{row.labSection || "-"}</td>
                                    <td className="px-6 py-4 font-mono text-emerald-300">
                                        {row.studentCode}
                                    </td>
                                    <td className="px-6 py-4">{row.name}</td>
                                    <td className="px-6 py-4 text-center">
                                        {readOnly ? (
                                            <span
                                                className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-xs ${
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
                                            </span>
                                        ) : (
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
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white/80">
                                        <div className="flex items-center gap-2">
                                            <span>
                                                {row.scanner
                                                    ? row.scanner.displayNameTh ||
                                                      row.scanner.displayNameEn ||
                                                      row.scanner.cmuAccount
                                                    : "-"}
                                            </span>
                                            {row.scanner && (
                                                <button
                                                    onClick={() => openLogModal(row)}
                                                    className="text-blue-400 hover:text-blue-300"
                                                    title="View Scan Log"
                                                >
                                                    ℹ️
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white/80 max-w-[200px] truncate" title={row.note || ""}>
                                        {row.note || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white/40">
                                        {row.checkedAt
                                            ? new Date(row.checkedAt).toLocaleString("th-TH")
                                            : "-"}
                                    </td>
                                </tr>
                            ))}
                            {filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-white/40">
                                        No students found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 bg-black/20 border-t border-white/10 text-sm text-white/40 flex justify-between">
                    <span>Total Students: {stats.total}</span>
                    <span>
                        Showing {filteredRows.length} of {rows.length}
                    </span>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && selectedAttendance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">
                            Edit Attendance: {selectedAttendance.name}
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-2">Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["PRESENT", "LATE", "LEAVE", "ABSENT"] as const).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleSaveAttendance(status, selectedAttendance.note || "")}
                                            className={`px-4 py-2 rounded-lg font-bold text-sm border transition-all ${
                                                status === "PRESENT" ? "bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30" :
                                                status === "LATE" ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 hover:bg-yellow-500/30" :
                                                status === "LEAVE" ? "bg-blue-500/20 border-blue-500 text-blue-400 hover:bg-blue-500/30" :
                                                "bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30"
                                            }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-2">Note</label>
                                <textarea
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                                    rows={3}
                                    placeholder="Add a note..."
                                    defaultValue={selectedAttendance.note || ""}
                                    id="note-input"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                         const note = (document.getElementById("note-input") as HTMLTextAreaElement).value;
                                         handleSaveAttendance(selectedAttendance.status, note);
                                    }}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg shadow-purple-500/20 transition-all"
                                >
                                    Save Note Only
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Modal */}
            {isLogModalOpen && selectedAttendance && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl relative">
                        <button
                            onClick={() => setIsLogModalOpen(false)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white"
                        >
                            ✕
                        </button>
                        <h3 className="text-xl font-bold text-white mb-4">
                            Scan Audit Log: {selectedAttendance.name}
                        </h3>

                        <div className="space-y-4 text-sm font-mono">
                            <div className="bg-black/40 p-4 rounded-lg border border-white/5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-white/40 block">Scanner Name</span>
                                        <span className="text-white font-medium">
                                            {selectedAttendance.scanner?.displayNameTh || selectedAttendance.scanner?.cmuAccount}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-white/40 block">Timestamp</span>
                                        <span className="text-white font-medium">
                                            {new Date(selectedAttendance.checkedAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-white/40 block">IP Address</span>
                                        <span className="text-emerald-400">
                                            {selectedAttendance.ip || "Unknown"}
                                        </span>
                                    </div>
                                    <div className="overflow-hidden">
                                        <span className="text-white/40 block">Device / App</span>
                                        <span className="text-white/80 truncate block" title={selectedAttendance.deviceInfo || ""}>
                                            {selectedAttendance.deviceInfo || "Unknown"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <span className="text-white/40 block mb-2">Raw Payload Data</span>
                                <div className="bg-black p-4 rounded-lg border border-green-900/30 text-green-400 overflow-auto max-h-60">
                                    <pre className="whitespace-pre-wrap break-all">
                                        {selectedAttendance.payloadRaw
                                            ? JSON.stringify(JSON.parse(selectedAttendance.payloadRaw), null, 2)
                                            : "No payload data"}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setIsLogModalOpen(false)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            >
                                Close Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
