import React, { useState, useMemo } from "react";
import { User, ChevronRight, Search, Hash, GraduationCap } from "lucide-react";

interface Student {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface StudentTableProps {
  students: Student[];
  onSelectStudent?: (id: string) => void; // 🟢 เพิ่ม Prop นี้เข้าไป
}

export const StudentTable = ({
  students,
  onSelectStudent,
}: StudentTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_code.includes(searchTerm),
    );
  }, [students, searchTerm]);

  if (!students || students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 mt-8">
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 mb-3">
          <User size={32} strokeWidth={1.5} />
        </div>
        <p className="text-slate-500 font-semibold">
          No students in this program
        </p>
        <p className="text-slate-400 text-xs">
          Waiting for data synchronization...
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* 🟢 Header & Search Section: ปรับให้กะทัดรัดและ Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-xl text-white shadow-sm shrink-0">
            <GraduationCap size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">
              Student Directory
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              <span className="text-slate-600 font-bold">
                {students.length}
              </span>{" "}
              Total Students
            </p>
          </div>
        </div>

        {/* Search Input: กว้างขึ้นใน Mobile และคงที่ใน Desktop */}
        <div className="relative group w-full sm:w-64">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Quick search..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-xl text-sm transition-all outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 🟢 Table Container: ปรับปรุงการเลื่อน (Scrolling) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* เปลี่ยน max-h เป็นค่าที่เหมาะสม หรือเอาออกถ้าต้องการให้ Scroll ตามหน้าหลัก 
          ในที่นี้ปรับเป็น 400px และทำให้ Scrollbar ดูเรียบง่ายที่สุด
      */}
        <div className="overflow-x-auto overflow-y-auto max-h-[420px] scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="bg-slate-50/95 backdrop-blur-sm px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  Full Name
                </th>
                <th className="bg-slate-50/95 backdrop-blur-sm px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  ID Code
                </th>
                <th className="bg-slate-50/95 backdrop-blur-sm px-5 py-3 text-right border-b border-slate-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => onSelectStudent?.(student.id)}
                    className="group hover:bg-slate-50/80 transition-all cursor-pointer"
                  >
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {/* Avatar แบบจิ๋ว: ช่วยให้มองเห็นง่ายแต่ไม่รก */}
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px] border border-slate-200 group-hover:bg-indigo-100 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all uppercase">
                          {student.first_name[0]}
                          {student.last_name[0]}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                          {student.first_name} {student.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="font-mono text-[13px] font-medium text-slate-400 group-hover:text-slate-600">
                        {student.student_code}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ChevronRight
                        size={16}
                        className="inline-block text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    <p className="text-xs font-medium italic">
                      No results for "{searchTerm}"
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🟢 Footer Info: ลดขนาดลงเพื่อไม่ให้กวนสายตา */}
      <div className="flex items-center justify-between px-1 opacity-60">
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] ml-6">
          End of results
        </span>
        <span className="text-[9px] text-slate-400 font-bold mr-8">
          Showing {filteredStudents.length} of {students.length}
        </span>
      </div>
    </div>
  );
};
