type EnrollmentRow = {
  section: string | null;
  labSection: string | null;
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
  return (
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
            {enrollments.map((e, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-white/50">{i + 1}</td>
                <td className="px-6 py-4 font-mono text-white/90">{e.student.studentCode ?? "-"}</td>
                <td className="px-6 py-4 text-white/90">
                  {e.student.displayNameTh ?? e.student.displayNameEn ?? "-"}
                </td>
                <td className="px-6 py-4 text-white/90">{e.section ?? "-"}</td>
                <td className="px-6 py-4 text-white/90">{e.labSection ?? "-"}</td>
                <td className="px-6 py-4 text-white/70">{e.student.cmuEmail ?? "-"}</td>
              </tr>
            ))}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                  No students enrolled yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
