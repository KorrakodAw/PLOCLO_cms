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
import { useAuth } from "../../context/AuthContext";
import { PerformanceBalanceChart } from "../viewChartComponent/PerformanceBalanceChart";
import { PerformanceTrendChart } from "../viewChartComponent/PerformanceTrendChart";

import StudentPerformanceTable from "../viewChartComponent/StudentDataTable";
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";

import { DashboardLoading } from "./courseComponents/DashboardLoading";
import { NoDataAvailable } from "./courseComponents/NoDataAvailable";
import { DashboardHeader } from "./courseComponents/DashboardHeader";
import { DashboardControls } from "./courseComponents/DashboardControls";

interface CloStatsDashboardProps {
  CsemesterId: string;
  program_id: string;
}

export default function CloStatsDashboard({
  CsemesterId,
  program_id,
}: CloStatsDashboardProps) {
  const graphRef = useRef<HTMLDivElement>(null);
  const { user, token } = useAuth();
  const { showToast } = useGlobalToast();
  const [loading, setLoading] = useState(false);

  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    maxScore: false,
    minScore: false,
    allAvg: true,
    midScore: false,
  });

  const [data, setData] = useState({
    scoreCloStat: null,
    scoreCloStatPercent: null,
    studentStat: null,
    studentStatPercent: null,
    studentName: null,
  });

  const fetchData = useCallback(async () => {
    if (!CsemesterId || !token) return;

    setLoading(true);
    // เคลียร์ข้อมูลเก่าก่อน เพื่อให้ระบบเช็ค hasNoData ได้ถูกต้อง
    setData({
      scoreCloStat: null,
      scoreCloStatPercent: null,
      studentStat: null,
      studentStatPercent: null,
      studentName: null,
    });
    try {
      // 🚀 ใช้ Promise.all เพื่อดึงข้อมูลพร้อมกันทั้ง 4 APIs (เร็วขึ้นมาก)
      const [
        stats,
        statsPercent,
        studentStats,
        studentStatsPercent,
        studentName,
      ] = await Promise.all([
        apiClient.get(`/calculation/ass-clo/course/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId },
        }),
        apiClient.get(`/calculation/ass-clo/course/stats/percentage`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId },
        }),
        apiClient.get(`/calculation/ass-clo/allStudentCourse`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId },
        }),
        apiClient.get(`/calculation/ass-clo/allStudentCourse/percentage`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId },
        }),
        apiClient.get(`/student/semester-students/${CsemesterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const cloStats = stats.data.cloStats || null;
      const studentData = studentStats.data.cloScoresPerStudent || [];

      setData({
        scoreCloStat: cloStats,
        scoreCloStatPercent: statsPercent.data.cloStatsPercentage || null,
        studentStat: studentData,
        studentStatPercent:
          studentStatsPercent.data.cloPercentagePerStudent || [],
        studentName: studentName.data || [],
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [CsemesterId, token, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const flattenedTableData = useMemo(() => {
    const scores = data.studentStat || [];
    const names = data.studentName || [];

    if (scores.length === 0) return [];

    const studentInfoMap = new Map(
      names.map((s: any) => [
        s.id,
        {
          code: s.student_code || s.student_id,
          fullName: `${s.first_name} ${s.last_name}`.trim(),
          section: s.sectionNo,
        },
      ]),
    );

    return scores.map((scoreEntry: any) => {
      const info = studentInfoMap.get(scoreEntry.student_id);

      // สร้าง Object พื้นฐานพร้อมกับ "ยกก้อน" ขแนนมาทั้งหมด
      return {
        student_code: info?.code || "N/A",
        Name: info?.fullName || "Unknown Student",
        section: info?.section || "-",

        // 🟢 ส่งก้อน Array ไปตรงๆ ไม่ต้องวน Loop แผ่ Property ออกมา
        cloScores: scoreEntry.cloScores || [],
        // ploScores: scoreEntry.ploScores || [],
        // categoryScores: scoreEntry.categoryScores || [],

        // หากต้องการค่าสรุปบางตัวไว้โชว์ในตารางหลักด้วย ก็ดึงออกมาได้
        // totalScore: scoreEntry.totalScore || 0,
      };
    });
  }, [data.studentStat, data.studentName]);

  const flattenedTableDataPercent = useMemo(() => {
    const scores = data.studentStatPercent || [];
    const names = data.studentName || [];

    if (scores.length === 0) return [];

    const studentInfoMap = new Map(
      names.map((s: any) => [
        s.id,
        {
          code: s.student_code || s.student_id,
          fullName: `${s.first_name} ${s.last_name}`.trim(),
          section: s.sectionNo,
        },
      ]),
    );

    return scores.map((scoreEntry: any) => {
      const info = studentInfoMap.get(scoreEntry.student_id);

      // สร้าง Object พื้นฐานพร้อมกับ "ยกก้อน" ขแนนมาทั้งหมด
      return {
        student_code: info?.code || "N/A",
        Name: info?.fullName || "Unknown Student",
        section: info?.section || "-",

        // 🟢 ส่งก้อน Array ไปตรงๆ ไม่ต้องวน Loop แผ่ Property ออกมา
        cloPercentages: scoreEntry.cloPercentages || [],
        // ploScores: scoreEntry.ploScores || [],
        // categoryScores: scoreEntry.categoryScores || [],

        // หากต้องการค่าสรุปบางตัวไว้โชว์ในตารางหลักด้วย ก็ดึงออกมาได้
        // totalScore: scoreEntry.totalScore || 0,
      };
    });
  }, [data.studentStatPercent, data.studentName]);

  const formattedChartData = useMemo(() => {
    // 1. เช็คว่ามีข้อมูล cloStats หรือไม่ (อ้างอิงตาม JSON ที่คุณส่งมา)
    if (!data.scoreCloStat || !Array.isArray(data.scoreCloStat)) return [];

    // 2. ใช้ข้อมูลจาก Array มาจัดการต่อ
    return (
      [...data.scoreCloStat]
        // 3. เรียงลำดับ CLO1, CLO2, CLO10 ให้ถูกต้อง
        .sort((a: any, b: any) =>
          a.cloCode.localeCompare(b.cloCode, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        )
        // 4. Map ข้อมูลเข้าโครงสร้างที่ Chart ต้องการ
        .map((item: any) => ({
          cloLabel: item.cloCode, // เช่น "CLO1"
          avgScore: item.mean, // ค่าเฉลี่ย
          maxScore: item.max, // ค่าสูงสุด
          minScore: item.min, // ค่าต่ำสุด
          midScore: item.median, // ค่ากลาง (Median)
          fullScore: item.highestPossible, // คะแนนเต็ม
        }))
    );
  }, [data.scoreCloStat]);

  const formattedChartDataPercent = useMemo(() => {
    if (!data.scoreCloStatPercent || !Array.isArray(data.scoreCloStatPercent))
      return [];

    // 2. ใช้ข้อมูลจาก Array มาจัดการต่อ
    return (
      [...data.scoreCloStatPercent]
        // 3. เรียงลำดับ CLO1, CLO2, CLO10 ให้ถูกต้อง
        .sort((a: any, b: any) =>
          a.cloCode.localeCompare(b.cloCode, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        )
        // 4. Map ข้อมูลเข้าโครงสร้างที่ Chart ต้องการ
        .map((item: any) => ({
          cloLabel: item.cloCode, // เช่น "CLO1"
          avgScore: item.mean, // ค่าเฉลี่ย
          maxScore: item.max, // ค่าสูงสุด
          minScore: item.min, // ค่าต่ำสุด
          midScore: item.median, // ค่ากลาง (Median)
          fullScore: item.highestPossible, // คะแนนเต็ม
        }))
    );
  }, [data.scoreCloStatPercent]);

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

      const dataToExport = flattenedTableData.map((item) => {
        const row: { [key: string]: string | number } = {
          "Student Code": item.student_code,
          "Student Name": item.Name,
        };

        if (item.cloScores && Array.isArray(item.cloScores)) {
          item.cloScores.forEach(
            (clo: { cloCode: string; cloScore: number }) => {
              row[clo.cloCode] = clo.cloScore;
            },
          );
        }
        return row;
      });

      const sheets = [{ data: dataToExport, name: "CLO_Scores" }];

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
    dataMode === "score" ? flattenedTableData : flattenedTableDataPercent;

  const activeChartData =
    dataMode === "score" ? formattedChartData : formattedChartDataPercent;

  // 2. ถ้าโหลดเสร็จแล้ว แต่ไม่มีข้อมูล (Check จากหลายๆ จุดเพื่อให้มั่นใจ)
  const hasNoData =
    !data.scoreCloStat ||
    Object.keys(data.scoreCloStat).length === 0 ||
    !data.studentStat ||
    (Array.isArray(data.studentStat) && flattenedTableData.length === 0);

  if (hasNoData) {
    return (
      <NoDataAvailable alertMessage="There is no CLO performance data recorded yet." />
    );
  }

  return (
    <div className="mt-8 space-y-8 ">
      {/* Header Section */}
      <DashboardHeader
        title={`CLO Performance Dashboard`}
        onSaveImage={handleCaptureGraph}
        onExportExcel={handleExportAllExcel}
      />
      {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Dashboard for CLO Performance
          </h2>
          <p className="text-slate-500 text-sm mt-1">
                 Analyzing CLO performance based on{" "}
                 {displayMode === "score" ? "raw points" : "percentage metrics"}
               </p> 
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <button
            onClick={handleCaptureGraph}
            className="group flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] tracking-wider font-bold rounded-xl shadow-lg shadow-blue-200/50 transition-all duration-300 active:scale-95"
          >
            <FaCamera className="text-sm group-hover:-rotate-12 transition-transform duration-300" />
            <span>SAVE IMAGE</span>
          </button>

          <button
            onClick={handleExportAllExcel}
            className="group flex items-center gap-2.5 px-6 py-3 bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white text-[11px] tracking-wider font-bold rounded-xl shadow-sm hover:shadow-emerald-200 transition-all duration-300 active:scale-95"
          >
            <FaFileExcel className="text-sm group-hover:bounce transition-transform duration-300" />
            <span>EXPORT REPORT</span>
          </button>
        </div>
        <div>
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setDisplayMode("chart")}
              className={`px-6 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                displayMode === "chart"
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Bar Chart
            </button>
            <button
              onClick={() => setDisplayMode("radar")}
              className={`px-6 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                displayMode === "radar"
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Radar Chart
            </button>
          </div>
        </div>
      </div> */}
      <DashboardControls
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        visibleLines={visibleLines}
        setVisibleLines={setVisibleLines}
        dataMode={dataMode}
        setDataMode={setDataMode}
      />
      {/* <div className="flex items-center gap-1.5 p-1 rounded-[1.25rem]">
        <ToggleButton
          label="MAX"
          active={visibleLines.maxScore}
          onClick={() =>
            setVisibleLines((p) => ({
              ...p,
              maxScore: !p.maxScore,
            }))
          }
          color="#22c55e"
        />
        <ToggleButton
          label="MIN"
          active={visibleLines.minScore}
          onClick={() =>
            setVisibleLines((p) => ({
              ...p,
              minScore: !p.minScore,
            }))
          }
          color="#ef4444"
        />
        <ToggleButton
          label="AVG"
          active={visibleLines.allAvg}
          onClick={() => setVisibleLines((p) => ({ ...p, allAvg: !p.allAvg }))}
          color="#6366f1"
        />
        <ToggleButton
          label="MED"
          active={visibleLines.midScore}
          onClick={() =>
            setVisibleLines((p) => ({
              ...p,
              midScore: !p.midScore,
            }))
          }
          color="#f59e0b"
        />
      </div> */}

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
                xAxisKey="cloLabel"
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
                xAxisKey="cloLabel"
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
