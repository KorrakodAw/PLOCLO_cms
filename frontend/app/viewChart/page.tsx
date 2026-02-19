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
import { useToast } from "@/components/Toast";

import { ToggleButton } from "./viewChartComponent/ToggleButton";
import Table, { Column } from "@/components/Table";
import { useAuth } from "../context/AuthContext";
import { getUniversities, University } from "@/utils/universityApi";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useTranslation } from "react-i18next";
import { Faculty, getFaculties } from "@/utils/facultyApi";

interface Option {
  label: string;
  value: string;
}

export default function PLOChart() {
  const { token, user } = useAuth();
  // --- STATE MANAGEMENT ---
  const [options, setOptions] = useState<{
    universities: Option[];
    faculties: Option[];
    programs: Option[];
    years: Option[];
    courses: Option[];
  }>({
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
  const [loading, setLoading] = useState<boolean>(false);

  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

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

  useEffect(() => {
    const saved = localStorage.getItem("edit_program_filters");
    if (saved && token) {
      try {
        const parsed = JSON.parse(saved);
        setSelections(parsed);
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }
  }, [token]);

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

  const [isInitialized, setIsInitialized] = useState(false); // Flag to prevent double fetch

  const isInstructor = user?.role === "instructor";
  const isStudent = user?.role === "student";

  useEffect(() => {
    if (!token) return;

    const initialize = async () => {
      try {
        setLoading(true);

        const uniData = await getUniversities(token);
        const formattedUni = uniData.map((u: University) => ({
          label: lang === "th" ? u.name_th : u.name,
          value: String(u.id),
        }));

        if (isInstructor && user?.email) {
          const instructorRes = await apiClient.get(
            `/instructor/email/${user.email}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const facultyId = instructorRes.data?.faculty_id;

          const facultyRes = await apiClient.get(`faculty/${facultyId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const facultyData = facultyRes.data;

          const facultiesData = await getFaculties(
            token,
            String(facultyData.university_id),
          );
          const formattedFacs = facultiesData.map((f: Faculty) => ({
            label: lang === "th" ? f.name_th : f.name,
            value: String(f.id),
          }));

          setOptions({
            universities: [{ label: t("all"), value: "" }, ...formattedUni],
            faculties: formattedFacs,
            programs: [],
            years: [],
            courses: [],
          });

          setSelections({
            university: String(facultyData.university_id),
            faculty: String(facultyData.id),
            program: "",
            year: "",
            courseId: "",
          });
        } else {
          setOptions((prev) => ({
            ...prev,
            universities: formattedUni,
          }));
        }
      } catch {
        showToast("Failed to load initial data", "error");
      } finally {
        setIsInitialized(true);
        setLoading(false);
      }
    };
    initialize();
  }, [token, lang, user?.email, user?.role, t]);

  useEffect(() => {
    if (!isInitialized || isInstructor || !token) return;
    if (selections.university) {
      fetchData("/faculty", { university_id: selections.university }).then(
        (data) => {
          if (data) {
            setOptions((prev: any) => ({
              ...prev,
              faculties: data.map((f: any) => ({
                label: lang === "th" ? f.name_th : f.name,
                value: String(f.id),
              })),
            }));
          }
        },
      );
      // setSelections((s) => ({
      //   ...s,
      //   faculty: "",
      //   program: "",
      //   year: "",
      //   courseId: "",
      // }));
    }
  }, [selections.university, token, lang, isInitialized]);

  useEffect(() => {
    // if (!isInitialized || isInstructor || !token) return;
    if (selections.faculty) {
      fetchData("/program", { facultyId: selections.faculty }).then((data) => {
        if (data) {
          const unique = Array.from(
            new Map(data.map((p: any) => [p.program_code, p])).values(),
          );
          setOptions((prev: any) => ({
            ...prev,
            programs: unique.map((p: any) => ({
              label:
                lang === "th" ? p.program_shortname_th : p.program_shortname_en,
              value: p.program_code,
            })),
            years: [],
            courses: [],
          }));
        }
      });
      // setSelections((s) => ({ ...s, program: "", year: "", courseId: "" }));
    }
  }, [selections.faculty]);

  const handleClear = () => {
    localStorage.removeItem("edit_program_filters");
    if (isInstructor) {
    } else {
      setSelections({
        university: "",
        faculty: "",
        program: "",
        year: "",
        courseId: "",
      });
    }
  };

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
      // setSelections((s) => ({ ...s, year: "", courseId: "" }));
    }
  }, [selections.program]);

  useEffect(() => {
    console.log(selections.year);

    if (selections.year) {
      fetchData("/course/forSummary", { programId: selections.year }).then(
        (data) =>
          data &&
          setOptions((prev: any) => ({
            ...prev,
            courses: data.map((c: any) => ({
              label:
                `${c.code}` +
                (lang === "th" ? ` ${c.name_th}` : ` ${c.name_en}`),
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

  const [studentCourseCloScoreData, setStudentCourseCloScoreData] = useState<
    any[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get(
          `/calculation/ass-clo/allStudentCourse?courseId=${selections.courseId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        // 1. Get the array from the response object
        const rawList = res.data.cloScoresPerStudent || [];

        // 2. Transform (flatten) the data so the table can map it easily
        const flattenedData = rawList.map((item: any) => {
          // Create the base row object
          const row: any = {
            studentId: item.student_id,
            studentName: item.studentName || `Student ${item.student_id}`,
            studentCode: item.student_code || "",
          };

          // Turn the cloScores array into direct keys (e.g., { CLO1: 8.45, CLO2: 14.09 })
          item.cloScores.forEach((clo: any) => {
            row[clo.cloCode] = clo.cloScore;
          });

          return row;
        });

        // 3. Set the state with the ARRAY, not the object
        setStudentCourseCloScoreData(flattenedData);
      } catch (error) {
        showToast("Failed to fetch data", "error");
        console.error(error);
      }
    };

    if (token && selections.courseId) fetchData();
  }, [token, selections.courseId]);

  const [studentCourseAssScoreData, setStudentCourseAssScoreData] = useState<
    any[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get(
          `/calculation/realScoreAndGrade/allStudentCourse`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { courseId: selections.courseId },
          },
        );

        const rawResults = res.data.studentResults || [];

        console.log(res.data);

        // 1. First, find EVERY unique category across all students
        const allCategories = new Set<string>();
        rawResults.forEach((s: any) => {
          s.categoryScores?.forEach((c: any) => allCategories.add(c.category));
        });

        // 2. Map the data and fill in missing categories with "0.00"
        const flattened = rawResults.map((student: any) => {
          const row: any = {
            studentCode: student.studentCode || "",
            studentName: student.studentName,
            totalScore: (student.totalScore ?? 0).toFixed(2),
            grade: student.grade || "F",
          };

          // Pre-fill all known categories with "0.00"
          allCategories.forEach((cat) => {
            row[cat] = "0.00";
          });

          // Overwrite with real scores where they exist
          student.categoryScores?.forEach((c: any) => {
            row[c.category] = Number(c.realScore ?? 0).toFixed(2);
          });

          return row;
        });

        setStudentCourseAssScoreData(flattened);
      } catch (error) {
        console.error("Error fetching student course data:", error);
      }
    };

    if (token && selections.courseId) {
      fetchData();
    }
  }, [token, selections.courseId]);

  const CloScoreColumns: Column<any>[] = [
    { header: "Student Code", accessor: "studentCode" },
    { header: "Student Name", accessor: "studentName" },
    ...Object.keys(studentCourseCloScoreData[0] || {})
      .filter((key) => key.startsWith("CLO"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((clo) => ({ header: clo, accessor: clo })),
  ];

  const AssScoreColumn: Column<any>[] = [
    { header: "Student Code", accessor: "studentCode" },
    { header: "Student Name", accessor: "studentName" },

    // 1. We look at the first student's data to find all categories
    ...(studentCourseAssScoreData[0]
      ? Object.keys(studentCourseAssScoreData[0])
          .filter(
            (key) =>
              !["studentName", "totalScore", "grade", "studentCode"].includes(
                key,
              ),
          )
          .map((cat) => ({
            header: cat.charAt(0).toUpperCase() + cat.slice(1), // e.g. "midtermExam" -> "MidtermExam"
            accessor: cat,
          }))
      : []),

    // 2. Add summary columns at the end
    // { header: "Total Score", accessor: "totalScore" },
    // { header: "Grade", accessor: "grade" },
  ];

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-900 pb-12">
      {loading && <LoadingOverlay />}
      <ToastElement />

      {/* 1. TOP STICKY FILTERS */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col gap-6">
            {/* 1. Dashboard Header Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
                  <FaChartLine className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-800 leading-none">
                    Analytics Dashboard
                  </h1>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Course Performance & Outcome Tracking
                  </p>
                </div>
              </div>

              {/* Quick Summary Badge (Optional UX addition) */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Live Data Updated
                </span>
              </div>
            </div>

            {/* 2. Unified Filter Section */}
            <div className="bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
                <DropdownSelect
                  label="University"
                  options={options.universities}
                  value={selections.university}
                  disabled={isInstructor}
                  onChange={(v) =>
                    setSelections({
                      university: v as string,
                      faculty: "",
                      program: "",
                      year: "",
                      courseId: "",
                    })
                  }
                />

                <DropdownSelect
                  label="Faculty"
                  options={options.faculties}
                  value={selections.faculty}
                  disabled={!selections.university || isInstructor}
                  onChange={(v) =>
                    setSelections({
                      ...selections,
                      faculty: v as string,
                      program: "",
                      year: "",
                      courseId: "",
                    })
                  }
                />

                <DropdownSelect
                  label="Program"
                  options={options.programs}
                  value={selections.program}
                  disabled={!selections.faculty}
                  onChange={(v) =>
                    setSelections({
                      ...selections,
                      program: v as string,
                      year: "",
                      courseId: "",
                    })
                  }
                />

                <DropdownSelect
                  label="Year"
                  options={options.years}
                  value={selections.year}
                  disabled={!selections.program}
                  onChange={(v) =>
                    setSelections({
                      ...selections,
                      year: v as string,
                      courseId: "",
                    })
                  }
                />

                <DropdownSelect
                  label="Course"
                  options={options.courses}
                  value={selections.courseId}
                  disabled={!selections.year}
                  onChange={(v) =>
                    setSelections({
                      ...selections,
                      courseId: v as string,
                    })
                  }
                />

                {/* Action Button: Clear */}
                <button
                  onClick={handleClear}
                  className="h-[42px] flex items-center justify-center gap-2 px-6 text-sm font-bold text-slate-400 hover:text-orange-600 bg-white border border-slate-200 rounded-xl transition-all duration-200 hover:border-orange-200 hover:bg-orange-50 hover:shadow-md active:scale-95"
                >
                  <span className="text-lg">↺</span>
                  {t("clear")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        {!summaryData ? (
          <div className="flex flex-col items-center justify-center py-40 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <FaUniversity className="text-6xl text-slate-100 mb-4" />
            <h2 className="text-slate-400 font-semibold">
              Select course details to begin
            </h2>
          </div>
        ) : (
          <>
            {/* A. PERFORMANCE TABLES SECTION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold text-slate-800">
                  Individual Student Performance
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(["CLO", "PLO", "Ass"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setActiveMetric(m)}
                      className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeMetric === m ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      {m === "Ass" ? "Assignments" : m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                {activeMetric === "CLO" &&
                  studentCourseCloScoreData.length > 0 && (
                    <Table
                      columns={CloScoreColumns}
                      data={studentCourseCloScoreData}
                    />
                  )}
                {activeMetric === "Ass" &&
                  studentCourseAssScoreData.length > 0 && (
                    <Table
                      columns={AssScoreColumn}
                      data={studentCourseAssScoreData}
                    />
                  )}
              </div>
            </div>

            {/* B. ANALYTICS CONTROL PANEL (MOVED HERE) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest">
                  Chart Style:
                </span>
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

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full lg:w-auto">
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
                  label="Class Avg"
                  active={visibleLines.allAvg}
                  onClick={() => toggleLine("allAvg")}
                  color="#6366f1"
                />
                <div className="h-6 w-px bg-slate-200 mx-2" />
                {Array.from(
                  new Set(summaryData?.students?.map((s: any) => s.grade)),
                )
                  .filter(Boolean)
                  .sort()
                  .map((grade: any) => (
                    <button
                      key={grade}
                      onClick={() => toggleLine(`avg_grade_${grade}`)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${visibleLines[`avg_grade_${grade}`] ? "bg-white shadow-sm border-slate-300 text-slate-800" : "bg-slate-50 text-slate-300 border-transparent opacity-50"}`}
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

            {/* C. VISUALIZATION SECTION */}
            <div className="flex flex-col gap-8">
              <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600 shadow-inner">
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

              <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-sm p-8 flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 shadow-inner">
                    <FaUserGraduate />
                  </div>
                  <h3 className="font-bold text-slate-800">
                    Grade Distribution
                  </h3>
                </div>
                <div className="h-[400px]">
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
