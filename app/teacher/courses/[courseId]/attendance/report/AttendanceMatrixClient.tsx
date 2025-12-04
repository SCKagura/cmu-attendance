"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Props = {
    course: any;
    attendances: any[];
};

export default function AttendanceMatrixClient({ course, attendances }: Props) {
    const [search, setSearch] = useState("");
    const [filterSessionId, setFilterSessionId] = useState<string>("ALL");
    const [filterStatus, setFilterStatus] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");

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

    // 2. Filter students
    const filteredStudents = useMemo(() => {
        return course.enrollments.filter((enrollment: any) => {
            const s = enrollment.student;
            const fullName = `${s.displayNameTh || ""} ${s.displayNameEn || ""}`.toLowerCase();
            const code = (s.studentCode || "").toLowerCase();
            const searchLower = search.toLowerCase();

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
            } else {
                // If viewing ALL sessions, status filter might mean "Has at least one present" or "Has at least one absent"?
                // Usually matrix view shows all, but let's apply filter to "Any session match" logic or just disable it for ALL sessions?
                // Let's keep it simple: Status filter only applies when a specific session is selected OR 
                // we can filter rows that have *at least one* of that status? 
                // For now, let's disable status filter when Session is ALL to avoid confusion, or implement "Show if ANY session matches".
                // Let's implement: Show student if they match the criteria for the *selected* session. 
                // If ALL sessions selected, ignore status filter (or maybe filter by "Perfect Attendance" vs "Some Absence"? Too complex for now).
                if (filterStatus !== "ALL") {
                    // For simplicity in Matrix view, let's ignore status filter when showing ALL sessions
                    // or we could filter students who have *ever* been present/absent?
                    // Let's just ignore it for ALL sessions for now to keep matrix intact.
                }
            }

            return true;
        });
    }, [course.enrollments, search, filterSessionId, filterStatus, attendanceMap]);

    // 3. Columns (Sessions)
    const sessions = useMemo(() => {
        if (filterSessionId === "ALL") return course.classSessions;
        return course.classSessions.filter((s: any) => s.id === Number(filterSessionId));
    }, [course.classSessions, filterSessionId]);

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

                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                        {/* Search */}
                        <div>
                            <label className="block text-xs text-white/60 mb-1">ค้นหา (ชื่อ/รหัส)</label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-400"
                                placeholder="Search..."
                            />
                        </div>

                        {/* Session Filter */}
                        <div>
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

                        {/* Status Filter */}
                        <div>
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

                        {/* Summary Stats */}
                        <div className="flex items-center justify-end text-white/80 text-sm">
                            Showing {filteredStudents.length} students
                        </div>

                        {/* Export Button */}
                        <div className="md:col-span-4 flex justify-end">
                            <a
                                href={`/api/courses/${course.id}/attendance/report/export`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-lg shadow-green-900/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export Excel
                            </a>
                        </div>
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-white border-collapse">
                            <thead>
                                <tr className="bg-white/10 border-b border-white/20">
                                    <th className="sticky left-0 z-20 bg-slate-900/90 backdrop-blur px-4 py-3 min-w-[100px] border-r border-white/10">
                                        รหัสนักศึกษา
                                    </th>
                                    <th className="sticky left-[100px] z-20 bg-slate-900/90 backdrop-blur px-4 py-3 min-w-[200px] border-r border-white/10">
                                        ชื่อ-นามสกุล
                                    </th>
                                    <th className="sticky left-[300px] z-20 bg-slate-900/90 backdrop-blur px-4 py-3 min-w-[80px] border-r border-white/10">
                                        Section
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

                                    // Calculate total present for this student (across ALL sessions, or filtered sessions?)
                                    // Usually total should reflect the view.
                                    let presentCount = 0;
                                    sessions.forEach((sess: any) => {
                                        if (studentAtts?.has(sess.id)) presentCount++;
                                    });
                                    const totalSessions = sessions.length;
                                    const percent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

                                    return (
                                        <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="sticky left-0 z-10 bg-slate-900/50 backdrop-blur px-4 py-2 font-mono text-sm border-r border-white/10">
                                                {s.studentCode}
                                            </td>
                                            <td className="sticky left-[100px] z-10 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm border-r border-white/10">
                                                {s.displayNameTh || s.displayNameEn || s.cmuAccount}
                                            </td>
                                            <td className="sticky left-[300px] z-10 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm text-center border-r border-white/10">
                                                {enrollment.section || "-"}
                                            </td>
                                            {sessions.map((sess: any) => {
                                                const att = studentAtts?.get(sess.id);
                                                return (
                                                    <td key={sess.id} className="px-2 py-2 text-center border-r border-white/10">
                                                        {att ? (
                                                            <span className="inline-block w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs">
                                                                ✓
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block w-6 h-6 rounded-full bg-red-500/10 text-red-400/50 flex items-center justify-center text-xs">
                                                                •
                                                            </span>
                                                        )}
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
