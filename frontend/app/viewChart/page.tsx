/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { FaChartPie, FaUserGraduate } from "react-icons/fa";
import DropdownSelect from "@/components/DropdownSelect";
import { apiClient } from "@/utils/apiClient";

// Import Refactored Components
import { ToggleButton } from "./viewChartComponent/ToggleButton";
import { PerformanceTrendChart } from "./viewChartComponent/PerformanceTrendChart";
import { PerformanceBalanceChart } from "./viewChartComponent/PerformanceBalanceChart";
import { GradeDistributionChart } from "./viewChartComponent/gradeDistributionChart";
import { CLOPerformanceTable } from "./viewChartComponent/CLOPerformanceTable";
import { PLOPerformanceTable } from "./viewChartComponent/PLOPerformanceTable";
import { AssignmentPerformanceTable } from "./viewChartComponent/AssignmentPerformanceTable";

interface DropdownOption {
  label: string;
  value: string | number;
}

interface FilterOptions {
  universities: DropdownOption[];
  faculties: DropdownOption[];
  programs: DropdownOption[];
  years: DropdownOption[];
  courses: DropdownOption[];
}

export default function PLOChart() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  // Dropdown Options State
  const [options, setOptions] = useState<FilterOptions>({
    universities: [],
    faculties: [],
    programs: [],
    years: [],
    courses: [],
  });

  // Selection State
  const [selections, setSelections] = useState({
    university: "",
    faculty: "",
    program: "",
    year: "",
    courseId: "",
  });

  // Data States
  const [summaryData, setSummaryData] = useState<any>(null);
  const [cloStudentData, setCloStudentData] = useState<any>(null);
  const [ploStudentData, setPloStudentData] = useState<any>(null);
  const [cloBalanceData, setCloBalanceData] = useState<any>(null);
  const [ploBalanceData, setPloBalanceData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"line" | "radar">("line");
  const [activeTable, setActiveTable] = useState<"CLO" | "PLO" | "Ass">("CLO");
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
        setOptions((prev) => ({
          ...prev,
          universities: data.map((u: any) => ({ label: u.name, value: u.id })),
        })),
    );
  }, []);

  // 1. เมื่อเลือก University -> ไปดึง Faculty
  useEffect(() => {
    if (selections.university) {
      fetchData("/faculty", { university_id: selections.university }).then(
        (data) =>
          data &&
          setOptions((prev) => ({
            ...prev,
            faculties: data.map((f: any) => ({ label: f.name, value: f.id })),
            // Reset ค่าลูกเมื่อค่าแม่เปลี่ยน
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

  // 2. เมื่อเลือก Faculty -> ไปดึง Program (ใช้ faculty_id)
  useEffect(() => {
    if (selections.faculty) {
      fetchData("/program", { facultyId: selections.faculty }).then((data) => {
        if (data) {
          // กรองเอาเฉพาะ Program Code ที่ไม่ซ้ำกันเพื่อแสดงใน Dropdown หลักสูตร
          const unique = Array.from(
            new Map(data.map((p: any) => [p.program_code, p])).values(),
          );
          setOptions((prev) => ({
            ...prev,
            programs: unique.map((p: any) => ({
              label: p.program_shortname_en,
              value: p.program_code, // ใช้ code เพื่อไปกรองหาปีต่อ
            })),
            years: [],
            courses: [],
          }));
        }
      });
      setSelections((s) => ({
        ...s,
        program: "",
        year: "",
        courseId: "",
      }));
    }
  }, [selections.faculty]);

  useEffect(() => {
    // ตรวจสอบว่ามีการเลือก program (programCode) และคณะ (facultyId) แล้ว
    if (selections.program) {
      // ใช้ Path Variable ตามที่คุณกำหนดมาคือ /program/ByCode/${selections.program}
      fetchData(`/program/ByCode`, {
        programCode: selections.program,
      }).then((data) => {
        if (data && Array.isArray(data)) {
          // 1. กำหนด Interface เพื่อแก้ปัญหา Implicit 'any[]'
          interface YearOption {
            label: string;
            value: number; // เก็บค่า programId (PK)
          }

          const yearSet = new Set<number>();
          const uniqueYearsOptions: YearOption[] = [];

          data.forEach((p: any) => {
            // 2. ใช้ program_year มาทำเป็นออปชัน และกรองไม่ให้ปีซ้ำกัน
            if (!yearSet.has(p.program_year)) {
              yearSet.add(p.program_year);
              uniqueYearsOptions.push({
                label: p.program_year.toString(), // แสดงตัวเลขปีในเมนู
                value: p.id, // เก็บค่า id ไว้ใช้ดึง Course ต่อ
              });
            }
          });

          // 3. อัปเดต options และเรียงลำดับปีจากใหม่ไปเก่า (Descending)
          setOptions((prev) => ({
            ...prev,
            years: uniqueYearsOptions.sort(
              (a, b) => Number(b.label) - Number(a.label),
            ),
            courses: [],
          }));
        }
      });
    }
    setSelections((s) => ({
      ...s,
      year: "",
      courseId: "",
    }));
  }, [selections.program, selections.faculty]);

  useEffect(() => {
    console.log(selections.year);

    if (selections.year) {
      fetchData("/course/forSummary", { programId: selections.year }).then(
        (data) =>
          data &&
          setOptions((prev) => ({
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
      fetchData("/calculation/ass-clo/allStudentCourse", {
        courseId: selections.courseId,
      }).then(setCloStudentData);
      fetchData("/calculation/clo-plo/allStudentCourse", {
        courseId: selections.courseId,
      }).then(setPloStudentData);
      fetchData("/calculation/ass-clo/course", {
        courseId: selections.courseId,
      }).then(setCloBalanceData);
      fetchData("/calculation/clo-plo/course", {
        courseId: selections.courseId,
      }).then(setPloBalanceData);
    }
  }, [selections.courseId]);

  // --- DATA TRANSFORMATIONS ---

  // For Comparison Analysis (Bar/Trend/Radar)
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

  // For CLO Table and Balance
  const cloAveragesByGrade = useMemo(() => {
    if (!cloStudentData?.cloScoresPerStudent || !summaryData?.students)
      return [];
    const gradeMap = summaryData.students.reduce(
      (acc: any, s: any) => ({ ...acc, [s.student_id]: s.grade }),
      {},
    );

    const aggregates: any = {};
    cloStudentData.cloScoresPerStudent.forEach((student: any) => {
      const grade = gradeMap[student.student_id];
      if (!grade) return;
      if (!aggregates[grade]) aggregates[grade] = {};

      student.cloScores.forEach((clo: any) => {
        if (!aggregates[grade][clo.cloCode])
          aggregates[grade][clo.cloCode] = { sum: 0, count: 0 };
        aggregates[grade][clo.cloCode].sum += clo.cloScore;
        aggregates[grade][clo.cloCode].count++;
      });
    });

    const uniqueClos = Array.from(
      new Set(
        cloStudentData.cloScoresPerStudent.flatMap((s: any) =>
          s.cloScores.map((c: any) => c.cloCode),
        ),
      ),
    ).sort();

    return uniqueClos.map((code: any) => {
      const dataPoint: any = { name: code };
      Object.keys(aggregates).forEach((grade) => {
        const stats = aggregates[grade][code];
        dataPoint[`avg_grade_${grade}`] = stats
          ? Number((stats.sum / stats.count).toFixed(2))
          : 0;
      });
      return dataPoint;
    });
  }, [cloStudentData, summaryData]);

  const ploAveragesByGrade = useMemo(() => {
    // ตรวจสอบความถูกต้องของข้อมูลเบื้องต้น
    if (!Array.isArray(ploStudentData) || !summaryData?.students) return [];

    const gradeMap = summaryData.students.reduce(
      (acc: Record<number, string>, s: any) => {
        acc[s.student_id] = s.grade || "N/A";
        return acc;
      },
      {},
    );

    // 🟢 แก้ไขจุดนี้: กำหนด Type ให้กับ groups เพื่อแก้ Error indexing
    const groups: Record<
      string,
      Record<string, { sum: number; count: number }>
    > = {};

    ploStudentData.forEach((student: any) => {
      // อ้างอิง studentId จากข้อมูลที่คุณ log
      const grade = gradeMap[student.studentId];
      if (!grade) return;

      if (!groups[grade]) {
        groups[grade] = {};
      }

      // อ้างอิง ploScores จากข้อมูลที่คุณ log
      student.ploScores.forEach((plo: any) => {
        if (!groups[grade][plo.ploCode]) {
          groups[grade][plo.ploCode] = { sum: 0, count: 0 };
        }
        groups[grade][plo.ploCode].sum += plo.ploScore;
        groups[grade][plo.ploCode].count += 1;
      });
    });

    // สร้างรายการ PLO Code ทั้งหมดที่มี
    const allPloCodes = Array.from(
      new Set(
        ploStudentData.flatMap((s: any) =>
          s.ploScores.map((p: any) => p.ploCode),
        ),
      ),
    ).sort();

    return allPloCodes.map((ploCode) => {
      const dataPoint: any = { name: ploCode };
      Object.keys(groups).forEach((grade) => {
        const stats = groups[grade][ploCode];
        dataPoint[`avg_grade_${grade}`] = stats
          ? Number((stats.sum / stats.count).toFixed(2))
          : 0;
      });
      return dataPoint;
    });
  }, [ploStudentData, summaryData]);

  // For Grade Distribution Area Chart
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

  const toggleLine = (key: string) =>
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));

  // สมมติว่า res.data คือข้อมูลที่คุณได้รับมา (ที่มี cloScores: Array(6))
  const combinedCloData = useMemo(() => {
    // 1. ตรวจสอบว่ามีข้อมูลพื้นฐานจาก API หรือไม่
    if (!cloBalanceData?.cloScores) return [];

    // 2. เริ่มต้นการ Map และ Merge ข้อมูล
    const merged = cloBalanceData.cloScores.map((item) => {
      // ดึงข้อมูลคะแนนเฉลี่ยรายเกรดที่มีชื่อ CLO ตรงกัน
      const gradeScores =
        cloAveragesByGrade.find((g) => g.name === item.cloCode) || {};

      return {
        cloCode: item.cloCode, // สำหรับ xAxisKey
        cloScore: item.cloScore, // คะแนนดิบเฉลี่ย
        maxCloScore: item.maxCloScore, // สำหรับ maxScoreKey และแท่ง Bar
        percentage: item.percentage, // สำหรับ allAvgKey (เปอร์เซ็นต์)
        minCloScore: item.minCloScore || 0,
        ...gradeScores, // กระจายค่า avg_grade_A, avg_grade_B เข้าไป
      };
    });

    // 3. จัดเรียงข้อมูลตาม cloCode (เช่น CLO1, CLO2, CLO3...)
    return merged.sort((a, b) => {
      // ใช้ localeCompare พร้อม numeric: true เพื่อให้เรียง 1, 2, 10 ได้ถูกต้อง
      return a.cloCode.localeCompare(b.cloCode, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [cloBalanceData, cloAveragesByGrade]);

  const combinedPloData = useMemo(() => {
    if (!ploBalanceData?.ploScores) return [];

    const merged = ploBalanceData.ploScores.map((item) => {
      const gradeScores =
        ploAveragesByGrade.find((g) => g.name === item.ploCode) || {};

      return {
        ploCode: item.ploCode,
        ploScore: item.ploScore,
        maxPloScore: item.maxPloScore,
        percentage: item.percentage,
        minPloScore: item.minPloScore || 0,
        ...gradeScores,
      };
    });

    return merged.sort((a, b) => {
      return a.ploCode.localeCompare(b.ploCode, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [ploBalanceData, ploAveragesByGrade]);

  useEffect(() => {
    console.log("combinedCloData", combinedCloData);
    console.log("summaryData", summaryData);
  });

  return (
    <div className="bg-[#f8fafc] p-4 md:p-8 min-h-screen font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* FILTERS */}
        <div className="flex gap-4 flex-wrap bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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
            label="Curriculum Year"
            disabled={!selections.program}
          />
          <div className="flex-1">
            <DropdownSelect
              options={options.courses}
              value={selections.courseId}
              onChange={(v) =>
                setSelections((s) => ({ ...s, courseId: v as string }))
              }
              label="Select Course"
              disabled={!selections.year}
            />
          </div>
        </div>

        {/* CLO TABLE (Pivoted) */}
        {summaryData &&
        cloAveragesByGrade.length > 0 &&
        ploAveragesByGrade.length > 0 ? (
          <div>
            <DropdownSelect
              options={[
                { label: "CLO Performance Table", value: "CLO" },
                { label: "PLO Performance Table", value: "PLO" },
                { label: "Assignment Performance Table", value: "Ass" },
              ]}
              value={activeTable}
              onChange={(v) =>
                setActiveTable(
                  v === "CLO" ? "CLO" : v === "PLO" ? "PLO" : "Ass",
                )
              }
              label="Select Type of Performance Table"
            />

            {activeTable === "CLO" && (
              <CLOPerformanceTable
                summaryData={summaryData}
                cloAveragesByGrade={cloAveragesByGrade}
                getGradeColor={getGradeColor}
              />
            )}
            {activeTable === "PLO" && (
              <PLOPerformanceTable
                summaryData={summaryData}
                ploAveragesByGrade={ploAveragesByGrade}
                getGradeColor={getGradeColor}
              />
            )}
            {activeTable === "Ass" && (
              <AssignmentPerformanceTable
                summaryData={summaryData}
                categoryChartData={categoryChartData}
                getGradeColor={getGradeColor}
              />
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 italic">
            Select a course to view table
          </div>
        )}
        <div className="h-96">
          <PerformanceTrendChart
            chartData={combinedCloData}
            summaryData={summaryData}
            getGradeColor={getGradeColor}
            xAxisKey={"cloCode"}
            maxScorePosKey={"maxCloScore"}
            allAvgKey="percentage"
            maxScoreKey=""
            minScoreKey=""
          />
        </div>
        <div className="h-96">
          <PerformanceTrendChart
            chartData={combinedPloData}
            summaryData={summaryData}
            getGradeColor={getGradeColor}
            xAxisKey={"ploCode"}
            maxScorePosKey={"maxPloScore"}
          />
        </div>

        {/* COMPARISON ANALYSIS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <FaChartPie className="text-blue-500" /> Comparison Analysis
                </h3>
                <p className="text-xs text-slate-500">
                  Benchmark grade groups against class performance
                </p>
              </div>
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => setActiveTab("line")}
                  className={`px-4 py-1.5 rounded-lg text-sm transition ${activeTab === "line" ? "bg-blue-500 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  Trend View
                </button>
                <button
                  onClick={() => setActiveTab("radar")}
                  className={`px-4 py-1.5 rounded-lg text-sm transition ${activeTab === "radar" ? "bg-blue-500 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  Balance View
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-6">
                {["maxScore", "minScore", "allAvg"].map((k) => (
                  <ToggleButton
                    key={k}
                    label={
                      k === "allAvg" ? "Class Avg" : k.replace("Score", "")
                    }
                    active={visibleLines[k]}
                    onClick={() => toggleLine(k)}
                    color="#64748b"
                  />
                ))}
                {Array.from(
                  new Set(summaryData?.students?.map((s: any) => s.grade)),
                )
                  .filter(Boolean)
                  .sort()
                  .map((g: any) => (
                    <ToggleButton
                      key={g}
                      label={`Grade ${g}`}
                      active={visibleLines[`avg_grade_${g}`]}
                      onClick={() => toggleLine(`avg_grade_${g}`)}
                      color={getGradeColor(g)}
                    />
                  ))}
              </div>
              <div className="h-[400px]">
                {summaryData && categoryChartData.length > 0 ? (
                  activeTab === "line" ? (
                    <PerformanceTrendChart
                      chartData={categoryChartData}
                      xAxisKey={"name"}
                      maxScorePosKey={"fullScore"}
                      maxScoreKey={"maxScore"}
                      minScoreKey={"minScore"}
                      allAvgKey={"allAvg"}
                      summaryData={summaryData}
                      visibleLines={visibleLines}
                      getGradeColor={getGradeColor}
                    />
                  ) : (
                    <PerformanceBalanceChart
                      chartData={categoryChartData}
                      summaryData={summaryData}
                      visibleLines={visibleLines}
                      getGradeColor={getGradeColor}
                    />
                  )
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">
                    Select a course to view chart
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DISTRIBUTION SECTION */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col lg:col-span-2">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
              <FaUserGraduate className="text-emerald-500" /> Grade Distribution
            </h3>
            <div className="flex-1 min-h-[350px]">
              <GradeDistributionChart data={gradeDistribution} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
