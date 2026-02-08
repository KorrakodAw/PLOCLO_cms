/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FaUserGraduate,
  FaChartLine,
  FaUniversity,
  FaThLarge,
} from "react-icons/fa";
import DropdownSelect from "@/components/DropdownSelect";
import { apiClient } from "@/utils/apiClient";

// Import Refactored Components
import { PerformanceTrendChart } from "./viewChartComponent/PerformanceTrendChart";
import { PerformanceBalanceChart } from "./viewChartComponent/PerformanceBalanceChart";
import { GradeDistributionChart } from "./viewChartComponent/gradeDistributionChart";
import { PerformanceTable } from "./viewChartComponent/PerformanceTable";

import { ToggleButton } from "./viewChartComponent/ToggleButton";

export default function PLOChart() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  // --- STATE MANAGEMENT ---
  const [options, setOptions] = useState<any>({
    universities: [],
    faculties: [],
    programs: [],
    years: [],
    courses: [],
  });
  const [selections, setSelections] = useState({
    university: "",
    faculty: "",
    program: "",
    year: "",
    courseId: "",
  });

  const [summaryData, setSummaryData] = useState<any>(null);
  const [cloStudentData, setCloStudentData] = useState<any>(null);
  const [ploStudentData, setPloStudentData] = useState<any>(null);
  const [cloBalanceData, setCloBalanceData] = useState<any>(null);
  const [ploBalanceData, setPloBalanceData] = useState<any>(null);

  // UI Control States
  const [activeMetric, setActiveMetric] = useState<"CLO" | "PLO" | "Ass">(
    "CLO",
  );
  const [activeTab, setActiveTab] = useState<"line" | "radar">("line");
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    maxScore: true,
    minScore: true,
    allAvg: true,
  });

  // --- API FETCHERS ---
  const fetchData = async (endpoint: string, params = {}) => {
    try {
      const res = await apiClient.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return res.data;
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      return null;
    }
  };

  useEffect(() => {
    fetchData("/university").then(
      (data) =>
        data &&
        setOptions((prev: any) => ({
          ...prev,
          universities: data.map((u: any) => ({ label: u.name, value: u.id })),
        })),
    );
  }, []);

  useEffect(() => {
    if (selections.university) {
      fetchData("/faculty", { university_id: selections.university }).then(
        (data) =>
          data &&
          setOptions((prev: any) => ({
            ...prev,
            faculties: data.map((f: any) => ({ label: f.name, value: f.id })),
            programs: [],
            years: [],
            courses: [],
          })),
      );
      setSelections((s) => ({
        ...s,
        faculty: "",
        program: "",
        year: "",
        courseId: "",
      }));
    }
  }, [selections.university]);

  useEffect(() => {
    if (selections.faculty) {
      fetchData("/program", { facultyId: selections.faculty }).then((data) => {
        if (data) {
          const unique = Array.from(
            new Map(data.map((p: any) => [p.program_code, p])).values(),
          );
          setOptions((prev: any) => ({
            ...prev,
            programs: unique.map((p: any) => ({
              label: p.program_shortname_en,
              value: p.program_code,
            })),
            years: [],
            courses: [],
          }));
        }
      });
      setSelections((s) => ({ ...s, program: "", year: "", courseId: "" }));
    }
  }, [selections.faculty]);

  useEffect(() => {
    if (selections.program) {
      fetchData(`/program/ByCode`, { programCode: selections.program }).then(
        (data) => {
          if (data && Array.isArray(data)) {
            const yearSet = new Set<number>();
            const uniqueYears: any[] = [];
            data.forEach((p: any) => {
              if (!yearSet.has(p.program_year)) {
                yearSet.add(p.program_year);
                uniqueYears.push({
                  label: p.program_year.toString(),
                  value: p.id,
                });
              }
            });
            setOptions((prev: any) => ({
              ...prev,
              years: uniqueYears.sort(
                (a, b) => Number(b.label) - Number(a.label),
              ),
              courses: [],
            }));
          }
        },
      );
      setSelections((s) => ({ ...s, year: "", courseId: "" }));
    }
  }, [selections.program]);

  useEffect(() => {
    if (selections.year) {
      fetchData("/course/forSummary", { programId: selections.year }).then(
        (data) =>
          data &&
          setOptions((prev: any) => ({
            ...prev,
            courses: data.map((c: any) => ({
              label: `${c.code} - ${c.name}`,
              value: c.id,
            })),
          })),
      );
    }
  }, [selections.year]);

  useEffect(() => {
    if (selections.courseId) {
      fetchData("/reports/gradeSummary", {
        courseId: selections.courseId,
      }).then(setSummaryData);
      fetchData("/calculation/ass-clo/gradeSummary", {
        courseId: selections.courseId,
      }).then(setCloStudentData);
      fetchData("/calculation/clo-plo/allStudentCourse", {
        courseId: selections.courseId,
      }).then(setPloStudentData);
      fetchData("/calculation/ass-clo/course/stats", {
        courseId: selections.courseId,
      }).then(setCloBalanceData);
      fetchData("/calculation/clo-plo/course/stats", {
        courseId: selections.courseId,
      }).then(setPloBalanceData);
    }
  }, [selections.courseId]);

  // --- DATA TRANSFORMATIONS ---
  const categoryChartData = useMemo(() => {
    if (!summaryData?.categoryFullScores || !summaryData?.students) return [];
    const categories = Object.keys(summaryData.categoryFullScores);

    return categories.map((cat) => {
      const scores = summaryData.students.map(
        (s: any) => Number(s.categoryEarnedScores[cat]) || 0,
      );
      const dataPoint: any = {
        name: cat,
        fullScore: summaryData.categoryFullScores[cat],
        maxScore: Math.max(...scores),
        minScore: Math.min(...scores),
        allAvg: Number(
          (
            scores.reduce((a: number, b: number) => a + b, 0) / scores.length
          ).toFixed(2),
        ),
      };

      const studentsByGrade = summaryData.students.reduce(
        (acc: any, s: any) => {
          const g = s.grade || "N/A";
          if (!acc[g]) acc[g] = { sum: 0, count: 0 };
          acc[g].sum += s.categoryEarnedScores[cat] || 0;
          acc[g].count++;
          return acc;
        },
        {},
      );

      Object.keys(studentsByGrade).forEach((g) => {
        dataPoint[`avg_grade_${g}`] = Number(
          (studentsByGrade[g].sum / studentsByGrade[g].count).toFixed(2),
        );
      });
      return dataPoint;
    });
  }, [summaryData]);

  const ploAveragesByGrade = useMemo(() => {
    if (!Array.isArray(ploStudentData) || !summaryData?.students) return [];
    const gradeMap = summaryData.students.reduce(
      (acc: any, s: any) => ({ ...acc, [s.student_id]: s.grade || "N/A" }),
      {},
    );
    const groups: any = {};
    ploStudentData.forEach((st: any) => {
      const grade = gradeMap[st.studentId];
      if (!grade) return;
      if (!groups[grade]) groups[grade] = {};
      st.ploScores.forEach((p: any) => {
        if (!groups[grade][p.ploCode])
          groups[grade][p.ploCode] = { sum: 0, count: 0 };
        groups[grade][p.ploCode].sum += p.ploScore;
        groups[grade][p.ploCode].count++;
      });
    });
    const allPloCodes = Array.from(
      new Set(
        ploStudentData.flatMap((s: any) =>
          s.ploScores.map((p: any) => p.ploCode),
        ),
      ),
    ).sort();
    return allPloCodes.map((code) => {
      const dp: any = { name: code };
      Object.keys(groups).forEach((g) => {
        const stats = groups[g][code];
        dp[`avg_grade_${g}`] = stats
          ? Number((stats.sum / stats.count).toFixed(2))
          : 0;
      });
      return dp;
    });
  }, [ploStudentData, summaryData]);

  const gradeDistribution = useMemo(() => {
    if (!summaryData?.students) return [];
    const counts = summaryData.students.reduce((acc: any, s: any) => {
      const g = s.grade || "N/A";
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts)
      .sort()
      .map((grade) => ({ grade, count: counts[grade] }));
  }, [summaryData]);

  const getGradeColor = (grade: string) => {
    const colors: any = {
      A: "#22c55e",
      "B+": "#3b82f6",
      B: "#60a5fa",
      "C+": "#eab308",
      C: "#fde047",
      "D+": "#f97316",
      D: "#fb923c",
      F: "#ef4444",
    };
    return colors[grade] || "#94a3b8";
  };

  const formattedCLOChartData = useMemo(() => {
    const baseArray = Array.isArray(cloBalanceData)
      ? cloBalanceData
      : (cloBalanceData as any)?.cloStats || [];

    if (baseArray.length === 0 || !Array.isArray(cloStudentData)) {
      return [];
    }

    // 1. Create a quick lookup map for student data using cloCode as the key
    const studentDataMap = new Map(
      cloStudentData.map((item: any) => [item.cloCode, item]),
    );

    // 2. Merge base data with student data
    return baseArray.map((baseItem: any) => {
      const studentEntry = studentDataMap.get(baseItem.cloCode) || {};

      // Define the grades we want to extract (A, C+, F, etc.)
      // We filter out 'cloCode' so we only get the actual grade keys
      const gradeKeys = Object.keys(studentEntry).filter(
        (key) => key !== "cloCode",
      );

      const formattedGrades: any = {};
      gradeKeys.forEach((grade) => {
        const val = studentEntry[grade];
        // Format as avg_grade_A, avg_grade_C+, etc.
        formattedGrades[`avg_grade_${grade}`] = val
          ? Number(Number(val).toFixed(2))
          : 0;
      });

      return {
        ...baseItem, // Original stats (min, max, mean)
        ...formattedGrades, // Merged grade averages
      };
    });
  }, [cloBalanceData, cloStudentData]);

  const toggleLine = (key: string) =>
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));

  // --- UNIFIED CHART CONFIGURATION ---
  const metricConfig = {
    CLO: {
      title: "CLO Analysis",
      trendData: formattedCLOChartData,
      balanceData: formattedCLOChartData,
      xAxis: "cloCode",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
    },
    PLO: {
      title: "PLO Analysis",
      trendData: ploBalanceData?.ploStats || [],
      balanceData: ploAveragesByGrade,
      xAxis: "ploCode",
      maxPos: "maxPloScore",
      avg: "mean",
      max: "max",
      min: "min",
    },
    Ass: {
      title: "Assignment Analysis",
      trendData: categoryChartData,
      balanceData: categoryChartData,
      xAxis: "name",
      maxPos: "fullScore",
      avg: "allAvg",
      max: "maxScore",
      min: "minScore",
    },
  };

  

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans text-slate-900 pb-12">
      {/* 1. MASTER STICKY CONTROL PANEL */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          {/* TOP ROW: Brand & Global Filters */}
          <div className="py-4 flex flex-col justify-between gap-4 border-b border-slate-100">
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                <FaChartLine className="text-white text-lg" />
              </div>
              <h1 className="text-lg font-bold tracking-tight">
                Analytics Dashboard
              </h1>
            </div>

            {/* PERMANENT TOP FILTERS - Adjusted to 5 columns for better fit */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full max-w-5xl">
              <DropdownSelect
                options={options.universities}
                value={selections.university}
                onChange={(v) =>
                  setSelections((s) => ({ ...s, university: v as string }))
                }
                label="University"
              />
              <DropdownSelect
                options={options.faculties}
                value={selections.faculty}
                onChange={(v) =>
                  setSelections((s) => ({ ...s, faculty: v as string }))
                }
                label="Faculty"
                disabled={!selections.university}
              />
              <DropdownSelect
                options={options.programs}
                value={selections.program}
                onChange={(v) =>
                  setSelections((s) => ({ ...s, program: v as string }))
                }
                label="Program"
                disabled={!selections.faculty}
              />
              <DropdownSelect
                options={options.years}
                value={selections.year}
                onChange={(v) =>
                  setSelections((s) => ({ ...s, year: v as string }))
                }
                label="Year"
                disabled={!selections.program}
              />
              <DropdownSelect
                options={options.courses}
                value={selections.courseId}
                onChange={(v) =>
                  setSelections((s) => ({ ...s, courseId: v as string }))
                }
                label="Course"
                disabled={!selections.year}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        {!summaryData ? (
          <div className="flex flex-col items-center justify-center py-40 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <FaUniversity className="text-6xl text-slate-200 mb-4" />
            <h2 className="text-slate-400 font-semibold text-lg">
              Dashboard Ready
            </h2>
            <p className="text-slate-400 text-sm">
              Select course details above to begin analysis
            </p>
          </div>
        ) : (
          <>
            <div className="">
              {activeMetric === "CLO" && (
                <PerformanceTable
                  title="CLO Performance Analysis"
                  summaryData={summaryData}
                  cloAveragesByGrade={formattedCLOChartData}
                  getGradeColor={getGradeColor}
                />
              )}
              {activeMetric === "PLO" && (
                <PerformanceTable
                  title="PLO Performance Analysis"
                  summaryData={summaryData}
                  cloAveragesByGrade={ploAveragesByGrade}
                  getGradeColor={getGradeColor}
                />
              )}
              {activeMetric === "Ass" && (
                <PerformanceTable
                  title="Assignment Category Performance Analysis"
                  summaryData={summaryData}
                  cloAveragesByGrade={categoryChartData}
                  getGradeColor={getGradeColor}
                />
              )}
            </div>

            {/* BOTTOM ROW: Dynamic Analytics Controls */}
            {summaryData && (
              <div className="py-3 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  {/* Metric Type */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {(["CLO", "PLO", "Ass"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setActiveMetric(m)}
                        className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeMetric === m
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {m === "Ass" ? "Assignments" : m}
                      </button>
                    ))}
                  </div>

                  {/* Chart Style */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setActiveTab("line")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "line" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                    >
                      Trend
                    </button>
                    <button
                      onClick={() => setActiveTab("radar")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "radar" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                    >
                      Balance
                    </button>
                  </div>
                </div>

                {/* GRADE & AVG TOGGLES (THE BUTTONS YOU WANTED) */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
                  <ToggleButton
                    label="Max Score"
                    active={visibleLines.maxScore}
                    onClick={() => toggleLine("maxScore")}
                    color="#22c55e"
                  />
                  <ToggleButton
                    label="Min Score"
                    active={visibleLines.minScore}
                    onClick={() => toggleLine("minScore")}
                    color="#ef4444"
                  />
                  <ToggleButton
                    label="Class Average"
                    active={visibleLines.allAvg}
                    onClick={() => toggleLine("allAvg")}
                    color="#6366f1"
                  />

                  <div className="h-4 w-[1px] bg-slate-200 mx-1" />
                  {Array.from(
                    new Set(summaryData?.students?.map((s: any) => s.grade)),
                  )
                    .filter(Boolean)
                    .sort()
                    .map((grade: any) => (
                      <button
                        key={grade}
                        onClick={() => toggleLine(`avg_grade_${grade}`)}
                        className={`whitespace-nowrap px-3 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                          visibleLines[`avg_grade_${grade}`]
                            ? "bg-white shadow-sm border-slate-300 text-slate-800"
                            : "bg-slate-50 text-slate-300 border-transparent opacity-50"
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getGradeColor(grade) }}
                        />
                        {grade}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                    <FaThLarge />
                  </div>
                  <h3 className="font-bold text-slate-800">
                    {metricConfig[activeMetric].title} Visualization
                  </h3>
                </div>
                <div className="p-8 h-[500px]">
                  {activeTab === "line" ? (
                    <PerformanceTrendChart
                      chartData={metricConfig[activeMetric].trendData}
                      xAxisKey={metricConfig[activeMetric].xAxis}
                      maxScorePosKey={metricConfig[activeMetric].maxPos}
                      maxScoreKey={metricConfig[activeMetric].max}
                      minScoreKey={metricConfig[activeMetric].min}
                      allAvgKey={metricConfig[activeMetric].avg}
                      summaryData={summaryData}
                      visibleLines={visibleLines}
                      getGradeColor={getGradeColor}
                    />
                  ) : (
                    <PerformanceBalanceChart
                      chartData={metricConfig[activeMetric].trendData}
                      xAxisKey={metricConfig[activeMetric].xAxis}
                      maxScorePosKey={metricConfig[activeMetric].maxPos}
                      maxScoreKey={metricConfig[activeMetric].max}
                      minScoreKey={metricConfig[activeMetric].min}
                      allAvgKey={metricConfig[activeMetric].avg}
                      summaryData={summaryData}
                      visibleLines={visibleLines}
                      getGradeColor={getGradeColor}
                    />
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl shadow-sm p-8 flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                    <FaUserGraduate />
                  </div>
                  <h3 className="font-bold text-slate-800">
                    Grade Distribution
                  </h3>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <GradeDistributionChart data={gradeDistribution} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
