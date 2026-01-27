"use client";

import React, { useState, useMemo, useEffect } from "react";
import DropdownSelect from "@/components/DropdownSelect";
import { ToggleButton } from "./viewChartComponent/ToggleButton";
import { PerformanceTrendChart } from "./viewChartComponent/PerformanceTrendChart";
import { PerformanceBalanceChart } from "./viewChartComponent/PerformanceBalanceChart";
import {
  ComposedChart,
  Bar,
  LabelList,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarRadiusAxis,
  PolarGrid,
  PolarAngleAxis,
  AreaChart,
  Area,
} from "recharts";
import {
  FaChartPie,
  FaLayerGroup,
  FaGraduationCap,
  FaSpider,
  FaTable,
  FaUserGraduate,
  FaBook,
  FaBullseye,
  FaChartLine,
} from "react-icons/fa";
import { apiClient } from "@/utils/apiClient";
import { Course } from "@/utils/courseApi";
import { Program } from "@/utils/programApi";
import { University } from "@/utils/universityApi";
import { Faculty } from "@/utils/facultyApi";

// --- TYPES ---
const AXIS_NAMES = ["C1", "C2", "C3", "C4", "C5", "C6"];

interface PLOData {
  name: string;
  total: number;
  average: number;
  max: number;
  min: number;
}

interface GradeData {
  name: string;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  c6: number;
  color: string;
  [key: string]: string | number;
}

interface StudentCountData {
  grade: string;
  count: number;
  color: string;
}

interface CourseData {
  id: number;
  name: string;
  ploData: PLOData[];
  gradeData: GradeData[];
  studentData: StudentCountData[];
}

interface MergedChartData extends PLOData {
  [key: string]: string | number;
}

// --- MOCK DATA ---
const ALL_COURSES: CourseData[] = [
  {
    id: 1,
    name: "Course 101: Introduction to Programming",
    ploData: [
      { name: "C1", total: 8.7, average: 6.5, max: 7.5, min: 2.5 },
      { name: "C2", total: 15.7, average: 12.5, max: 14.0, min: 5.5 },
      { name: "C3", total: 8.0, average: 4.5, max: 6.8, min: 1.5 },
      { name: "C4", total: 16.2, average: 8.5, max: 13.5, min: 3.5 },
      { name: "C5", total: 31.8, average: 25.5, max: 29.0, min: 10.5 },
      { name: "C6", total: 19.6, average: 11.5, max: 17.5, min: 4.5 },
    ],
    gradeData: [
      {
        name: "A",
        c1: 6.94,
        c2: 13.76,
        c3: 6.3,
        c4: 10.18,
        c5: 28.54,
        c6: 15.74,
        color: "#9333ea",
      },
      {
        name: "B",
        c1: 7.0,
        c2: 13.48,
        c3: 5.3,
        c4: 9.3,
        c5: 28.2,
        c6: 14.03,
        color: "#2563eb",
      },
      {
        name: "C",
        c1: 6.45,
        c2: 12.51,
        c3: 4.53,
        c4: 8.63,
        c5: 25.86,
        c6: 11.64,
        color: "#059669",
      },
      {
        name: "D",
        c1: 6.39,
        c2: 11.78,
        c3: 3.51,
        c4: 7.82,
        c5: 23.91,
        c6: 9.16,
        color: "#d97706",
      },
      {
        name: "F",
        c1: 6.28,
        c2: 11.19,
        c3: 2.24,
        c4: 5.84,
        c5: 21.56,
        c6: 8.64,
        color: "#dc2626",
      },
    ],
    studentData: [
      { grade: "A", count: 12, color: "#9333ea" },
      { grade: "B", count: 25, color: "#2563eb" },
      { grade: "C", count: 18, color: "#059669" },
      { grade: "D", count: 8, color: "#d97706" },
      { grade: "F", count: 2, color: "#dc2626" },
    ],
  },
  {
    id: 2,
    name: "Course 202: Data Structures",
    ploData: [
      { name: "C1", total: 9.5, average: 7.0, max: 8.5, min: 3.0 },
      { name: "C2", total: 14.2, average: 11.0, max: 13.0, min: 6.0 },
      { name: "C3", total: 10.1, average: 5.5, max: 8.0, min: 2.0 },
      { name: "C4", total: 15.5, average: 9.0, max: 12.5, min: 4.0 },
      { name: "C5", total: 30.4, average: 26.0, max: 28.5, min: 11.0 },
      { name: "C6", total: 18.3, average: 12.0, max: 16.0, min: 5.0 },
    ],
    gradeData: [
      {
        name: "A",
        c1: 7.5,
        c2: 12.8,
        c3: 7.0,
        c4: 11.0,
        c5: 27.5,
        c6: 16.0,
        color: "#9333ea",
      },
      {
        name: "B",
        c1: 7.2,
        c2: 12.0,
        c3: 6.0,
        c4: 10.0,
        c5: 26.5,
        c6: 14.5,
        color: "#2563eb",
      },
      {
        name: "C",
        c1: 6.8,
        c2: 11.5,
        c3: 5.0,
        c4: 9.0,
        c5: 24.0,
        c6: 12.0,
        color: "#059669",
      },
      {
        name: "D",
        c1: 6.5,
        c2: 10.5,
        c3: 3.5,
        c4: 8.0,
        c5: 22.0,
        c6: 9.5,
        color: "#d97706",
      },
      {
        name: "F",
        c1: 6.0,
        c2: 9.5,
        c3: 2.0,
        c4: 6.0,
        c5: 20.0,
        c6: 8.0,
        color: "#dc2626",
      },
    ],
    studentData: [
      { grade: "A", count: 10, color: "#9333ea" },
      { grade: "B", count: 22, color: "#2563eb" },
      { grade: "C", count: 20, color: "#059669" },
      { grade: "D", count: 12, color: "#d97706" },
      { grade: "F", count: 5, color: "#dc2626" },
    ],
  },
];

