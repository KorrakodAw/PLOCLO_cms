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
    <div className="mt-8 space-y-5 ">
      {/* Header & Search Group */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500 rounded-lg text-white">
              <GraduationCap size={20} />
            </div>
            Student Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Manage and view performance of{" "}
            <span className="text-indigo-600 font-bold">{students.length}</span>{" "}
            enrolled students
          </p>
        </div>

        <div className="relative group">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Quick search..."
            className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-2xl text-sm transition-all outline-none w-full md:w-72 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden transition-all">
        <div className="max-h-[500px] overflow-y-auto scrollbar-hide hover:scrollbar-default">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="bg-slate-50/90 backdrop-blur-md px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] border-b border-slate-100">
                  Student Info
                </th>
                <th className="bg-slate-50/90 backdrop-blur-md px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] border-b border-slate-100">
                  Student Code
                </th>
                <th className="bg-slate-50/90 backdrop-blur-md px-6 py-4 text-right border-b border-slate-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => onSelectStudent?.(student.id)}
                    className="group hover:bg-indigo-50/30 transition-all cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {/* Avatar Simulation: เพิ่มสีสันให้ตาราง */}
                        {/* <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs border border-white shadow-sm group-hover:from-indigo-100 group-hover:to-indigo-200    group-hover:text-indigo-600 transition-colors">
                          {student.first_name[0]}
                          {student.last_name[0]}
                        </div> */}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">
                            {student.first_name} {student.last_name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 group-hover:bg-white group-hover:text-indigo-500 transition-all border border-transparent group-hover:border-indigo-100">
                        <Hash size={12} />
                        {student.student_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex p-2 bg-transparent group-hover:bg-white rounded-xl text-slate-300 group-hover:text-indigo-500 group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-100">
                        <ChevronRight size={18} strokeWidth={3} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-20 text-center text-slate-400"
                  >
                    <p className="text-sm font-medium italic">
                      No matches found for "{searchTerm}"
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between px-2">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          End of List
        </p>
        <p className="text-[10px] text-slate-400 font-bold">
          {filteredStudents.length} Students Displayed
        </p>
      </div>
    </div>
  );
};
