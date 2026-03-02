/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FaChartLine,
  FaUniversity,
  FaThLarge,
  FaCamera,
  FaFileExcel,
} from "react-icons/fa";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import DropdownSelect from "@/components/DropdownSelect";
import { apiClient } from "@/utils/apiClient";
import { PerformanceTrendChart } from "./viewChartComponent/PerformanceTrendChart";
import { PerformanceBalanceChart } from "./viewChartComponent/PerformanceBalanceChart";
import { useToast } from "@/components/Toast";
import { ToggleButton } from "./viewChartComponent/ToggleButton";
import Table from "@/components/Table";
import { useAuth } from "../context/AuthContext";
import { getUniversities, University } from "@/utils/universityApi";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useTranslation } from "react-i18next";

export default function PLOChart() {
  const { token, user } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  const graphRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOptionsLoaded, setIsOptionsLoaded] = useState({
    years: false,
    courses: false,
  });

  const [options, setOptions] = useState({
    universities: [] as any[],
    faculties: [] as any[],
    programs: [] as any[],
    years: [] as any[],
    courses: [] as any[],
  });

  const [selections, setSelections] = useState({
    university: "",
    faculty: "",
    program: "",
    year: "",
    courseId: "",
  });

  const [students, setStudents] = useState<any[]>([]);
  const [cloStudentData, setCloStudentData] = useState<any>(null);
  const [ploStudentData, setPloStudentData] = useState<any>(null);
  const [cloBalanceData, setCloBalanceData] = useState<any>(null);
  const [ploBalanceData, setPloBalanceData] = useState<any>(null);
  const [studentCourseAssScoreData, setStudentCourseAssScoreData] = useState<
    any[]
  >([]);
  const [assignmentBalanceData, setAssignmentBalanceData] = useState<any>(null);

  const [activeMetric, setActiveMetric] = useState<"CLO" | "PLO" | "Ass">(
    "CLO",
  );
  const [activeTab, setActiveTab] = useState<"line" | "radar">("line");
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    maxScore: true,
    minScore: true,
    allAvg: true,
  });

  // 🟢 1. ฟังก์ชัน Capture รูปภาพที่แก้ปัญหา oklch และ Animation
  // const handleCaptureGraph = async () => {
  //   if (!graphRef.current) return;
  //   try {
  //     setLoading(true);
  //     // รอให้ UI นิ่ง
  //     await new Promise((r) => setTimeout(r, 600));

  //     const canvas = await html2canvas(graphRef.current, {
  //       scale: 2,
  //       useCORS: true,
  //       backgroundColor: "#ffffff",
  //       width: graphRef.current.offsetWidth,
  //       height: graphRef.current.offsetHeight,
  //       onclone: (clonedDoc) => {
  //         const el = clonedDoc.getElementById("analytics-graph-container");
  //         if (el) {
  //           el.style.backgroundColor = "#ffffff";
  //           // แก้ไขปัญหา oklch โดยบังคับสีมาตรฐาน
  //           const all = el.querySelectorAll("*");
  //           all.forEach((c: any) => {
  //             const style = window.getComputedStyle(c);
  //             if (style.backgroundColor.includes("oklch"))
  //               c.style.backgroundColor = "#ffffff";
  //             if (style.color.includes("oklch")) c.style.color = "#171717";
  //             if (style.borderColor.includes("oklch"))
  //               c.style.borderColor = "#e2e8f0";
  //           });
  //         }
  //       },
  //     });

  //     const link = document.createElement("a");
  //     link.download = `Performance_Analysis_${new Date().getTime()}.png`;
  //     link.href = canvas.toDataURL("image/png");
  //     link.click();
  //     showToast("บันทึกรูปภาพสำเร็จ!", "success");
  //   } catch (e) {
  //     showToast("ไม่สามารถบันทึกภาพได้", "error");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // 🟢 2. ฟังก์ชัน Export Excel รวมทุก Sheet
  const handleExportAllExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // สร้าง Sheet สำหรับแต่ละข้อมูล
      const sheets = [
        { data: flattenedCLOTableData, name: "CLO_Scores" },
        { data: flattenedPLOTableData, name: "PLO_Scores" },
        { data: flattenedAssTableData, name: "Assignment_Scores" },
      ];

      sheets.forEach((s) => {
        if (s.data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(s.data);
          XLSX.utils.book_append_sheet(workbook, ws, s.label || s.name);
        }
      });

      XLSX.writeFile(
        workbook,
        `Academic_Report_${new Date().getFullYear()}.xlsx`,
      );
      showToast("Exported all data to Excel!", "success");
    } catch (e) {
      showToast("Export failed", "error");
    }
  };

  // --- Data Formatting Memos (ตามที่คุณเขียนไว้) ---
  const flattenedCLOTableData = useMemo(() => {
    const mappedData = (cloStudentData?.cloScoresPerStudent || []).map(
      (item: any) => {
        const sInfo = students.find((s: any) => s.id === item.student_id);
        const row: any = {
          Code: sInfo?.student_code || "-",
          Name: sInfo ? `${sInfo.first_name} ${sInfo.last_name}` : "-",
        };
        item.cloScores?.forEach((clo: any) => {
          row[clo.cloCode] = clo.cloScore;
        });
        return row;
      },
    );

    // 🟢 จัดเรียงตามรหัสนิสิต (Numeric Sorting)
    return mappedData.sort((a, b) =>
      String(a.Code).localeCompare(String(b.Code), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [cloStudentData, students]);

  const flattenedPLOTableData = useMemo(() => {
    const mappedData = (ploStudentData || []).map((item: any) => {
      const sInfo = students.find((s: any) => s.id === item.student_id);
      const row: any = {
        Code: sInfo?.student_code || "-",
        Name: sInfo ? `${sInfo.first_name} ${sInfo.last_name}` : "-",
      };
      item.ploScores?.forEach((plo: any) => {
        row[plo.ploCode] = Number(plo.ploScore.toFixed(2));
      });
      return row;
    });

    // 🟢 จัดเรียงตามรหัสนิสิต (Numeric Sorting)
    return mappedData.sort((a, b) =>
      String(a.Code).localeCompare(String(b.Code), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [ploStudentData, students]);

  const flattenedAssTableData = useMemo(() => {
    const mappedData = (studentCourseAssScoreData || []).map((item: any) => {
      const sInfo = students.find((s: any) => s.id === item.student_id);
      const row: any = {
        Code: sInfo?.student_code || "-",
        Name: sInfo ? `${sInfo.first_name} ${sInfo.last_name}` : "-",
        Total: item.totalScore.toFixed(2),
        Grade: item.grade,
      };
      item.categoryScores?.forEach((cat: any) => {
        row[cat.category] = cat.realScore.toFixed(2);
      });
      return row;
    });

    // 🟢 จัดเรียงตามรหัสนิสิต (Numeric Sorting)
    return mappedData.sort((a, b) =>
      String(a.Code).localeCompare(String(b.Code), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [studentCourseAssScoreData, students]);

  const gradeGroupStats = useMemo(() => {
    if (!studentCourseAssScoreData.length) return [];
    const merged = studentCourseAssScoreData.map((ass) => {
      const studentId = ass.student_id;
      const plo = (ploStudentData || []).find(
        (p: any) => p.student_id === studentId,
      );
      const clo = (cloStudentData?.cloScoresPerStudent || []).find(
        (c: any) => c.student_id === studentId,
      );
      const row: any = { grade: ass.grade, totalScore: ass.totalScore };
      ass.categoryScores?.forEach((cat: any) => {
        row[cat.category] = cat.realScore;
      });
      plo?.ploScores?.forEach((p: any) => {
        row[p.ploCode] = p.ploScore;
      });
      clo?.cloScores?.forEach((c: any) => {
        row[c.cloCode] = c.cloScore;
      });
      return row;
    });

    const groups = merged.reduce((acc: any, s: any) => {
      const g = s.grade || "N/A";
      if (!acc[g]) acc[g] = [];
      acc[g].push(s);
      return acc;
    }, {});

    const allKeys = Object.keys(merged[0] || {});
    const ploKeys = allKeys.filter((k) => k.startsWith("PLO"));
    const cloKeys = allKeys.filter((k) => k.startsWith("CLO"));
    const otherKeys = allKeys.filter(
      (k) =>
        !ploKeys.includes(k) &&
        !cloKeys.includes(k) &&
        !["grade", "totalScore"].includes(k),
    );

    return Object.entries(groups)
      .map(([grade, members]: [string, any]) => {
        const calcAvg = (keys: string[]) =>
          keys.map((k) => ({
            label: k,
            value: Number(
              (
                members.reduce((a: number, c: any) => a + (c[k] || 0), 0) /
                members.length
              ).toFixed(2),
            ),
          }));
        return {
          grade,
          count: members.length,
          ploScores: calcAvg(ploKeys),
          cloScores: calcAvg(cloKeys),
          assignmentScores: calcAvg(otherKeys),
        };
      })
      .sort(
        (a, b) =>
          ["A", "B+", "B", "C+", "C", "D+", "D", "F", "N/A"].indexOf(a.grade) -
          ["A", "B+", "B", "C+", "C", "D+", "D", "F", "N/A"].indexOf(b.grade),
      );
  }, [studentCourseAssScoreData, ploStudentData, cloStudentData]);

  // --- API & Effects (ส่วนที่เหลือคงเดิมตามความต้องการของคุณ) ---
  useEffect(() => {
    if (!token) return;
    getUniversities(token).then((uniData) => {
      setOptions((prev) => ({
        ...prev,
        universities: uniData.map((u: University) => ({
          label: lang === "th" ? u.name_th : u.name,
          value: String(u.id),
        })),
      }));
    });
    setIsHydrated(true);
  }, [token, lang]);

  useEffect(() => {
    if (!isHydrated || !selections.university) return;
    apiClient
      .get("/faculty", {
        params: { university_id: selections.university },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) =>
        setOptions((p) => ({
          ...p,
          faculties: res.data.map((f: any) => ({
            label: lang === "th" ? f.name_th : f.name,
            value: String(f.id),
          })),
        })),
      );
  }, [selections.university, token, lang, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !token || !selections.faculty) return;
    apiClient
      .get("/program", {
        params: { facultyId: selections.faculty },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const unique = Array.from(
          new Map(res.data.map((p: any) => [p.program_code, p])).values(),
        );
        setOptions((prev) => ({
          ...prev,
          programs: unique.map((p: any) => ({
            label:
              lang === "th" ? p.program_shortname_th : p.program_shortname_en,
            value: p.program_code,
          })),
        }));
      });
  }, [selections.faculty, token, isHydrated, lang]);

  useEffect(() => {
    if (!selections.program) return;
    apiClient
      .get(`/program/ByCode`, {
        params: { programCode: selections.program },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const uniqueYears = Array.from(
          new Set(res.data.map((p: any) => p.program_year)),
        ).map((y: any) => ({
          label: y.toString(),
          value: String(res.data.find((p: any) => p.program_year === y).id),
        }));
        setOptions((p) => ({
          ...p,
          years: uniqueYears.sort((a, b) => Number(b.label) - Number(a.label)),
        }));
        setIsOptionsLoaded((p) => ({ ...p, years: true }));
      });
  }, [selections.program, token]);

  useEffect(() => {
    if (!isHydrated || !token || !selections.program) return;
    apiClient
      .get(`/program/ByCode`, {
        params: { programCode: selections.program },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const yearSet = new Set<number>();
        const uniqueYears: any[] = [];
        res.data.forEach((p: any) => {
          if (!yearSet.has(p.program_year)) {
            yearSet.add(p.program_year);
            uniqueYears.push({
              label: p.program_year.toString(),
              value: String(p.id),
            });
          }
        });
        setOptions((prev) => ({
          ...prev,
          years: uniqueYears.sort((a, b) => Number(b.label) - Number(a.label)),
        }));
        setIsOptionsLoaded((prev) => ({ ...prev, years: true }));
      });
  }, [selections.program, token, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !token || !selections.year) return;

    apiClient
      .get("/course/forSummary", {
        params: { programId: selections.year },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setOptions((prev) => ({
          ...prev,
          courses: res.data.map((c: any) => ({
            label: `${c.code} ${lang === "th" ? c.name_th : c.name_en}`,
            value: String(c.id),
          })),
        }));
        setIsOptionsLoaded((prev) => ({ ...prev, courses: true }));
      });

    apiClient
      .get(`/student?programId=${selections.year}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setStudents(res.data || []));
  }, [selections.year, token, isHydrated, lang]);

  useEffect(() => {
    if (!selections.courseId) return;
    setLoading(true);
    const params = { courseId: selections.courseId };
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      apiClient.get("/calculation/clo-plo/allStudentCourse", {
        params,
        headers,
      }),
      apiClient.get("/calculation/ass-clo/allStudentCourse", {
        params,
        headers,
      }),
      apiClient.get("/calculation/ass-clo/course/stats", { params, headers }),
      apiClient.get("/calculation/clo-plo/course/stats", { params, headers }),
      apiClient.get("/calculation/realScoreAndGrade/allStudentCourse", {
        params,
        headers,
      }),
      apiClient.get("/calculation/realScoreAndGrade/stats", {
        params,
        headers,
      }),
    ])
      .then(([ploS, cloAll, cloB, ploB, realG, assignmentStats]) => {
        setPloStudentData(ploS.data);
        setCloStudentData(cloAll.data);
        setCloBalanceData(cloB.data);
        setPloBalanceData(ploB.data);
        setStudentCourseAssScoreData(realG.data.studentResults || []);
        setAssignmentBalanceData(assignmentStats.data);
      })
      .finally(() => setLoading(false));
  }, [selections.courseId, token]);

  const metricConfig = {
    CLO: {
      title: "CLO Analysis",
      trendData: cloBalanceData?.cloStats || [],
      xAxis: "cloCode",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
    },
    PLO: {
      title: "PLO Analysis",
      trendData: ploBalanceData?.ploStats || [],
      xAxis: "ploCode",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
    },
    Ass: {
      title: "Assignment Analysis",
      trendData: assignmentBalanceData?.categoryStats || [],
      xAxis: "category",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
    },
  };

  const getGradeColor = (g: string) =>
    ({
      A: "#22c55e",
      "B+": "#3b82f6",
      B: "#60a5fa",
      "C+": "#eab308",
      C: "#fde047",
      "D+": "#f97316",
      D: "#fb923c",
      F: "#ef4444",
    })[g] || "#94a3b8";

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-900 pb-12">
      {loading && <LoadingOverlay />}
      <ToastElement />

      {/* Header & Sticky Nav */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
                <FaChartLine className="text-white text-xl" />
              </div>
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                Analytics Dashboard
              </h1>
            </div>

            {selections.courseId && (
              <div className="flex gap-3">
                <button
                  onClick={handleExportAllExcel}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-lg transition-all active:scale-95"
                >
                  <FaFileExcel className="text-sm" /> Export Report (All Sheets)
                </button>
                {/* <button
                  onClick={handleCaptureGraph}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg transition-all active:scale-95"
                >
                  <FaCamera className="text-sm" /> Save Chart Image
                </button> */}
              </div>
            )}
          </div>

          <div className="bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Dropdowns */}
            <DropdownSelect
              label="University"
              options={options.universities}
              value={selections.university}
              onChange={(v) =>
                setSelections({
                  ...selections,
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
              disabled={!selections.university}
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
              value={isOptionsLoaded.years ? selections.year : ""}
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
              disabled={!selections.year}
              value={isOptionsLoaded.courses ? selections.courseId : ""}
              onChange={(v) =>
                setSelections({ ...selections, courseId: v as string })
              }
            />
            <button
              onClick={() =>
                setSelections({
                  university: "",
                  faculty: "",
                  program: "",
                  year: "",
                  courseId: "",
                })
              }
              className="h-[42px] mt-auto text-slate-400 font-bold hover:text-orange-500 bg-white border border-slate-200 rounded-xl"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-10">
        {!selections.courseId ? (
          <div className="py-40 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
            <FaUniversity className="text-7xl text-slate-100 mx-auto mb-6" />
            <h2 className="text-slate-400 font-medium text-lg italic">
              Please select a course to view analytics
            </h2>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4">
              <h3 className="text-2xl font-black text-slate-800">
                Learning Performance
              </h3>
              <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
                {["CLO", "PLO", "Ass"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setActiveMetric(m as any)}
                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeMetric === m ? "bg-white text-blue-600 shadow-md scale-105" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {m === "Ass" ? "Assignments" : m}
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={graphRef}
              id="analytics-graph-container"
              className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                    <FaThLarge className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {metricConfig[activeMetric].title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Class Performance Overview
                    </p>
                  </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab("line")}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "line" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
                  >
                    Trend
                  </button>
                  <button
                    onClick={() => setActiveTab("radar")}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "radar" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
                  >
                    Balance
                  </button>
                </div>
              </div>

              <div className="px-8 py-5 flex flex-wrap gap-4 items-center bg-slate-50/30">
                <ToggleButton
                  label="Max Possible"
                  active={visibleLines.maxScore}
                  onClick={() =>
                    setVisibleLines((p) => ({ ...p, maxScore: !p.maxScore }))
                  }
                  color="#22c55e"
                />
                <ToggleButton
                  label="Min"
                  active={visibleLines.minScore}
                  onClick={() =>
                    setVisibleLines((p) => ({ ...p, minScore: !p.minScore }))
                  }
                  color="#ef4444"
                />
                <ToggleButton
                  label="Average"
                  active={visibleLines.allAvg}
                  onClick={() =>
                    setVisibleLines((p) => ({ ...p, allAvg: !p.allAvg }))
                  }
                  color="#6366f1"
                />
                <div className="h-6 w-px bg-slate-200 mx-2" />
                <div className="flex flex-wrap gap-2">
                  {gradeGroupStats.map((item: any) => (
                    <button
                      key={item.grade}
                      onClick={() =>
                        setVisibleLines((p) => ({
                          ...p,
                          [`avg_grade_${item.grade}`]:
                            !p[`avg_grade_${item.grade}`],
                        }))
                      }
                      className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-2 
                      ${visibleLines[`avg_grade_${item.grade}`] ? "bg-white shadow-md border-slate-300 text-slate-800" : "bg-slate-50 text-slate-300 opacity-60"}`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getGradeColor(item.grade) }}
                      />
                      Grade {item.grade}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-10 h-[550px] bg-white">
                {activeTab === "line" ? (
                  <PerformanceTrendChart
                    chartData={metricConfig[activeMetric].trendData}
                    balanceData={gradeGroupStats}
                    getGradeColor={getGradeColor}
                    xAxisKey={metricConfig[activeMetric].xAxis}
                    maxScorePosKey={metricConfig[activeMetric].maxPos}
                    maxScoreKey={metricConfig[activeMetric].max}
                    minScoreKey={metricConfig[activeMetric].min}
                    allAvgKey={metricConfig[activeMetric].avg}
                    visibleLines={visibleLines}
                  />
                ) : (
                  <PerformanceBalanceChart
                    chartData={metricConfig[activeMetric].trendData}
                    balanceData={gradeGroupStats}
                    xAxisKey={metricConfig[activeMetric].xAxis}
                    maxScorePosKey={metricConfig[activeMetric].maxPos}
                    maxScoreKey={metricConfig[activeMetric].max}
                    minScoreKey={metricConfig[activeMetric].min}
                    allAvgKey={metricConfig[activeMetric].avg}
                    visibleLines={visibleLines}
                    getGradeColor={getGradeColor}
                  />
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl mb-10">
              <Table
                columns={
                  activeMetric === "CLO"
                    ? [
                        { header: "Code", accessor: "Code" },
                        { header: "Name", accessor: "Name" },
                        ...Object.keys(flattenedCLOTableData[0] || {})
                          .filter((k) => k !== "Code" && k !== "Name")
                          .map((k) => ({ header: k, accessor: k })),
                      ]
                    : activeMetric === "PLO"
                      ? [
                          { header: "Code", accessor: "Code" },
                          { header: "Name", accessor: "Name" },
                          ...Object.keys(flattenedPLOTableData[0] || {})
                            .filter((k) => k !== "Code" && k !== "Name")
                            .map((k) => ({ header: k, accessor: k })),
                        ]
                      : [
                          { header: "Code", accessor: "Code" },
                          { header: "Name", accessor: "Name" },
                          { header: "Total", accessor: "Total" },
                          { header: "Grade", accessor: "Grade" },
                          ...Object.keys(flattenedAssTableData[0] || {})
                            .filter(
                              (k) =>
                                !["Code", "Name", "Total", "Grade"].includes(k),
                            )
                            .map((k) => ({ header: k, accessor: k })),
                        ]
                }
                data={
                  activeMetric === "CLO"
                    ? flattenedCLOTableData
                    : activeMetric === "PLO"
                      ? flattenedPLOTableData
                      : flattenedAssTableData
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