export default function PLOChart() {
  const [selectedCourseId, setSelectedCourseId] = useState(ALL_COURSES[0].id);

  const currentCourse =
    ALL_COURSES.find((c) => c.id === selectedCourseId) || ALL_COURSES[0];

  const token = localStorage.getItem("token") || "";

  //calling Api
  const [courseOptions, setCourseOptions] = useState<
    { label: string; value: number }[]
  >([]);
  const [universitysOptions, setUniversitiesOptions] = useState<
    { label: string; value: number }[]
  >([]);
  const [programsOptions, setProgramsOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [facultysOptions, setFacultysOptions] = useState<
    { label: string; value: number }[]
  >([]);
  const [yearsOptions, setYearsOptions] = useState<
    { label: string; value: number }[]
  >([]);

  const [courseIdApi, setCourseIdApi] = useState<string>("");
  const [program, setProgram] = useState<string>("");
  const [university, setUniversity] = useState<string>("");
  const [faculty, setFaculty] = useState<string>("");
  const [year, setYear] = useState<string>("");

  const fetchUniversitysData = async () => {
    try {
      const res = await apiClient.get(`/university`);
      setUniversitiesOptions(
        res.data.map((university: University) => ({
          label: university.name,
          value: university.id,
        })),
      );
    } catch (err) {
      console.error("Failed to fetch universities", err);
    }
  };

  const fetchFacultysData = async () => {
    try {
      const res = await apiClient.get(`/faculty`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { university_id: university },
      });
      setFacultysOptions(
        res.data.map((faculty: Faculty) => ({
          label: faculty.name,
          value: faculty.id,
        })),
      );
    } catch (err) {
      console.error("Failed to fetch faculties", err);
    }
  };

  const fetchProgramData = async () => {
    try {
      const res = await apiClient.get(`/program`); // Assuming your endpoint
      const data: Program[] = res.data;

      // Use a Map to keep only one entry per unique program_code
      const uniquePrograms = Array.from(
        new Map(data.map((p) => [p.program_code, p])).values(),
      );

      setProgramsOptions(
        uniquePrograms.map((program) => ({
          label: `${program.program_shortname_en}`,
          value: program.program_code, // Store CODE as value, not ID yet
        })),
      );

      // Keep the full raw data in a ref or state to filter years later
    } catch (err) {
      console.error("Failed to fetch programs", err);
    }
  };

  const fetchYearsData = async (programCode: string) => {
    try {
      const res = await apiClient.get(`/program`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { program_code: programCode },
      });

      const yearOptions = res.data
        // 1. Filter: Keep only programs that match the selected code
        .filter((p: Program) => p.program_code === programCode)
        // 2. Map: Convert the filtered list into dropdown options
        .map((p: Program) => ({
          label: p.program_year.toString(),
          value: p.id,
        }));

      setYearsOptions(yearOptions);
    } catch (err) {
      console.error("Failed to fetch years", err);
    }
  };

  const fetchCourseData = async () => {
    try {
      const res = await apiClient.get(`/course/forSummary`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { programId: year },
      });
      setCourseOptions(
        res.data.map((course: Course) => ({
          label: `${course.code} - ${course.name}`,
          value: course.id,
        })),
      );
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  };

  const [summaryData, setSummaryData] = useState<any>(null);

  const fetchSummaryData = async () => {
    try {
      const res = await apiClient.get(`/reports/gradeSummary`, {
        params: { courseId: courseIdApi },
      });
      setSummaryData(res.data);
    } catch (err) {
      console.error("Failed to fetch summary data", err);
    }
  };

  const chartData = useMemo(() => {
    if (!summaryData?.categoryFullScores || !summaryData?.students) return [];

    const categories = Object.keys(summaryData.categoryFullScores);
    const studentsByGrade: Record<string, any[]> = summaryData.students.reduce(
      (acc: any, student: any) => {
        const g = student.grade || "N/A";
        if (!acc[g]) acc[g] = [];
        acc[g].push(student);
        return acc;
      },
      {},
    );

    return categories.map((cat) => {
      const allScores = summaryData.students.map(
        (s: any) => s.categoryEarnedScores[cat] || 0,
      );

      // Calculate Global Average
      const globalSum = allScores.reduce((a, b) => a + b, 0);
      const globalAvg = globalSum / allScores.length;

      const dataPoint: any = {
        name: cat,
        fullScore: summaryData.categoryFullScores[cat],
        maxScore: Math.max(...allScores),
        minScore: Math.min(...allScores),
        allAvg: Number(globalAvg.toFixed(2)), // THE GLOBAL AVERAGE
      };

      Object.keys(studentsByGrade).forEach((grade) => {
        const group = studentsByGrade[grade];
        const totalEarned = group.reduce(
          (sum, s) => sum + (s.categoryEarnedScores[cat] || 0),
          0,
        );
        dataPoint[`avg_grade_${grade}`] = Number(
          (totalEarned / group.length).toFixed(2),
        );
      });

      return dataPoint;
    });
  }, [summaryData]);

  const gradeDistributionData = useMemo(() => {
    if (!summaryData?.students) return [];

    // 1. Group and count students per grade
    const counts: Record<string, number> = summaryData.students.reduce(
      (acc: any, student: any) => {
        const g = student.grade || "N/A";
        acc[g] = (acc[g] || 0) + 1;
        return acc;
      },
      {},
    );

    // 2. Convert to array and sort by grade (A, B, C...)
    return Object.keys(counts)
      .sort()
      .map((grade) => ({
        grade,
        count: counts[grade],
      }));
  }, [summaryData]);

  // Initial state: Show Max, Min, and All Average by default
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    maxScore: true,
    minScore: true,
    allAvg: true,
    // Grade lines will be added to this object dynamically via the buttons
  });

  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getGradeColor = (grade: string): string => {
    const colors: Record<string, string> = {
      A: "#22c55e",
      B: "#3b82f6",
      C: "#eab308",
      D: "#f97316",
      F: "#ef4444",
    };
    return colors[grade] || "#94a3b8";
  };

  const [activeTab, setActiveTab] = useState<"line" | "radar">("line");

  // Refined useEffect logic
  useEffect(() => {
    fetchUniversitysData();
    fetchProgramData();
  }, []);

  useEffect(() => {
    if (university) fetchFacultysData();
  }, [university]);

  useEffect(() => {
    if (program) fetchYearsData(program);
  }, [program]);

  useEffect(() => {
    if (year) fetchCourseData();
  }, [year]);

  useEffect(() => {
    if (courseIdApi) fetchSummaryData();
  }, [courseIdApi]);

  return (
    <div className="bg-[#f8fafc] p-4 md:p-8 min-h-screen font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* --- FILTER DROPDOWN --- */}
        <div className="flex gap-3 md:gap-6 mb-4 flex-wrap">
          <DropdownSelect
            options={universitysOptions}
            value={university}
            onChange={(value) => setUniversity((value as string) || "")}
            label="university"
          />
          <DropdownSelect
            options={facultysOptions}
            value={faculty}
            onChange={(value) => setFaculty((value as string) || "")}
            label="faculty"
            disabled={!university}
          />
          <DropdownSelect
            options={programsOptions}
            value={program}
            onChange={(value) => setProgram((value as string) || "")}
            label="program"
            disabled={!faculty}
          />
          <DropdownSelect
            options={yearsOptions}
            value={year}
            onChange={(value) => setYear((value as string) || "")}
            label="year"
            disabled={!program}
          />
        </div>
        {/* HEADER */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FaChartPie className="text-blue-600 text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800">
                PLO Achievement Dashboard
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Detailed competency analysis
              </p>
            </div>
          </div>
          <div className="relative">
            <FaBook className="absolute left-3 top-3.5 text-slate-400" />

            <DropdownSelect
              options={courseOptions}
              value={courseIdApi}
              onChange={(value) => {
                setCourseIdApi((value as string) || "");
                console.log(summaryData);
              }}
              disabled={!year}
            />
          </div>
        </div>

        {/* --- COMPARISON CHART --- */}
        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* 1. HEADER SECTION */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <FaChartPie className="text-blue-500" /> Comparison Analysis
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Compare grade benchmarks against class performance
                </p>
              </div>

              {/* TAB SWITCHER */}
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => setActiveTab("line")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm transition-all ${
                    activeTab === "line"
                      ? "bg-blue-500 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <FaChartLine /> Trend
                </button>
                <button
                  onClick={() => setActiveTab("radar")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm transition-all ${
                    activeTab === "radar"
                      ? "bg-blue-500 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <FaBullseye /> Balance
                </button>
              </div>
            </div>

            {/* 2. SHARED TOOLBAR */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                <ToggleButton
                  label="Max"
                  active={!!visibleLines.maxScore}
                  onClick={() => toggleLine("maxScore")}
                  color="#22c55e"
                />
                <ToggleButton
                  label="Min"
                  active={!!visibleLines.minScore}
                  onClick={() => toggleLine("minScore")}
                  color="#ef4444"
                />
                <ToggleButton
                  label="Class Avg"
                  active={!!visibleLines.allAvg}
                  onClick={() => toggleLine("allAvg")}
                  color="#6366f1"
                />
              </div>

              <div className="w-[1px] h-6 bg-slate-300 mx-1 hidden md:block" />

              <div className="flex flex-wrap gap-2">
                {(
                  Array.from(
                    new Set(summaryData?.students.map((s: any) => s.grade)),
                  ) as string[]
                )
                  .filter(Boolean)
                  .sort()
                  .map((grade) => (
                    <ToggleButton
                      key={grade}
                      label={`Grade ${grade}`}
                      active={!!visibleLines[`avg_grade_${grade}`]}
                      onClick={() => toggleLine(`avg_grade_${grade}`)}
                      color={getGradeColor(grade)}
                    />
                  ))}
              </div>
            </div>
          </div>

          {/* 3. CHART AREA */}
          <div className="p-6">
            <div className="h-[450px] w-full flex items-center justify-center">
              {summaryData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === "line" ? (
                    <PerformanceTrendChart
                      chartData={chartData}
                      summaryData={summaryData}
                      visibleLines={visibleLines}
                      getGradeColor={getGradeColor}
                    />
                  ) : (
                    <PerformanceBalanceChart
                      chartData={chartData}
                      summaryData={summaryData}
                      visibleLines={visibleLines}
                      getGradeColor={getGradeColor}
                    />
                  )}
                </ResponsiveContainer>
              ) : (
                /* NO DATA PLACEHOLDER */
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-4 bg-slate-50 rounded-full">
                    <FaChartPie className="text-slate-300 text-4xl" />
                  </div>
                  <div>
                    <p className="text-slate-600 font-semibold">
                      No Comparison Data Available
                    </p>
                    <p className="text-slate-400 text-sm">
                      Select a course or update grades to see analysis.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- INSIGHT SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase">
              Top Competency
            </p>
            <h4 className="text-2xl font-black text-emerald-600">
              {
                currentCourse.ploData.reduce((prev, curr) =>
                  prev.average > curr.average ? prev : curr,
                ).name
              }
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Highest average achievement
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
            <p className="text-xs font-bold text-slate-500 uppercase">
              PLO Gap Alert
            </p>
            <h4 className="text-2xl font-black text-amber-600">
              {
                currentCourse.ploData.filter((p) => p.average < p.max * 0.5)
                  .length
              }{" "}
              Metrics
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Achieved less than 50% of Max
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase">
              Student Success
            </p>
            <h4 className="text-2xl font-black text-blue-600">
              {(
                (currentCourse.studentData
                  .filter((s) => s.grade !== "F")
                  .reduce((a, b) => a + b.count, 0) /
                  currentCourse.studentData.reduce((a, b) => a + b.count, 0)) *
                100
              ).toFixed(1)}
              %
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Overall Pass Rate (A-D)
            </p>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <FaTable className="text-slate-400" /> Assessment Grid
            </h3>
            <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded uppercase">
              {currentCourse.name}
            </span>
          </div>
          <div className="overflow-x-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                  <tr>
                    <th className="px-6 py-4">Grade</th>
                    {AXIS_NAMES.map((n) => (
                      <th key={n} className="px-6 py-4 text-center">
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentCourse.gradeData.map((grade) => (
                    <tr
                      key={grade.name}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: grade.color }}
                          ></span>
                          Grade {grade.name}
                        </div>
                      </td>
                      {[
                        grade.c1,
                        grade.c2,
                        grade.c3,
                        grade.c4,
                        grade.c5,
                        grade.c6,
                      ].map((v, i) => (
                        <td
                          key={i}
                          className="px-6 py-4 text-center text-slate-600"
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>

                {/* --- ADDED FOOTER FOR AVERAGES --- */}
                <tfoot className="bg-slate-100 border-t-2 border-slate-200 font-bold">
                  <tr>
                    <td className="px-6 py-4 text-slate-900">
                      <div className="flex items-center gap-2">
                        <FaLayerGroup className="text-blue-600" />
                        Class Average
                      </div>
                    </td>
                    {AXIS_NAMES.map((n) => {
                      // Find the average for this specific 'C' from ploData
                      const metric = currentCourse.ploData.find(
                        (p) => p.name === n,
                      );
                      return (
                        <td
                          key={n}
                          className="px-6 py-4 text-center text-blue-700 text-base"
                        >
                          {metric ? metric.average.toFixed(2) : "0.00"}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* DISTRIBUTION */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-black flex items-center gap-2 mb-6">
            <FaUserGraduate className="text-emerald-500" /> Grade Distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {gradeDistributionData.length > 0 ? (
                <AreaChart
                  data={gradeDistributionData} // Use the new transformed data
                  margin={{ top: 30, right: 30, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="grade"
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    allowDecimals={false} // Since you can't have half a student
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Number of Students"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#colorCount)"
                    animationDuration={1500}
                  >
                    <LabelList
                      dataKey="count"
                      position="top"
                      offset={15}
                      fill="#065f46" // Darker emerald for text readability
                      style={{ fontWeight: "600", fontSize: "12px" }}
                    />
                  </Area>
                </AreaChart>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                  No grade data available
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
