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
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";

import { NoDataAvailable } from "./courseComponents/NoDataAvailable";
import { DashboardHeader } from "./courseComponents/DashboardHeader";
import { DashboardControls } from "./courseComponents/DashboardControls";
import { GradeFilterGroup } from "./courseComponents/GradeFilterGroup";
import { DashboardLoading } from "./courseComponents/DashboardLoading";

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
    GradeSummary: null,
    GradeSummaryPercent: null,
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
      GradeSummary: null,
      GradeSummaryPercent: null,
    });
    try {
      // 🚀 ใช้ Promise.all เพื่อดึงข้อมูลพร้อมกันทั้ง 4 APIs (เร็วขึ้นมาก)
      const [
        stats,
        statsPercent,
        studentStats,
        studentStatsPercent,
        studentName,
        GradeSummary,
        GradeSummaryPercent,
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
        apiClient.get(`/calculation/ass-clo/gradeSummary`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId },
        }),
        apiClient.get(`/calculation/ass-clo/gradeSummary/percentage`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId },
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
        GradeSummary: GradeSummary.data || null,
        GradeSummaryPercent: GradeSummaryPercent.data || null,
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
        student_id: scoreEntry.student_id, // 🟢 เพิ่ม student_id ไว้ใน Object เพื่อใช้เป็น Key ในการค้นหาต่อไป
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
        student_id: scoreEntry.student_id, // 🟢 เพิ่ม student_id ไว้ใน Object เพื่อใช้เป็น Key ในการค้นหาต่อไป
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
    if (!data.scoreCloStat || !Array.isArray(data.scoreCloStat)) return [];

    return [...data.scoreCloStat]

      .sort((a: any, b: any) =>
        a.cloCode.localeCompare(b.cloCode, undefined, {
          numeric: true,

          sensitivity: "base",
        }),
      )

      .map((item: any) => ({
        cloLabel: item.cloCode, // เช่น "CLO1"
        avgScore: item.mean, // ค่าเฉลี่ย
        maxScore: item.max, // ค่าสูงสุด
        minScore: item.min, // ค่าต่ำสุด
        midScore: item.median, // ค่ากลาง (Median)
        fullScore: item.highestPossible, // คะแนนเต็ม
      }));
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

  const gradeCountData = useMemo(() => {
    if (!data.GradeSummary && !data.GradeSummaryPercent) return [];
    const baseData = data.GradeSummary || data.GradeSummaryPercent || {};

    return Object.entries(baseData).map(([grade, info]: [string, any]) => {
      // 🟢 3. ดึงข้อมูล averages จากฝั่งปกติ (ถ้ามี)
      const normalAverages = data.GradeSummary?.[grade]?.categoryAverages || {};

      // 🟢 4. เจาะข้ามไปเอา averagesPercentage จากอีกฝั่งโดยใช้คีย์เกรดเดียวกัน
      const percentageAverages =
        data.GradeSummaryPercent?.[grade]?.categoryAverages || {};

      return {
        grade: grade,
        averages: normalAverages, // 📊 ค่าเฉลี่ยดิบปกติ (เช่น CLO1: 15)
        averagesPercentage: percentageAverages, // 📈 ค่าเฉลี่ยแบบ % (เช่น CLO1: 75)
      };
    });
  }, [data.GradeSummary, data.GradeSummaryPercent]); // 🟢 5. จับตาดู Dependency ทั้งสองตัว

  // useEffect(() => {
  //   console.log(gradeCountData);
  // });

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
        const cloData = item.cloPercentages || item.cloScores;

        if (cloData && Array.isArray(cloData)) {
          cloData.forEach((clo: any) => {
            // ดึงค่า: ถ้าเป็นโหมด Percent ให้หา .percentage ก่อน ถ้าเป็นโหมด Score ให้หา .cloScore
            const rawValue = isPercentage
              ? (clo.percentage ?? clo.cloPercentage)
              : clo.cloScore;

            if (clo.cloCode && rawValue !== undefined) {
              // ปรับทศนิยม 2 ตำแหน่ง และแปลงกลับเป็น Number
              row[clo.cloCode] = Number(Number(rawValue).toFixed(2));
            }
          });
        }
        return row;
      });

      const sheets = [{ data: dataToExport, name: `CLO_${dataTypeLabel}` }];

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

  const uniqueGrades = useMemo(() => {
    if (!data.GradeSummary) return [];

    return Object.keys(data.GradeSummary)
      .filter((key) => key !== "total") // 🟢 กรองคีย์ที่ไม่ใช่เกรดออกที่นี่
      .sort((a, b) => {
        const order: Record<string, number> = {
          A: 1,
          "B+": 2,
          B: 3,
          "C+": 4,
          C: 5,
          "D+": 6,
          D: 7,
          F: 8,
        };
        return (order[a] || 99) - (order[b] || 99);
      });
  }, [data.GradeSummary]);

  useEffect(() => {
    if (uniqueGrades.length > 0) {
      setVisibleLines((prev) => {
        const newGradeStates: Record<string, boolean> = {};
        uniqueGrades.forEach((grade) => {
          const key = `avg_grade_${grade}`;
          // ถ้ายังไม่มี key นี้ใน state ให้ตั้งเป็น false (ปิดไว้ก่อน)
          if (prev[key] === undefined) {
            newGradeStates[key] = false;
          }
        });
        return { ...prev, ...newGradeStates };
      });
    }
  }, [uniqueGrades]);

  const getGradeColor = (g: string) => {
    const colors: Record<string, string> = {
      // 🟢 กลุ่ม Top: เขียวเข้มตัดกับน้ำเงินสว่าง
      A: "#064e3b", // Emerald 900 (เขียวเข้มจัด)
      "B+": "#3b82f6", // Blue 500 (น้ำเงินสว่างสดใส)
      B: "#1e3a8a", // Blue 900 (น้ำเงินเข้ม Navy)

      // 🟡 กลุ่ม Mid: ม่วงสว่างตัดกับส้มทอง
      "C+": "#a855f7", // Purple 500 (ม่วงสว่าง)
      C: "#d97706", // Amber 600 (ส้มทองสว่าง)

      // 🔴 กลุ่ม Risk: ชมพูเข้มตัดกับแดงสว่าง
      "D+": "#be123c", // Rose 700 (ชมพูแดงเข้ม)
      D: "#fb7185", // Rose 400 (ชมพูพาสเทลสว่าง)
      F: "#450a0a", // Red 950 (แดงดำ - สื่อถึงจุดวิกฤต)
    };

    return colors[g] || "#64748b"; // Default: Slate 500
  };

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
    !data.scoreCloStat ||
    Object.keys(data.scoreCloStat).length === 0 ||
    !data.studentStat ||
    (Array.isArray(data.studentStat) && flattenedTableData.length === 0);

  if (loading) {
    return <DashboardLoading />;
  }

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

      <DashboardControls
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        visibleLines={visibleLines}
        setVisibleLines={setVisibleLines}
        dataMode={dataMode}
        setDataMode={setDataMode}
      />

      {/* Grade Toggles Container */}
      <GradeFilterGroup
        uniqueGrades={uniqueGrades}
        visibleLines={visibleLines}
        setVisibleLines={setVisibleLines}
        getGradeColor={getGradeColor}
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
                chartData={activeChartData}
                balanceData={gradeCountData}
                individualStudentData={individualStudentData}
                xAxisKey="cloLabel"
                allAvgKey="avgScore"
                maxScoreKey="maxScore"
                minScoreKey="minScore"
                midScoreKey="midScore"
                maxScorePosKey="fullScore"
                visibleLines={visibleLines}
                getGradeColor={getGradeColor}
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
                chartData={activeChartData} // 🟢
                // ใช้ข้อมูลที่ถูกเลือกเหมือนกัน
                balanceData={gradeCountData}
                individualStudentData={individualStudentData}
                xAxisKey="cloLabel"
                allAvgKey="avgScore"
                maxScoreKey="maxScore"
                minScoreKey="minScore"
                midScoreKey="midScore"
                maxScorePosKey="fullScore"
                visibleLines={visibleLines}
                getGradeColor={getGradeColor}
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
