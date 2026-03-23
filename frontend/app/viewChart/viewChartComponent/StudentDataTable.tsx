"use client";

import React, { useMemo } from "react";
import Table from "@/components/Table";

interface StudentPerformanceTableProps {
  studentsData: any[];
  title?: string;
}

export default function StudentPerformanceTable({
  studentsData,
  title,
}: StudentPerformanceTableProps) {
  const flattenedData = useMemo(() => {
    // 1. เช็คว่ามีข้อมูลและเป็น Array หรือไม่
    if (!studentsData || !Array.isArray(studentsData)) return [];

    return studentsData.map((student) => {
      // 2. ดึง ID นักศึกษา (ใช้ student_id ตาม API)
      const row: any = {
        // Code: student.student_id || student.id || "-",
        Name: student.student_name || student.Name || "Unknown",
        student_code: student.student_code || "Unknown",
      };

      // 3. 🟢 จัดการ ploScores ที่เป็น Array [ { plo_name: '...', score: ... } ]
      if (Array.isArray(student.ploScores)) {
        student.ploScores.forEach((item: any) => {
          // ใช้ plo_name เป็นชื่อคอลัมน์ (Header)
          const key = item.plo_name || item.ploCode || "Unknown";
          // เก็บค่าคะแนน
          const scoreValue = item.score || item.ploScore || 0;

          row[key] =
            typeof scoreValue === "number"
              ? scoreValue.toFixed(2)
              : (scoreValue ?? "0.00");
        });
      }

      if (Array.isArray(student.cloScores)) {
        student.cloScores.forEach((item: any) => {
          // ใช้ clo_name เป็นชื่อคอลัมน์ (Header)
          const key = item.clo_name || item.cloCode || "Unknown";
          // เก็บค่าคะแนน
          const scoreValue = item.score || item.cloScore || 0;

          row[key] =
            typeof scoreValue === "number"
              ? scoreValue.toFixed(2)
              : (scoreValue ?? "0.00");
        });
      }

      if (Array.isArray(student.categoryScores)) {
        student.categoryScores.forEach((item: any) => {
          // ใช้ category เป็นชื่อคอลัมน์ (Header)
          const key = item.category || "Unknown";
          // เก็บค่าคะแนน
          const scoreValue = item.realScore || 0;

          row[key] =
            typeof scoreValue === "number"
              ? scoreValue.toFixed(2)
              : (scoreValue ?? "0.00");
        });
      }

      return row;
    });
  }, [studentsData]);

  // 4. สร้าง Columns อัตโนมัติ
  const columns = useMemo(() => {
    if (flattenedData.length === 0) return [];

    const baseCols = [
      { header: "Student Code", accessor: "student_code" },
      { header: "Student Name", accessor: "Name" },
    ];

    // ดึงคีย์ PLO ทั้งหมดที่เจอในแถวแรก
    const dynamicCols = Object.keys(flattenedData[0])
      .filter((key) => key !== "Name" && key !== "student_code")
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((key) => ({
        header: key,
        accessor: key,
      }));

    return [...baseCols, ...dynamicCols];
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
      <div className="overflow-x-auto rounded-xl border border-slate-50">
        <Table columns={columns} data={flattenedData} />
      </div>
    </div>
  );
}
