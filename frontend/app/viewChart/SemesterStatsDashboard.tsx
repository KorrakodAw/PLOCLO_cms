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
import { ToggleButton } from "./viewChartComponent/ToggleButton";
import StudentPerformanceTable from "./viewChartComponent/StudentDataTable";

import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import { FaCamera, FaFileExcel } from "react-icons/fa";
import { DashboardLoading } from "./CourseStats/courseComponents/DashboardLoading";
import { NoDataAvailable } from "./CourseStats/courseComponents/NoDataAvailable";
import { DashboardHeader } from "./CourseStats/courseComponents/DashboardHeader";
import { DashboardControls } from "./CourseStats/courseComponents/DashboardControls";

interface SemesterStatsDashboardProps {
  programId: string;
  year: string;
  semester: string;
}

export default function SemesterStatsDashboard({
  programId,
  year,
  semester,
}: SemesterStatsDashboardProps) {
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
    scoreSemesterStat: null,
    scoreSemesterStatPercent: null,
    studentStat: null,
    studentStatPercent: null,
  });

  const fetchData = useCallback(async () => {
    if (!programId || !year || !token) return;

    setLoading(true);
    // เคลียร์ข้อมูลเก่าก่อน เพื่อให้ระบบเช็ค hasNoData ได้ถูกต้อง
    setData({
      scoreSemesterStat: null,
      scoreSemesterStatPercent: null,
      studentStat: null,
      studentStatPercent: null,
    });
    try {
      // 🚀 ใช้ Promise.all เพื่อดึงข้อมูลพร้อมกันทั้ง 4 APIs (เร็วขึ้นมาก)
      const [stats, statsPercent, studentStats, studentStatsPercent] =
        await Promise.all([
          apiClient.get(`/calculation/clo-plo/semester/stats`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { programId, year, semester },
          }),
          apiClient.get(`/calculation/clo-plo/semester/stats/percentage`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { programId, year, semester },
          }),
          apiClient.get(`/calculation/clo-plo/allStudentSemester`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { programId, year, semester },
          }),
          apiClient.get(`/calculation/clo-plo/allStudentSemester/percentage`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { programId, year, semester },
          }),
        ]);

      const ploStats = stats.data.ploSemesterStats?.[0]?.plos || null;
      const studentData = studentStats.data || [];

      setData({
        scoreSemesterStat: ploStats,
        scoreSemesterStatPercent:
          statsPercent.data.ploSemesterStatsPercentage?.[0]?.plos || null,
        studentStat: studentData,
        studentStatPercent: studentStatsPercent.data || [],
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [programId, year, semester, token, showToast]);

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
        student_code: student.student_code,
        student_name: student.student_name,
        ploScores: student.ploScores || [],
      }),
    );
    return mappedData;
  }, [data.studentStatPercent]); // เพิ่มไว้ด้านบนกับ State อื่นๆ

  const formattedChartData = useMemo(() => {
    if (!data.scoreSemesterStat) return [];

    return (
      Object.entries(data.scoreSemesterStat)
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
  }, [data.scoreSemesterStat]);

  const formattedChartDataPercent = useMemo(() => {
    if (!data.scoreSemesterStatPercent) return [];

    return (
      Object.entries(data.scoreSemesterStatPercent)
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
  }, [data.scoreSemesterStatPercent]);

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

  const [individualStudentData, setIndividualStudentData] = useState<any>(null);

  const handleStudentView = (id: string) => {
    setIndividualStudentData(id);
  };

  useEffect(() => {
    setIndividualStudentData(null);
  }, [dataMode, displayMode, token]);

  const activeTableData =
    dataMode === "score" ? flattenedStudentData : flattenedStudentDataPercent;

  const activeChartData =
    dataMode === "score" ? formattedChartData : formattedChartDataPercent;

  if (loading) {
    return <DashboardLoading />;
  }

  // 2. ถ้าโหลดเสร็จแล้ว แต่ไม่มีข้อมูล (Check จากหลายๆ จุดเพื่อให้มั่นใจ)
  const hasNoData =
    !data.scoreSemesterStat ||
    Object.keys(data.scoreSemesterStat).length === 0 ||
    !data.studentStat ||
    (Array.isArray(data.studentStat) && flattenedStudentData.length === 0);

  if (hasNoData) {
    return (
      <NoDataAvailable
        alertMessage={`There is no PLO performance data recorded for the year ${year} semester ${semester}`}
      />
    );
  }

  return (
    <div className="mt-8 space-y-8 align-middle flex flex-col items-center">
      {loading && <LoadingOverlay />}

      {/* Header Section */}
      <DashboardHeader
        title={`Semester PLO Performance Dashboard - ${year} Semester ${semester}`}
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col animate-in slide-in-from-left duration-500">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                Performance Trend
              </h3>
              <p className="text-sm text-slate-500">
                Showing {dataMode === "score" ? "Raw Scores" : "Percentages"}{" "}
                for PLO Performance
              </p>
            </div>

            <div className="h-[450px] w-full">
              <PerformanceTrendChart
                chartData={activeChartData} // 🟢 ใช้ข้อมูลที่ถูกเลือก
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
            <div className="h-[450px] w-full">
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
        />
      </div>
    </div>
  );
}
