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

import { useAuth } from "../../context/AuthContext";
import { PerformanceBalanceChart } from "../viewChartComponent/PerformanceBalanceChart";
import { PerformanceTrendChart } from "../viewChartComponent/PerformanceTrendChart";

import StudentPerformanceTable from "../viewChartComponent/StudentDataTable";
import { toPng } from "html-to-image";

import * as XLSX from "xlsx";

import { NoDataAvailable } from "./courseComponents/NoDataAvailable";
import { DashboardHeader } from "./courseComponents/DashboardHeader";
import { DashboardControls } from "./courseComponents/DashboardControls";

interface PloStatsDashboardProps {
  CsemesterId: string;
  courseId: string;
  program_id: string;
  onLoadingChange?: (isLoading: boolean) => void;
}

export default function PloStatsDashboard({
  CsemesterId,
  courseId,
  program_id,
  
}: PloStatsDashboardProps) {
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
    scorePloStat: null,
    scorePloStatPercent: null,
    studentStat: null,
    studentStatPercent: null,
    studentName: null,
  });

  const fetchData = useCallback(async () => {
    if (!CsemesterId || !courseId || !token) return;

    setLoading(true);
    // เคลียร์ข้อมูลเก่าก่อน เพื่อให้ระบบเช็ค hasNoData ได้ถูกต้อง
    setData({
      scorePloStat: null,
      scorePloStatPercent: null,
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
        apiClient.get(`/calculation/clo-plo/course/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId, courseId },
        }),
        apiClient.get(`/calculation/clo-plo/course/stats/percentage`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId, courseId },
        }),
        apiClient.get(`/calculation/clo-plo/allStudentCourse`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId, courseId },
        }),
        apiClient.get(`/calculation/clo-plo/allStudentCourse/percentage`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId, courseId },
        }),
        apiClient.get(`/student/semester-students/${CsemesterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const ploStats = stats.data.ploStats?.[0]?.plos || null;
      const studentData = studentStats.data || [];

      setData({
        scorePloStat: ploStats,
        scorePloStatPercent:
          statsPercent.data.ploStatsPercentage?.[0]?.plos || null,
        studentStat: studentData,
        studentStatPercent:
          studentStatsPercent.data.ploPercentagePerStudent || [],
        studentName: studentName.data || [],
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [CsemesterId, courseId, token, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formattedChartData = useMemo(() => {
    if (!data.scorePloStat) return [];

    return (
      Object.entries(data.scorePloStat)
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
  }, [data.scorePloStat]);

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

    // 🟢 1. กรองเฉพาะคะแนนที่ตรงกับ programId ที่ต้องการก่อน
    // (เปลี่ยน selectedProgramId เป็นตัวแปรที่คุณใช้เก็บค่า id ที่เลือก)
    return scores
      .filter(
        (scoreEntry: any) =>
          String(scoreEntry.programId) === String(program_id),
      )
      .map((scoreEntry: any) => {
        const info = studentInfoMap.get(scoreEntry.student_id);

        return {
          student_id: scoreEntry.student_id,
          student_code: info?.code || "N/A",
          Name: info?.fullName || "Unknown Student",
          section: info?.section || "-",
          ploScores: scoreEntry.ploScores || [],
        };
      });
  }, [data.studentStat, data.studentName, program_id]);

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

    // 🟢 1. กรองเฉพาะคะแนนที่ตรงกับ programId ที่ต้องการก่อน
    // (เปลี่ยน selectedProgramId เป็นตัวแปรที่คุณใช้เก็บค่า id ที่เลือก)
    return scores
      .filter(
        (scoreEntry: any) =>
          String(scoreEntry.programId) === String(program_id),
      )
      .map((scoreEntry: any) => {
        const info = studentInfoMap.get(scoreEntry.studentId);

        return {
          student_id: scoreEntry.studentId,
          student_code: info?.code || "N/A",
          Name: info?.fullName || "Unknown Student",
          section: info?.section || "-",
          ploPercentages: scoreEntry.ploPercentages || [],
        };
      });
  }, [data.studentStatPercent, data.studentName, program_id]);

  const formattedChartDataPercent = useMemo(() => {
    if (!data.scorePloStatPercent) return [];

    return (
      Object.entries(data.scorePloStatPercent)
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
  }, [data.scorePloStatPercent]);

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
  
        const isPercentage = activeTableData === flattenedTableDataPercent;
        const dataTypeLabel = isPercentage ? "Percentage" : "RawScore";
  
        const dataToExport = activeTableData.map((item) => {
          const row: { [key: string]: string | number } = {
            "Student Code": item.student_code,
            "Student Name": item.Name,
          };
  
          // เลือกใช้ข้อมูลตามประเภทที่มี
          const ploData = item.ploPercentages || item.ploScores;
  
          if (ploData && Array.isArray(ploData)) {
            ploData.forEach((plo: any) => {
              // ดึงค่า: ถ้าเป็นโหมด Percent ให้หา .percentage ก่อน ถ้าเป็นโหมด Score ให้หา .cloScore
              const rawValue = isPercentage
                ? (plo.percentage ?? plo.ploPercentage)
                : plo.ploScore;
  
              if (plo.ploCode && rawValue !== undefined) {
                // ปรับทศนิยม 2 ตำแหน่ง และแปลงกลับเป็น Number
                row[plo.ploCode] = Number(Number(rawValue).toFixed(2));
              }
            });
          }
          return row;
        });
  
        const sheets = [{ data: dataToExport, name: `PLO_${dataTypeLabel}` }];
  
        sheets.forEach((s) => {
          if (s.data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(s.data);
            XLSX.utils.book_append_sheet(workbook, ws, s.name);
          }
        });
  
        // 2. ปรับชื่อไฟล์ให้มีคำว่า RawScore หรือ Percentage ตามข้อมูลที่เลือก
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const timeStr =
          now.getHours().toString().padStart(2, "0") +
          now.getMinutes().toString().padStart(2, "0");
  
        // ชื่อไฟล์จะเป็น: Academic_Report_Percentage_2026-03-27_1500.xlsx เป็นต้น
        const fileName = `Academic_Report_${dataTypeLabel}_${dateStr}_${timeStr}.xlsx`;
  
        XLSX.writeFile(workbook, fileName);
        showToast(`Exported ${dataTypeLabel} data successfully!`, "success");
      } catch (error) {
        console.error("Export Error:", error);
        showToast("Export failed", "error");
      }
    };

  const [dataMode, setDataMode] = useState<"score" | "percent">("score");

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  // 2. ฟังก์ชัน Handle การคลิกปุ่ม Eye
  const handleStudentView = (id: string) => {
    // ถ้ากดซ้ำคนเดิมให้ปิด (Toggle) หรือจะเปลี่ยนคนก็ได้
    setSelectedStudentId((prev) => (prev === id ? null : id));
  };

  const activeTableData =
    dataMode === "score" ? flattenedTableData : flattenedTableDataPercent;

  const activeChartData =
    dataMode === "score" ? formattedChartData : formattedChartDataPercent;

  const individualStudentData = useMemo(() => {
    if (!selectedStudentId) return null;

    return activeTableData.find((s) => {
      return String(s.student_id) === String(selectedStudentId);
    });
  }, [selectedStudentId, activeTableData]);

  // 2. ถ้าโหลดเสร็จแล้ว แต่ไม่มีข้อมูล (Check จากหลายๆ จุดเพื่อให้มั่นใจ)
  const hasNoData =
    !data.scorePloStat ||
    Object.keys(data.scorePloStat).length === 0 ||
    !data.studentStat ||
    (Array.isArray(data.studentStat) && flattenedTableData.length === 0);

  if (hasNoData) {
    return (
      <NoDataAvailable alertMessage="There is no PLO performance data recorded yet." />
    );
  }

  return (
    <div className="mt-8 space-y-8 ">
      {/* Header Section */}
      <DashboardHeader
        title={`PLO Performance Dashboard`}
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

            <div className="h-112.5 w-full">
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
                    individualStudentData.id ||
                    individualStudentData.student_code,
                )
              : null
          }
        />
      </div>
    </div>
  );
}
