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

import { toPng } from "html-to-image";

import * as XLSX from "xlsx";
import { DashboardLoading } from "./courseComponents/DashboardLoading";
import { NoDataAvailable } from "./courseComponents/NoDataAvailable";
import { DashboardHeader } from "./courseComponents/DashboardHeader";
import { DashboardControls } from "./courseComponents/DashboardControls";

interface AssignmentStatsDashboardProps {
  CsemesterId: string;
  program_id: string;
}

export default function AssignmentStatsDashboard({
  CsemesterId,
}: AssignmentStatsDashboardProps) {
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
    scoreAssStat: null,
    scoreAssStatPercent: null,
    studentStat: null,
    studentStatPercent: null,
    studentName: null,
  });

  const fetchData = useCallback(async () => {
    if (!CsemesterId || !token) return;

    setLoading(true);
    // เคลียร์ข้อมูลเก่าก่อน เพื่อให้ระบบเช็ค hasNoData ได้ถูกต้อง
    setData({
      scoreAssStat: null,
      scoreAssStatPercent: null,
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
        apiClient.get(`/calculation/realScoreAndGrade/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId },
        }),
        apiClient.get(`/calculation/realScoreAndGrade/stats/percentage`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId },
        }),
        apiClient.get(`/calculation/realScoreAndGrade/allStudentCourse`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId },
        }),
        apiClient.get(
          `/calculation/realScoreAndGrade/allStudentCourse/percentage`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { CsemesterId },
          },
        ),
        apiClient.get(`/student/semester-students/${CsemesterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const AssStats = stats.data.categoryStats || [];
      const studentData = studentStats.data.studentResults || [];

      setData({
        scoreAssStat: AssStats,
        scoreAssStatPercent: statsPercent.data.categoryStatsPercentage || null,
        studentStat: studentData,
        studentStatPercent:
          studentStatsPercent.data.realScorePercentagePerStudent || [],
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
        // cloScores: scoreEntry.cloScores || [],
        // ploScores: scoreEntry.ploScores || [],
        categoryScores: scoreEntry.categoryScores || [],

        // หากต้องการค่าสรุปบางตัวไว้โชว์ในตารางหลักด้วย ก็ดึงออกมาได้
        totalScore: scoreEntry.totalScore || 0,
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
        // cloScores: scoreEntry.cloScores || [],
        // ploScores: scoreEntry.ploScores || [],
        categoryPercentages: scoreEntry.categoryPercentages || [],

        // หากต้องการค่าสรุปบางตัวไว้โชว์ในตารางหลักด้วย ก็ดึงออกมาได้
        totalScore: scoreEntry.totalScore || 0,
      };
    });
  }, [data.studentStat, data.studentName]);

  const formattedChartData = useMemo(() => {
    // 1. เช็คว่ามีข้อมูล cloStats หรือไม่ (อ้างอิงตาม JSON ที่คุณส่งมา)
    if (!data.scoreAssStat || !Array.isArray(data.scoreAssStat)) return [];

    // 2. ใช้ข้อมูลจาก Array มาจัดการต่อ
    return (
      [...data.scoreAssStat]
        // 3. เรียงลำดับ CLO1, CLO2, CLO10 ให้ถูกต้อง
        .sort((a: any, b: any) =>
          a.category.localeCompare(b.category, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        )
        // 4. Map ข้อมูลเข้าโครงสร้างที่ Chart ต้องการ
        .map((item: any) => ({
          categoryLabel: item.category, // เช่น "CLO1"
          avgScore: item.mean, // ค่าเฉลี่ย
          maxScore: item.max, // ค่าสูงสุด
          minScore: item.min, // ค่าต่ำสุด
          midScore: item.median, // ค่ากลาง (Median)
          fullScore: item.highestPossible, // คะแนนเต็ม
        }))
    );
  }, [data.scoreAssStat]);

  const formattedChartDataPercent = useMemo(() => {
    if (!data.scoreAssStatPercent || !Array.isArray(data.scoreAssStatPercent))
      return [];

    // 2. ใช้ข้อมูลจาก Array มาจัดการต่อ
    return (
      [...data.scoreAssStatPercent]
        // 3. เรียงลำดับ CLO1, CLO2, CLO10 ให้ถูกต้อง
        .sort((a: any, b: any) =>
          a.category.localeCompare(b.category, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        )
        // 4. Map ข้อมูลเข้าโครงสร้างที่ Chart ต้องการ
        .map((item: any) => ({
          categoryLabel: item.category, // เช่น "CLO1"
          avgScore: item.mean, // ค่าเฉลี่ย
          maxScore: item.max, // ค่าสูงสุด
          minScore: item.min, // ค่าต่ำสุด
          midScore: item.median, // ค่ากลาง (Median)
          fullScore: item.highestPossible, // คะแนนเต็ม
        }))
    );
  }, [data.scoreAssStatPercent]);

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

        if (item.categoryScores && Array.isArray(item.categoryScores)) {
          item.categoryScores.forEach(
            (category: { category: string; score: number }) => {
              row[category.category] = category.score;
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

  const activeTableData =
    dataMode === "score" ? flattenedTableData : flattenedTableDataPercent;

  useEffect(() => {
    setIndividualStudentData(null);
  }, [dataMode, displayMode, token]);

  const activeChartData =
    dataMode === "score" ? formattedChartData : formattedChartDataPercent;

  // 2. ถ้าโหลดเสร็จแล้ว แต่ไม่มีข้อมูล (Check จากหลายๆ จุดเพื่อให้มั่นใจ)
  const hasNoData =
    !data.scoreAssStat ||
    Object.keys(data.scoreAssStat).length === 0 ||
    !data.studentStat ||
    (Array.isArray(data.studentStat) && flattenedTableData.length === 0);

  if (hasNoData) {
    return (
      <NoDataAvailable alertMessage="There is no Assignment performance data recorded yet." />
    );
  }

  return (
    <div className="mt-8 space-y-8">
      {/* Header Section */}
      <DashboardHeader
        title={`Assignment Performance Dashboard`}
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
        className="grid grid-cols-1 gap-8"
        style={{ minHeight: "500px", backgroundColor: "white" }}
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
                xAxisKey="categoryLabel"
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
                xAxisKey="categoryLabel"
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
      <div>
        <StudentPerformanceTable
          studentsData={activeTableData}
          title="Individual Student Performance"
          onViewDetails={handleStudentView}
        />
      </div>
    </div>
  );
}
