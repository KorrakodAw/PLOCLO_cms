"use client";

import React, { useMemo } from "react";

interface StudentPerformanceTableProps {
  studentsData: any[];
  title?: string;
  onViewDetails?: (data: any | null) => void; // เปลี่ยนจาก string เป็น any เพื่อรับ object
  selectedId?: string | null;
}

export default function StudentPerformanceTable({
  studentsData,
  title,
  onViewDetails,
  selectedId,
}: StudentPerformanceTableProps) {
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
              item.percentage || item.ploScore || item.realScore || item.cloScore || 0;
            row[key] =
              typeof scoreValue === "number"
                ? scoreValue.toFixed(2)
                : (scoreValue ?? "0.00");
          });
        }
      });
      return row;
    });
  }, [studentsData]);

  // 🟢 ฟังก์ชันจัดการการคลิก (Toggle)
  const handleToggle = (id: string) => {
    const isCurrentlySelected = selectedId === id;

    if (isCurrentlySelected) {
      // ถ้ากดคนเดิม ให้ส่ง null เพื่อล้างค่า (Unselect)
      if (onViewDetails) onViewDetails(null);
    } else {
      // ถ้ากดคนใหม่ ค้นหา Object นักเรียนตัวจริงจาก studentsData ต้นฉบับ
      const selectedStudent = studentsData.find(
        (s) => String(s.student_id || s.id || s.student_code) === id,
      );
      if (onViewDetails) onViewDetails(selectedStudent);
    }
  };

  const dynamicHeaders = useMemo(() => {
    if (flattenedData.length === 0) return [];
    return Object.keys(flattenedData[0])
      .filter((key) => !["Name", "student_code", "id"].includes(key))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [flattenedData]);

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
              {/* 1. Action Header: ใช้ z-40 เพื่อให้อยู่บนสุด */}
              <th className="p-4 w-[120px] min-w-[120px] text-xs font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-40 border-b border-slate-200">
                Action
              </th>
              {/* 2. Name Header: ใช้ left-[120px] ให้เป๊ะกับความกว้าง Action */}
              <th className="p-4 w-[200px] min-w-[200px] text-xs font-bold text-slate-500 uppercase sticky left-[120px] bg-slate-50 z-40 border-b border-slate-200 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                Name
              </th>

              <th className="p-4 w-32 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                Code
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
                  {/* 3. Sticky Action Cell: ใส่ bg-inherit และ z-30 */}
                  <td
                    className={`p-3 sticky left-0 z-30 border-b border-slate-100 transition-colors ${
                      isActive
                        ? "bg-blue-50"
                        : "bg-white group-hover:bg-slate-50"
                    }`}
                  >
                    <button
                      onClick={() => handleToggle(row.id)}
                      className={`w-full px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                        isActive
                          ? "bg-slate-800 text-white shadow-md"
                          : "bg-white text-blue-600 border border-blue-100 hover:border-blue-600"
                      }`}
                    >
                      {isActive ? "Hide Graph" : "Show Graph"}
                    </button>
                  </td>

                  {/* 4. Sticky Name Cell: กำหนดความกว้างและตำแหน่งให้ 'เป๊ะ' เป็นพิกเซล */}
                  <td
                    className={`p-4 text-sm font-bold w-[200px] min-w-[200px] truncate sticky left-[120px] z-30 border-b border-slate-100 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0] transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-900"
                        : "bg-white text-slate-800 group-hover:bg-slate-50"
                    }`}
                  >
                    {row.Name}
                  </td>

                  {/* 5. Regular Cells: ให้ z-10 ปกติ */}
                  <td
                    className={`p-4 text-sm border-b border-slate-100 text-slate-500`}
                  >
                    {row.student_code}
                  </td>
                  {dynamicHeaders.map((h) => (
                    <td
                      key={h}
                      className={`p-4 text-sm text-center min-w-[100px] border-b border-slate-100 ${
                        isActive ? "font-bold text-blue-600" : "text-slate-600"
                      }`}
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
