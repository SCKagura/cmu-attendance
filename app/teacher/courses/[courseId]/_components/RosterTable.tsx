"use client";

import { useState } from "react";

type EnrollmentRow = {
  section: string | null;
  labSection: string | null;
  importIndex: number | null;
  student: {
    studentCode: string | null;
    displayNameTh: string | null;
    displayNameEn: string | null;
    cmuEmail: string | null;
  };
};

export default function RosterTable({
  enrollments,
}: {
  enrollments: EnrollmentRow[];
}) {
  const [searchNo, setSearchNo] = useState("");
  const [searchText, setSearchText] = useState("");

  const filtered = enrollments.filter((e) => {
    const sNo = searchNo.trim();
    const sText = searchText.toLowerCase().trim();

    const no = (e.importIndex ?? "").toString();
    const code = (e.student.studentCode ?? "").toLowerCase();
    const nameTh = (e.student.displayNameTh ?? "").toLowerCase();
    const nameEn = (e.student.displayNameEn ?? "").toLowerCase();
    
    const matchNo = sNo === "" || no.includes(sNo);
    const matchText = sText === "" || code.includes(sText) || nameTh.includes(sText) || nameEn.includes(sText);

    return matchNo && matchText;
  });

  return (
    <div className="space-y-4">
      {/* Search Bars */}
      <div className="flex justify-end gap-2">
        <div className="relative">
            <input
                type="text"
                placeholder="Search No..."
                value={searchNo}
                onChange={(e) => setSearchNo(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors w-32"
            />
        </div>
        <div className="relative">
            <input
                type="text"
                placeholder="Search ID, Name..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors w-64"
            />
            <svg className="w-5 h-5 text-white/40 absolute right-3 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-white">
            <thead className="bg-white/10 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-semibold w-16">No.</th>
                <th className="px-6 py-4 font-semibold">Student ID</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">SecLec</th>
                <th className="px-6 py-4 font-semibold">SecLab</th>
                <th className="px-6 py-4 font-semibold">CMU Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map((e, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white/50">{e.importIndex ?? "-"}</td>
                  <td className="px-6 py-4 font-mono text-white/90">{e.student.studentCode ?? "-"}</td>
                  <td className="px-6 py-4 text-white/90">
                    {e.student.displayNameTh ?? e.student.displayNameEn ?? "-"}
                  </td>
                  <td className="px-6 py-4 text-white/90">{e.section ?? "-"}</td>
                  <td className="px-6 py-4 text-white/90">{e.labSection ?? "-"}</td>
                  <td className="px-6 py-4 text-white/70">{e.student.cmuEmail ?? "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                    {enrollments.length === 0 ? "No students enrolled yet" : "No matching students found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
