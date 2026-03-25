"use client";

import React, { useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";

interface StudentPerformanceTableProps {
  studentsData: any[];
  title?: string;
  onViewDetails?: (id: string | null) => void; // เปลี่ยนมารับแค่ string | null
  selectedId?: string | null;
}

export default function StudentPerformanceTable({
  studentsData,
  title,
  onViewDetails,
  selectedId,
}: StudentPerformanceTableProps) {
  // กำหนดพิกเซลที่แน่นอนเพื่อใช้คำนวณตำแหน่ง Sticky
  const WIDTH = {
    action: 100,
    code: 120,
    name: 200,
  };

  const flattenedData = useMemo(() => {
    if (!studentsData || !Array.isArray(studentsData)) return [];
    return studentsData.map((student) => {
      const id = String(
        student.student_id || student.id || student.student_code,
      );
      const row: any = {
        id,
        Name: student.student_name || student.Name || "ไม่ทราบชื่อ",
        student_code: student.student_code || "Unknown",
      };

      const scoreTypes = [
        "ploPercentages",
        "ploScores",
        "cloPercentages",
        "cloScores",
        "categoryScores",
        "categoryPercentages",
      ];

      scoreTypes.forEach((type) => {
        if (Array.isArray(student[type])) {
          student[type].forEach((item: any) => {
            const key =
              item.plo_name ||
              item.clo_name ||
              item.category ||
              item.ploCode ||
              item.cloCode ||
              "Unknown";

            const scoreValue =
              item.percentage ??
              item.ploScore ??
              item.realScore ??
              item.cloScore ??
              item.score ??
              0;

            row[key] =
              typeof scoreValue === "number"
                ? scoreValue.toFixed(2)
                : scoreValue;
          });
        }
      });
      return row;
    });
  }, [studentsData]);

  const dynamicHeaders = useMemo(() => {
    if (flattenedData.length === 0) return [];
    return Object.keys(flattenedData[0])
      .filter((key) => !["Name", "student_code", "id"].includes(key))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [flattenedData]);

  // 🟢 ส่งกลับแค่ ID เพื่อให้ Parent ไปหา Data ตาม Mode ปัจจุบันเอง
  const handleToggle = (id: string) => {
    if (selectedId === id) {
      onViewDetails?.(null);
    } else {
      onViewDetails?.(id);
    }
  };

  if (!studentsData || flattenedData.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-6">
      {title && (
        <h3 className="text-lg font-bold mb-6 text-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-600 rounded-full inline-block"></span>
          {title}
        </h3>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 relative">
        <table className="w-full text-left border-separate border-spacing-0 table-auto">
          <thead>
            <tr className="bg-slate-50">
              {/* Show Graph Header */}
              <th
                style={{ left: 0, width: WIDTH.action, minWidth: WIDTH.action }}
                className="p-4 text-center text-xs font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-40 border-b border-slate-200"
              >
                Show Graph
              </th>

              {/* Code Header */}
              <th
                style={{
                  left: WIDTH.action,
                  width: WIDTH.code,
                  minWidth: WIDTH.code,
                }}
                className="p-4 text-xs font-bold text-slate-500 uppercase sticky z-40 bg-slate-50 border-b border-slate-200"
              >
                Code
              </th>

              {/* Name Header */}
              <th
                style={{
                  left: WIDTH.action + WIDTH.code,
                  width: WIDTH.name,
                  minWidth: WIDTH.name,
                }}
                className="p-4 text-xs font-bold text-slate-500 uppercase sticky z-40 bg-slate-50 border-b border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]"
              >
                Name
              </th>

              {dynamicHeaders.map((h) => (
                <th
                  key={h}
                  className="p-4 min-w-[100px] text-center text-xs font-bold text-slate-500 uppercase whitespace-nowrap border-b border-slate-200"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flattenedData.map((row) => {
              const isActive = selectedId === row.id;
              return (
                <tr
                  key={row.id}
                  className={`group transition-colors ${isActive ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  {/* Action Cell */}
                  <td
                    style={{ left: 0 }}
                    className={`p-3 sticky z-30 border-b border-slate-100 text-center transition-colors ${
                      isActive
                        ? "bg-blue-50"
                        : "bg-white group-hover:bg-slate-50"
                    }`}
                  >
                    <button
                      onClick={() => handleToggle(row.id)}
                      className={`p-2 rounded-full transition-all flex items-center justify-center mx-auto ${
                        isActive
                          ? "bg-slate-800 text-white shadow-md scale-110"
                          : "bg-white text-slate-400 border border-slate-200 hover:text-blue-500"
                      }`}
                    >
                      {isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </td>

                  {/* Code Cell */}
                  <td
                    style={{ left: WIDTH.action }}
                    className={`p-4 text-sm sticky z-30 border-b border-slate-100 transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "bg-white text-slate-500 group-hover:bg-slate-50"
                    }`}
                  >
                    {row.student_code}
                  </td>

                  {/* Name Cell */}
                  <td
                    style={{ left: WIDTH.action + WIDTH.code }}
                    className={`p-4 text-sm font-bold truncate sticky z-30 border-b border-slate-100 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0] transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-900"
                        : "bg-white text-slate-800 group-hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-[168px] truncate">{row.Name}</div>
                  </td>

                  {/* Data Cells */}
                  {dynamicHeaders.map((h) => (
                    <td
                      key={h}
                      className={`p-4 text-sm text-center min-w-[100px] border-b border-slate-100 ${isActive ? "font-bold text-blue-600" : "text-slate-600"}`}
                    >
                      {row[h]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
