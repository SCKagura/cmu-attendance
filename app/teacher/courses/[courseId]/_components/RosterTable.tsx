type EnrollmentRow = {
  student: {
    studentCode: string | null;
    displayNameTh: string | null;
    displayNameEn: string | null;
    cmuAccount: string | null;
  };
};

export default function RosterTable({
  enrollments,
}: {
  enrollments: EnrollmentRow[];
}) {
  return (
    <div className="overflow-x-auto rounded border border-zinc-700">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-800 text-zinc-200">
          <tr>
            <th className="px-3 py-2 text-left">SID</th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Account</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e, i) => (
            <tr key={i} className="border-t border-zinc-800">
              <td className="px-3 py-2">{e.student.studentCode ?? "-"}</td>
              <td className="px-3 py-2">
                {e.student.displayNameTh ?? e.student.displayNameEn ?? "-"}
              </td>
              <td className="px-3 py-2">{e.student.cmuAccount ?? "-"}</td>
            </tr>
          ))}
          {enrollments.length === 0 && (
            <tr>
              <td colSpan={3} className="px-3 py-6 text-center text-zinc-400">
                ยังไม่มีรายชื่อ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
