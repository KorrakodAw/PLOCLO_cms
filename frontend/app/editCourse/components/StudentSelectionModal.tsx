import React, { useState, useEffect, useMemo } from "react";

interface Student {
  id: number;
  student_code: string;
  first_name: string;
  last_name: string;
}

interface ProgramGroup {
  programId: number;
  programNameEn: string;
  programShortNameEn: string;
  programYear: string;
  students: Student[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableStudents: ProgramGroup[];
  onConfirm: (selectedIds: number[]) => void;
  loading?: boolean;
}

const StudentSelectionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  availableStudents,
  onConfirm,
  loading = false,
}) => {
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ป้องกันการเลื่อนหน้าหลังเมื่อ Modal เปิด
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // ตั้งค่า Tab เริ่มต้น
  useEffect(() => {
    if (availableStudents.length > 0 && !activeTab) {
      setActiveTab(availableStudents[0].programId);
    }
  }, [availableStudents, activeTab]);

  // กรองรายชื่อนักศึกษาตามช่องค้นหา (Search)
  const filteredStudents = useMemo(() => {
    const currentGroup = availableStudents.find(
      (g) => g.programId === activeTab,
    );
    if (!currentGroup) return [];

    return currentGroup.students.filter(
      (s) =>
        s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.student_code.includes(searchQuery),
    );
  }, [activeTab, availableStudents, searchQuery]);

  if (!isOpen) return null;

  const handleToggleStudent = (id: number) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAllInProgram = (isChecked: boolean) => {
    const ids = filteredStudents.map((s) => s.id);
    if (isChecked) {
      setSelectedCandidates((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      setSelectedCandidates((prev) => prev.filter((id) => !ids.includes(id)));
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={loading ? undefined : onClose}
      />

      {/* Main Modal Container - ปรับความสูงเป็น h-[85vh] เพื่อให้พื้นที่เยอะขึ้น */}
      <div className="relative bg-white rounded-[32px] w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* 1. Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              Select Students
            </h3>
            <p className="text-slate-400 font-medium text-sm">
              Choose candidates from available programs
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-3xl text-slate-300 hover:text-slate-600 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* 2. Tabs Navigation */}
        <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50/50 px-8 py-3 gap-3 shrink-0">
          {availableStudents.map((group) => (
            <button
              key={group.programId}
              onClick={() => {
                setActiveTab(group.programId);
                setSearchQuery("");
              }}
              className={`px-6 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === group.programId
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                  : "bg-white border border-slate-200 text-slate-500 hover:text-blue-500"
              }`}
            >
              {group.programShortNameEn} {group.programYear}
            </button>
          ))}
        </div>

        {/* 3. Search Bar Area */}
        <div className="px-10 py-4 bg-white border-b border-slate-50 shrink-0">
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by name or student code..."
              className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 4. Body Content - มี Scroll ภายใน */}
        <div className="flex-1 overflow-y-auto p-10 pt-0 bg-white">
          {availableStudents.map((group) => {
            if (activeTab !== group.programId) return null;

            const isAllSelected =
              filteredStudents.length > 0 &&
              filteredStudents.every((s) => selectedCandidates.includes(s.id));

            return (
              <div
                key={group.programId}
                className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {/* Sticky Program Header */}
                <div className="sticky top-0 z-20 bg-slate-800 text-white px-8 py-4 rounded-t-[20px] flex justify-between items-center shadow-lg">
                  <span className="text-sm font-bold tracking-widest uppercase opacity-80">
                    {group.programNameEn}
                  </span>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <span className="text-[10px] font-black group-hover:text-blue-400 transition-colors">
                      SELECT ALL IN VIEW
                    </span>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-none bg-white/20 text-blue-500"
                      checked={isAllSelected}
                      onChange={(e) =>
                        handleSelectAllInProgram(e.target.checked)
                      }
                    />
                  </label>
                </div>

                {/* Students Table */}
                <div className="overflow-hidden border-x border-b border-slate-100 rounded-b-[20px]">
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-50">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((s) => (
                          <tr
                            key={s.id}
                            onClick={() => handleToggleStudent(s.id)}
                            className={`group cursor-pointer transition-colors ${
                              selectedCandidates.includes(s.id)
                                ? "bg-blue-50/50"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="p-5 w-16 text-center">
                              <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-slate-300 text-blue-600"
                                checked={selectedCandidates.includes(s.id)}
                                readOnly
                              />
                            </td>
                            <td className="p-5 text-base font-mono font-bold text-slate-400 w-44">
                              {s.student_code}
                            </td>
                            <td className="p-5 text-xl font-bold text-slate-700">
                              {s.first_name} {s.last_name}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="p-10 text-center text-slate-400 font-medium italic"
                          >
                            No students found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. Footer */}
        <div className="px-10 py-8 border-t border-slate-100 flex justify-between items-center bg-slate-50/30 shrink-0">
          <div className="flex flex-col">
            <span className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">
              Selection Count
            </span>
            <span className="text-3xl font-black text-slate-800">
              {selectedCandidates.length}{" "}
              <span className="text-blue-600 font-medium text-xl italic">
                Students
              </span>
            </span>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-8 py-4 text-slate-500 font-bold hover:bg-white rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(selectedCandidates)}
              disabled={loading || selectedCandidates.length === 0}
              className={`px-10 py-4 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 ${
                selectedCandidates.length > 0
                  ? "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              {loading ? "Adding..." : "Confirm & Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSelectionModal;
