"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { apiClient } from "@/utils/apiClient";
import { useGlobalToast } from "@/app/context/ToastContext";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useAuth } from "../context/AuthContext";
import { PerformanceBalanceChart } from "./viewChartComponent/PerformanceBalanceChart";
import { PerformanceTrendChart } from "./viewChartComponent/PerformanceTrendChart";

import StudentPerformanceTable from "./viewChartComponent/StudentDataTable";
import { toPng } from "html-to-image";

import * as XLSX from "xlsx";
import { DashboardHeader } from "./CourseStats/courseComponents/DashboardHeader";
import { DashboardControls } from "./CourseStats/courseComponents/DashboardControls";

interface YearStatsDashboardProps {
  programId: string | number;
  year: string | number;
}

export default function YearStatsDashboard({
  programId,
  year,
}: YearStatsDashboardProps) {
  const graphRef = useRef<HTMLDivElement>(null);
  const { showToast } = useGlobalToast();
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    maxScore: false,
    minScore: false,
    allAvg: true,
    midScore: false,
  });

  // State สำหรับเก็บข้อมูลทั้งหมด
  const [data, setData] = useState({
    scoreYearStat: null,
    scoreYearStatPercent: null,
    studentStat: null,
    studentStatPercent: null,
  });

  const fetchData = useCallback(async () => {
    if (!programId || !year || !token) return;

    setLoading(true);
    // เคลียร์ข้อมูลเก่าก่อน เพื่อให้ระบบเช็ค hasNoData ได้ถูกต้อง
    setData({
      scoreYearStat: null,
      scoreYearStatPercent: null,
      studentStat: null,
      studentStatPercent: null,
    });
    try {
      // 🚀 ใช้ Promise.all เพื่อดึงข้อมูลพร้อมกันทั้ง 4 APIs (เร็วขึ้นมาก)
      const [stats, statsPercent, studentStats, studentStatsPercent] =
        await Promise.all([
          apiClient.get(`/calculation/clo-plo/year/stats`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { programId, year },
          }),
          apiClient.get(`/calculation/clo-plo/year/stats/percentage`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { programId, year },
          }),
          apiClient.get(`/calculation/clo-plo/allStudentYear`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { programId, year },
          }),
          apiClient.get(`/calculation/clo-plo/allStudentYear/percentage`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { programId, year },
          }),
        ]);

      const ploStats = stats.data.ploYearlyStats?.[0]?.plos || null;
      const studentData = studentStats.data || [];

      setData({
        scoreYearStat: ploStats,
        scoreYearStatPercent:
          statsPercent.data.ploYearlyStatsPercentage?.[0]?.plos || null,
        studentStat: studentData,
        studentStatPercent: studentStatsPercent.data || [],
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [programId, year, token, showToast]);

  // เมื่อ Props เปลี่ยน ให้โหลดข้อมูลใหม่
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  interface PLOScoreItem {
    ploCode: string; // เช่น 'PLO1', 'PLO2'
    ploScore: number; // เช่น 10.95, 20.25
  }
  const flattenedStudentData = useMemo(() => {
    const mappedData = (data.studentStat || []).map(
      (student: {
        student_id: string;
        student_code: string;
        student_name: string;
        ploScores: PLOScoreItem[];
      }) => ({
        student_id: student.student_id,
        student_code: student.student_code,
        student_name: student.student_name,
        ploScores: student.ploScores || [],
      }),
    );
    return mappedData;
  }, [data.studentStat]); // เพิ่มไว้ด้านบนกับ State อื่นๆ

  const flattenedStudentDataPercent = useMemo(() => {
    const mappedData = (data.studentStatPercent || []).map(
      (student: {
        student_id: string;
        student_code: string;
        student_name: string;
        ploScores: PLOScoreItem[];
      }) => ({
        student_id: student.student_id,
        student_code: student.student_code,
        student_name: student.student_name,
        ploScores: student.ploScores || [],
      }),
    );
    return mappedData;
  }, [data.studentStatPercent]); // เพิ่มไว้ด้านบนกับ State อื่นๆ

  const formattedChartData = useMemo(() => {
    if (!data.scoreYearStat) return [];

    return (
      Object.entries(data.scoreYearStat)
        // 🟢 เพิ่มส่วนการเรียงลำดับตรงนี้
        .sort(([nameA], [nameB]) =>
          nameA.localeCompare(nameB, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        )
        .map(([ploName, values]: any) => ({
          ploLabel: ploName,
          avgScore: values.mean,
          maxScore: values.max,
          minScore: values.min,
          midScore: values.median,
          fullScore: values.highestPossible,
        }))
    );
  }, [data.scoreYearStat]);

  const formattedChartDataPercent = useMemo(() => {
    if (!data.scoreYearStatPercent) return [];

    return (
      Object.entries(data.scoreYearStatPercent)
        // 🟢 เพิ่มส่วนการเรียงลำดับตรงนี้เหมือนกัน
        .sort(([nameA], [nameB]) =>
          nameA.localeCompare(nameB, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        )
        .map(([ploName, values]: any) => ({
          ploLabel: ploName,
          avgScore: values.mean,
          maxScore: values.max,
          minScore: values.min,
          midScore: values.median,
          fullScore: values.highestPossible,
        }))
    );
  }, [data.scoreYearStatPercent]);

  const [displayMode, setDisplayMode] = useState<"chart" | "radar">("chart");

  const handleCaptureGraph = async () => {
    if (!graphRef.current) return;

    try {
      // 🟢 เพิ่มการรอเล็กน้อยเพื่อให้ DOM นิ่ง
      await new Promise((resolve) => setTimeout(resolve, 500));

      const dataUrl = await toPng(graphRef.current, {
        cacheBust: true,
        // 🟢 บังคับขนาดที่แน่นอนตอน capture เพื่อช่วย ResponsiveContainer
        width: graphRef.current.offsetWidth,
        height: graphRef.current.offsetHeight,
        style: {
          visibility: "visible",
        },
      });

      const link = document.createElement("a");
      link.download = `performance-chart-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Capture Error:", err);
    } finally {
      setLoading(false);
      showToast("Graph image captured!", "success");
    }
  };

  const handleExportAllExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const dataToExport = flattenedStudentData.map((item) => {
        const row: { [key: string]: string | number } = {
          "Student Code": item.student_code,
          "Student Name": item.student_name,
        };

        if (item.ploScores && Array.isArray(item.ploScores)) {
          item.ploScores.forEach(
            (plo: { ploCode: string; ploScore: number }) => {
              row[plo.ploCode] = plo.ploScore;
            },
          );
        }
        return row;
      });

      const sheets = [{ data: dataToExport, name: "PLO_Scores" }];

      sheets.forEach((s) => {
        if (s.data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(s.data);
          XLSX.utils.book_append_sheet(workbook, ws, s.name);
        }
      });

      XLSX.writeFile(
        workbook,
        `Academic_Report_${new Date().getFullYear()}.xlsx`,
      );
      showToast("Exported all data to Excel!", "success");
    } catch (error) {
      console.error(error);
      showToast("Export failed", "error");
    }
  };

  const [dataMode, setDataMode] = useState<"score" | "percent">("score");

  // 1. เปลี่ยนจากเก็บ Object ข้อมูล เป็นเก็บแค่ ID ของนักเรียนที่เลือก
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  // 2. ฟังก์ชัน Handle การคลิกปุ่ม Eye
  const handleStudentView = (id: string) => {
    // ถ้ากดซ้ำคนเดิมให้ปิด (Toggle) หรือจะเปลี่ยนคนก็ได้
    setSelectedStudentId((prev) => (prev === id ? null : id));
  };

  const activeTableData =
    dataMode === "score" ? flattenedStudentData : flattenedStudentDataPercent;

  const activeChartData =
    dataMode === "score" ? formattedChartData : formattedChartDataPercent;

  const individualStudentData = useMemo(() => {
    if (!selectedStudentId) return null;

    return activeTableData.find((s) => {
      return String(s.student_id) === String(selectedStudentId);
    });
  }, [selectedStudentId, activeTableData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 animate-pulse">
          Loading Dashboard Data...
        </p>
      </div>
    );
  }

  const hasNoData =
    !data.scoreYearStat ||
    Object.keys(data.scoreYearStat).length === 0 ||
    !data.studentStat ||
    (Array.isArray(data.studentStat) && flattenedStudentData.length === 0);

  if (hasNoData) {
    return (
      <div className="mt-8 bg-white p-12 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
        <div className="bg-slate-50 p-4 rounded-full mb-4">
          <svg
            className="w-12 h-12 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-800">No Data Available</h3>
        <p className="text-slate-500 max-w-xs mt-2">
          There is no PLO performance data recorded for the year{" "}
          <span className="font-semibold text-blue-600">{year}</span> yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8 align-middle flex flex-col items-center">
      {loading && <LoadingOverlay />}

      {/* Header Section */}
      <DashboardHeader
        title={`Yearly PLO Performance Dashboard - ${year}`}
        onSaveImage={handleCaptureGraph}
        onExportExcel={handleExportAllExcel}
      />
      <DashboardControls
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        visibleLines={visibleLines}
        setVisibleLines={setVisibleLines}
        dataMode={dataMode}
        setDataMode={setDataMode}
      />

      {/* Charts Grid Section */}
      <div
        ref={graphRef}
        className="w-full grid grid-cols-1 gap-8 "
        style={{
          minHeight: "500px",
          maxWidth: "1500px",
          backgroundColor: "white",
        }}
      >
        {/* Card 1: Bar Chart */}
        {displayMode === "chart" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col animate-in slide-in-from-left duration-500 ">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                Performance Trend
              </h3>
              <p className="text-sm text-slate-500">
                Showing {dataMode === "score" ? "Raw Scores" : "Percentages"}{" "}
                for PLO Performance
              </p>
            </div>

            <div className="h-112.5 w-full">
              <PerformanceTrendChart
                chartData={activeChartData} // 🟢 ใช้ข้อมูลที่ถูกเลือก
                individualStudentData={individualStudentData} // 🟢 ส่งข้อมูลนักเรียนที่เลือกไปยังกราฟ
                xAxisKey="ploLabel"
                allAvgKey="avgScore"
                maxScoreKey="maxScore"
                minScoreKey="minScore"
                midScoreKey="midScore"
                maxScorePosKey="fullScore"
                visibleLines={visibleLines}
              />
            </div>
          </div>
        )}

        {/* Card 2: Radar Chart */}
        {displayMode === "radar" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col animate-in slide-in-from-right duration-500">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                Competency Balance
              </h3>
              <p className="text-sm text-slate-500">
                Overview of{" "}
                {dataMode === "score" ? "Raw Scores" : "Percentages"} in Radar
                View
              </p>
            </div>
            <div className="h-112.5 w-full">
              <PerformanceBalanceChart
                chartData={activeChartData} // 🟢 ใช้ข้อมูลที่ถูกเลือกเหมือนกัน
                individualStudentData={individualStudentData}
                xAxisKey="ploLabel"
                allAvgKey="avgScore"
                maxScoreKey="maxScore"
                minScoreKey="minScore"
                midScoreKey="midScore"
                maxScorePosKey="fullScore"
                visibleLines={visibleLines}
              />
            </div>
          </div>
        )}
      </div>
      <div className="w-full max-w-375 mx-auto">
        <StudentPerformanceTable
          studentsData={activeTableData}
          title="Individual Student Performance"
          onViewDetails={handleStudentView}
          // ส่ง ID จาก data ที่เลือกอยู่เข้าไปเพื่อให้ปุ่มเปลี่ยนสีได้ถูกต้อง
          selectedId={
            individualStudentData
              ? String(
                  individualStudentData.student_id ||
                    individualStudentData.student_code,
                )
              : null
          }
        />
      </div>
    </div>
  );
}
