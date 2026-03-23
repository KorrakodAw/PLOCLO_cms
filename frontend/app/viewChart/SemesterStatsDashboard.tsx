"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { apiClient } from "@/utils/apiClient";
import { useGlobalToast } from "@/app/context/ToastContext";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useAuth } from "../context/AuthContext";
import { PerformanceBalanceChart } from "./viewChartComponent/PerformanceBalanceChart";
import { PerformanceTrendChart } from "./viewChartComponent/PerformanceTrendChart";
import { GradeDistributionChart } from "./viewChartComponent/gradeDistributionChart";
import { ToggleButton } from "./viewChartComponent/ToggleButton";
import StudentPerformanceTable from "./viewChartComponent/StudentDataTable";

interface SemesterStatsDashboardProps {
  programId: any;
  year: any;
  semester: any;
}

export default function SemesterStatsDashboard({
  programId,
  year,
  semester,
}: SemesterStatsDashboardProps) {
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
 
   // 2. ถ้าโหลดเสร็จแล้ว แต่ไม่มีข้อมูล (Check จากหลายๆ จุดเพื่อให้มั่นใจ)
   const hasNoData =
     !data.scoreSemesterStat ||
     Object.keys(data.scoreSemesterStat).length === 0 ||
     !data.studentStat ||
     (Array.isArray(data.studentStat) && data.studentStat.length === 0);
 
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
           <span className="font-semibold text-blue-600">{year}</span> semester{" "}
           <span className="font-semibold text-blue-600">{semester}</span> yet.
         </p>
       </div>
     );
   }
 
   return (
     <div className="mt-8 space-y-8">
       {loading && <LoadingOverlay />}
 
       {/* Header Section */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
         <div>
           <h2 className="text-2xl font-bold text-slate-800">
             Dashboard for Year {year} Semester {semester}
           </h2>
           {/* <p className="text-slate-500 text-sm mt-1">
             Analyzing PLO performance based on{" "}
             {displayMode === "score" ? "raw points" : "percentage metrics"}
           </p> */}
         </div>
 
         {/* Toggle Switch */}
         {/* <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
           <button
             onClick={() => setDisplayMode("score")}
             className={`px-6 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
               displayMode === "score"
                 ? "bg-white text-blue-600 shadow-md"
                 : "text-slate-500 hover:text-slate-700"
             }`}
           >
             Raw Score
           </button>
           <button
             onClick={() => setDisplayMode("percent")}
             className={`px-6 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
               displayMode === "percent"
                 ? "bg-white text-blue-600 shadow-md"
                 : "text-slate-500 hover:text-slate-700"
             }`}
           >
             Percentage (%)
           </button>
         </div> */}
       </div>
       <div className="flex items-center gap-1.5 p-1 rounded-[1.25rem]">
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
       </div>
 
       {/* Charts Grid Section */}
       <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
         {/* Card 1: Performance Trend */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
           <div className="mb-6">
             <h3 className="text-lg font-bold text-slate-800">
               Performance Trend
             </h3>
             <p className="text-sm text-slate-500">
               Comparison of Min, Max, and Average Scores
             </p>
           </div>
           <div className="h-[400px] w-full">
             <PerformanceTrendChart
               chartData={formattedChartData}
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
 
         {/* Card 2: Performance Balance (Radar/Spider Chart) */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
           <div className="mb-6">
             <h3 className="text-lg font-bold text-slate-800">
               Competency Balance
             </h3>
             <p className="text-sm text-slate-500">
               Overview of all PLOs in a single view
             </p>
           </div>
           <div className="h-[400px] w-full">
             <PerformanceBalanceChart
               chartData={formattedChartDataPercent}
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
       </div>
       <div>
         <StudentPerformanceTable
           studentsData={data.studentStat}
           title="Individual Student Performance"
         />
       </div>
     </div>
   );
 }
 