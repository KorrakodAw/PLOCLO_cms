"use client";

export const StudentTableSection = ({
  group,
  selectedCandidates,
  setSelectedCandidates,
}: any) => {
  const isAllSelected = group.students.every((s: any) =>
    selectedCandidates.includes(s.id),
  );

  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm mb-4">
      <div className="bg-slate-50/50 px-4 py-2 border-b flex justify-between items-center">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {group.programName}
        </span>
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={(e) => {
            const ids = group.students.map((s: any) => s.id);
            if (e.target.checked)
              setSelectedCandidates((prev: any) =>
                Array.from(new Set([...prev, ...ids])),
              );
            else
              setSelectedCandidates((prev: any) =>
                prev.filter((id: any) => !ids.includes(id)),
              );
          }}
        />
      </div>
      <table className="w-full">
        <tbody className="divide-y divide-slate-50">
          {group.students.map((s: any) => (
            <tr key={s.id} className="hover:bg-blue-50/20">
              <td className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedCandidates.includes(s.id)}
                  onChange={() =>
                    setSelectedCandidates((prev: any) =>
                      prev.includes(s.id)
                        ? prev.filter((id: any) => id !== s.id)
                        : [...prev, s.id],
                    )
                  }
                />
              </td>
              <td className="p-3 text-xs font-mono text-slate-400">
                {s.student_code}
              </td>
              <td className="p-3 text-sm font-medium text-slate-700">
                {s.first_name} {s.last_name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
