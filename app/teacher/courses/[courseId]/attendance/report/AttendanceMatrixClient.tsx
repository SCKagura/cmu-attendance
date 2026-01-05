"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Props = {
    course: any;
    attendances: any[];
};

export default function AttendanceMatrixClient({ course, attendances }: Props) {
    const [search, setSearch] = useState("");
    const [searchNo, setSearchNo] = useState("");
    const [filterSessionId, setFilterSessionId] = useState<string>("ALL");
    const [filterStatus, setFilterStatus] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // 1. Prepare data structure
    // Map: studentId -> { sessionId -> status }
    const attendanceMap = useMemo(() => {
        const map = new Map<string, Map<number, any>>();
        attendances.forEach((att) => {
            if (!map.has(att.studentId)) {
                map.set(att.studentId, new Map());
            }
            map.get(att.studentId)?.set(att.classSessionId, att);
        });
        return map;
    }, [attendances]);

    // 2. Prepare students with original index
    const studentsWithIndex = useMemo(() => {
        return course.enrollments.map((enrollment: any, index: number) => ({
            ...enrollment,
            originalIndex: index + 1
        }));
    }, [course.enrollments]);

    // 3. Filter students
    const filteredStudents = useMemo(() => {
        return studentsWithIndex.filter((enrollment: any) => {
            const s = enrollment.student;
            const fullName = `${s.displayNameTh || ""} ${s.displayNameEn || ""}`.toLowerCase();
            const code = (s.studentCode || "").toLowerCase();
            const searchLower = search.toLowerCase();
            const noString = enrollment.originalIndex.toString();

            // Search No.
            if (searchNo && !noString.startsWith(searchNo)) {
                return false;
            }

            // Search filter
            if (!fullName.includes(searchLower) && !code.includes(searchLower)) {
                return false;
            }

            // Status filter (complex because it depends on session context)
            // If filtering by specific session:
            if (filterSessionId !== "ALL") {
                const sid = Number(filterSessionId);
                const att = attendanceMap.get(s.id)?.get(sid);
                const isPresent = !!att;

                if (filterStatus === "PRESENT" && !isPresent) return false;
                if (filterStatus === "ABSENT" && isPresent) return false;
            }

            return true;
        });
    }, [studentsWithIndex, search, searchNo, filterSessionId, filterStatus, attendanceMap]);

    // 4. Columns (Sessions)
    const sessions = useMemo(() => {
        let filtered = course.classSessions;

        // Filter by specific session ID
        if (filterSessionId !== "ALL") {
            filtered = filtered.filter((s: any) => s.id === Number(filterSessionId));
        }

        // Filter by Date Range
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter((s: any) => new Date(s.date) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter((s: any) => new Date(s.date) <= end);
        }

        return filtered;
    }, [course.classSessions, filterSessionId, startDate, endDate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
            <div className="max-w-[95%] mx-auto">
                <div className="mb-6">
                    <Link
                        href={`/teacher/courses/${course.id}/attendance`}
                        className="text-white/80 hover:text-white flex items-center gap-2 transition-colors"
                    >
                        ← Back to Attendance
                    </Link>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20 mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2">
                        รายละเอียดการเช็คชื่อ (Attendance Matrix)
                    </h1>
                    <p className="text-white/80">
                        {course.courseCode} - {course.courseNameTh}
                    </p>

                    <div className="mt-6 grid gap-4 md:grid-cols-5">
                        {/* Search No */}
                        <div>
                            <label className="block text-xs text-white/60 mb-1">ค้นหาลำดับ (No.)</label>
                            <input
                                type="text"
                                value={searchNo}
                                onChange={(e) => setSearchNo(e.target.value)}
                                className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400"
                                placeholder="No..."
                            />
                        </div>

                        {/* Search */}
                        <div className="md:col-span-2">
                            <label className="block text-xs text-white/60 mb-1">ค้นหา (ชื่อ/รหัส)</label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400"
                                placeholder="Search Name or ID..."
                            />
                        </div>

                        {/* Session Filter */}
                        <div className="md:col-span-2">
                            <label className="block text-xs text-white/60 mb-1">เลือกคาบ</label>
                            <select
                                value={filterSessionId}
                                onChange={(e) => setFilterSessionId(e.target.value)}
                                className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400 [&>option]:bg-slate-800"
                            >
                                <option value="ALL">ทุกคาบ (All Sessions)</option>
                                {course.classSessions.map((s: any) => (
                                    <option key={s.id} value={s.id}>
                                        {new Date(s.date).toLocaleDateString("th-TH")} - {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range Filter */}
                        <div className="md:col-span-2 flex gap-2">
                            <div className="flex-1">
                                <label className="block text-xs text-white/60 mb-1">ตั้งแต่วันที่</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400 [color-scheme:dark]"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-white/60 mb-1">ถึงวันที่</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400 [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="md:col-span-2">
                            <label className="block text-xs text-white/60 mb-1">สถานะ (เฉพาะเมื่อเลือกคาบ)</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                disabled={filterSessionId === "ALL"}
                                className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400 disabled:opacity-50 [&>option]:bg-slate-800"
                            >
                                <option value="ALL">ทั้งหมด (All)</option>
                                <option value="PRESENT">มาเรียน (Present)</option>
                                <option value="ABSENT">ขาดเรียน (Absent)</option>
                            </select>
                        </div>

                        {/* Export Button */}
                        <div className="md:col-span-1 flex items-end">
                            <a
                                href={`/api/courses/${course.id}/attendance/report/export?startDate=${startDate}&endDate=${endDate}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium shadow-lg shadow-green-900/20 h-[42px]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export
                            </a>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-end text-white/80 text-sm">
                        Showing {filteredStudents.length} students
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-white border-collapse">
                            <thead>
                                <tr className="bg-white/10 border-b border-white/20">
                                    <th className="sticky left-0 z-30 bg-slate-900/90 backdrop-blur px-4 py-3 min-w-[60px] border-r border-white/10 text-center">
                                        No.
                                    </th>
                                    <th className="sticky left-[60px] z-30 bg-slate-900/90 backdrop-blur px-4 py-3 min-w-[100px] border-r border-white/10">
                                        รหัสนักศึกษา
                                    </th>
                                    <th className="sticky left-[160px] z-30 bg-slate-900/90 backdrop-blur px-4 py-3 min-w-[200px] border-r border-white/10">
                                        ชื่อ-นามสกุล
                                    </th>
                                    <th className="sticky left-[360px] z-30 bg-slate-900/90 backdrop-blur px-4 py-3 min-w-[80px] border-r border-white/10 text-center">
                                        Sec
                                    </th>
                                    {sessions.map((s: any) => (
                                        <th key={s.id} className="px-2 py-3 text-center min-w-[80px] border-r border-white/10">
                                            <div className="text-xs opacity-70">{new Date(s.date).toLocaleDateString("th-TH", { day: 'numeric', month: 'short' })}</div>
                                            <div className="text-[10px] opacity-50 truncate max-w-[80px]" title={s.name}>{s.name}</div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center min-w-[80px]">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((enrollment: any) => {
                                    const s = enrollment.student;
                                    const studentAtts = attendanceMap.get(s.id);

                                    let presentCount = 0;
                                    sessions.forEach((sess: any) => {
                                        if (studentAtts?.has(sess.id)) presentCount++;
                                    });
                                    const totalSessions = sessions.length;
                                    const percent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

                                    return (
                                        <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="sticky left-0 z-20 bg-slate-900/50 backdrop-blur px-4 py-2 text-center text-sm border-r border-white/10 font-mono">
                                                {enrollment.originalIndex}
                                            </td>
                                            <td className="sticky left-[60px] z-20 bg-slate-900/50 backdrop-blur px-4 py-2 font-mono text-sm border-r border-white/10">
                                                {s.studentCode}
                                            </td>
                                            <td className="sticky left-[160px] z-20 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm border-r border-white/10">
                                                {s.displayNameTh || s.displayNameEn || s.cmuAccount}
                                            </td>
                                            <td className="sticky left-[360px] z-20 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm text-center border-r border-white/10">
                                                {enrollment.section || "-"}
                                            </td>
                                            {sessions.map((sess: any) => {
                                                const att = studentAtts?.get(sess.id);
                                                const status = att?.status?.toUpperCase() || "";
                                                
                                                let emoji = "❌";
                                                let bgColor = "bg-red-500/10";
                                                let textColor = "text-red-400";
                                                
                                                if (att) {
                                                    if (status === "PRESENT") {
                                                        emoji = "✅";
                                                        bgColor = "bg-green-500/20";
                                                        textColor = "text-green-400";
                                                    } else if (status === "LATE") {
                                                        emoji = "⏰";
                                                        bgColor = "bg-yellow-500/20";
                                                        textColor = "text-yellow-400";
                                                    } else if (status === "LEAVE") {
                                                        emoji = "😷";
                                                        bgColor = "bg-blue-500/20";
                                                        textColor = "text-blue-400";
                                                    } else if (status === "ABSENT") {
                                                        emoji = "❌";
                                                        bgColor = "bg-red-500/10";
                                                        textColor = "text-red-400";
                                                    } else {
                                                        // Unknown status, treat as present
                                                        emoji = "✅";
                                                        bgColor = "bg-green-500/20";
                                                        textColor = "text-green-400";
                                                    }
                                                }
                                                
                                                return (
                                                    <td key={sess.id} className="px-2 py-2 text-center border-r border-white/10">
                                                        <span className={`inline-block w-6 h-6 rounded-full ${bgColor} ${textColor} flex items-center justify-center text-xs`}>
                                                            {emoji}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-2 text-center text-sm font-mono">
                                                <span className={percent < 50 ? "text-red-400" : percent < 80 ? "text-yellow-400" : "text-green-400"}>
                                                    {presentCount}/{totalSessions}
                                                </span>
                                                <div className="text-[10px] opacity-50">({percent}%)</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
