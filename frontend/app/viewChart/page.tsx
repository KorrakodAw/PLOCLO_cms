/* eslint-disable react-hooks/exhaustive-deps */
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
  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  const [isHydrated, setIsHydrated] = useState(false);
  const [isOptionsLoaded, setIsOptionsLoaded] = useState({
    years: false,
    courses: false,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const [options, setOptions] = useState({
    universities: [] as Option[],
    faculties: [] as Option[],
    programs: [] as Option[],
    years: [] as Option[],
    courses: [] as Option[],
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
  const [gradeSummaryData, setGradeSummaryData] = useState<any>(null);
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

  // 1. Initial Hydration from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("edit_fix_filters");
    if (saved && token) {
      try {
        setSelections(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }
    setIsHydrated(true);
  }, [token]);

  // 2. Save Selections to LocalStorage
  useEffect(() => {
    if (isHydrated && (selections.university || selections.faculty)) {
      localStorage.setItem("edit_fix_filters", JSON.stringify(selections));
    }
  }, [selections, isHydrated]);

  const isInstructor = user?.role === "instructor";

  // 3. Load Universities & Instructor Initial Faculty
  useEffect(() => {
    if (!token) return;
    const initialize = async () => {
      try {
        const uniData = await getUniversities(token);
        const formattedUni = uniData.map((u: University) => ({
          label: lang === "th" ? u.name_th : u.name,
          value: String(u.id),
        }));

        setOptions((prev) => ({
          ...prev,
          universities: formattedUni,
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

          setSelections((prev) => ({
            ...prev,
            university: String(facultyRes.data.university_id),
            faculty: String(facultyRes.data.id),
          }));
        }
      } catch {
        showToast("Failed to load initial data", "error");
      }
    };
    initialize();
  }, [token, lang, user?.email, user?.role]);

  // 4. Cascade: Fetch Faculties
  useEffect(() => {
    if (!isHydrated || !token || !selections.university) return;
    apiClient
      .get("/faculty", {
        params: { university_id: selections.university },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setOptions((prev) => ({
          ...prev,
          faculties: res.data.map((f: any) => ({
            label: lang === "th" ? f.name_th : f.name,
            value: String(f.id),
          })),
        }));
      });
  }, [selections.university, token, isHydrated, lang]);

  // 5. Cascade: Fetch Programs
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

  // 6. Cascade: Fetch Years (Fix Reload Issue)
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

  // 7. Cascade: Fetch Courses & Students
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

  // 8. Load Analytics Data
  useEffect(() => {
    if (!selections.courseId || !token) return;
    setLoading(true);
    const params = { courseId: selections.courseId };
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      apiClient.get("/calculation/ass-clo/gradeSummary", { params, headers }),
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
      .then(([gradeG, ploS, cloAll, cloB, ploB, realG, assignmentStats]) => {
        setGradeSummaryData(gradeG.data);
        setPloStudentData(ploS.data);
        setCloStudentData(cloAll.data);
        setCloBalanceData(cloB.data);
        setPloBalanceData(ploB.data);
        setStudentCourseAssScoreData(realG.data.studentResults || []);
        setAssignmentBalanceData(assignmentStats.data);
      })
      .finally(() => setLoading(false));
  }, [selections.courseId, token]);

  // useEffect(() => {
  //   console.log("ploStudentData", ploStudentData);
  //   console.log("cloStudentData", cloStudentData?.cloScoresPerStudent);
  //   console.log("studentAssData", studentCourseAssScoreData);
  // });

  const mergedData = useMemo(() => {
    // เริ่มต้นจากลิสต์นิสิตหลัก (students) เป็นตัวตั้งต้น
    const rawAssList = studentCourseAssScoreData || [];
    const rawPLOList = ploStudentData || [];
    const rawCLOList = cloStudentData?.cloScoresPerStudent || [];

    return rawAssList.map((assItem) => {
      const studentId = assItem.student_id;

      // 2. ค้นหาข้อมูล PLO และ CLO ที่ตรงกับ student_id นี้
      const ploData = rawPLOList.find((p) => p.student_id === studentId);
      const cloData = rawCLOList.find((c) => c.student_id === studentId);

      // 3. สร้าง Row เริ่มต้นด้วยข้อมูลจาก Assignment List (Total Score & Grade)
      const row = {
        student_id: studentId,
        totalScore: Number(assItem.totalScore.toFixed(2)),
        grade: assItem.grade,
      };

      // 4. แตก categoryScores ออกมาเป็น Key-Value (เช่น midterm: 20)
      assItem.categoryScores?.forEach((cat: any) => {
        row[cat.category] = Number(cat.realScore.toFixed(2));
      });

      // 5. รวมคะแนน PLO เข้าไป (ทศนิยม 2 ตำแหน่ง)
      ploData?.ploScores?.forEach((p: any) => {
        row[p.ploCode] = Number(p.ploScore.toFixed(2));
      });

      // 6. รวมคะแนน CLO เข้าไป (ทศนิยม 2 ตำแหน่ง)
      cloData?.cloScores?.forEach((c: any) => {
        row[c.cloCode] = Number(c.cloScore.toFixed(2));
      });

      return row;
    });
  }, [studentCourseAssScoreData, ploStudentData, cloStudentData, students]);

  const gradeGroupStats = useMemo(() => {
    if (!mergedData || mergedData.length === 0) return [];

    // 1. จัดกลุ่มนิสิตตามเกรด
    const groups = mergedData.reduce((acc: any, student: any) => {
      const g = student.grade || "N/A";
      if (!acc[g]) acc[g] = [];
      acc[g].push(student);
      return acc;
    }, {});

    // 2. แยก Keys ออกเป็นกลุ่มๆ
    const allKeys = Object.keys(mergedData[0]);
    const ploKeys = allKeys.filter((k) => k.toLowerCase().startsWith("plo"));
    const cloKeys = allKeys.filter((k) => k.toLowerCase().startsWith("clo"));
    // keys อื่นๆ ที่เป็นตัวเลข (เช่น midterm, final, totalScore)
    const otherKeys = allKeys.filter(
      (k) =>
        !ploKeys.includes(k) &&
        !cloKeys.includes(k) &&
        ![
          "student_id",
          "grade",
          "student_code",
          "studentName",
          "totalScore",
        ].includes(k),
    );

    // 3. คำนวณค่าเฉลี่ยและจัดรูปลักษณ์ข้อมูล
    const statsByGrade = Object.entries(groups).map(
      ([grade, members]: [string, any]) => {
        const calculateAvg = (keys: string[]) =>
          keys.map((key) => {
            const sum = members.reduce(
              (acc: number, curr: any) => acc + (curr[key] || 0),
              0,
            );
            return {
              label: key,
              value: Number((sum / members.length).toFixed(2)),
            };
          });

        return {
          grade,
          count: members.length,
          // 🟢 แยกข้อมูลเป็น Array ตามหมวดหมู่
          ploScores: calculateAvg(ploKeys),
          cloScores: calculateAvg(cloKeys),
          assignmentScores: calculateAvg(otherKeys),
          // เก็บ totalScore แบบเดี่ยวเผื่อไว้ใช้งานด่วน
          avgTotalScore: Number(
            (
              members.reduce(
                (a: number, c: any) => a + (c.totalScore || 0),
                0,
              ) / members.length
            ).toFixed(2),
          ),
        };
      },
    );

    // 4. จัดเรียงตามลำดับเกรด
    const gradeOrder = ["A", "B+", "B", "C+", "C", "D+", "D", "F", "N/A"];
    return statsByGrade.sort(
      (a, b) => gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade),
    );
  }, [mergedData]);

  useEffect(() => {
    console.log("gradeGroupStats:", gradeGroupStats);
  });

  const flattenedAssTableData = useMemo(() => {
    const rawData = studentCourseAssScoreData || [];

    // 1. หาหมวดหมู่คะแนนทั้งหมดที่มีอยู่ในข้อมูลชุดนี้
    const allCategories = new Set<string>();
    rawData.forEach((item: any) => {
      item.categoryScores?.forEach((cat: any) => {
        if (cat.category) allCategories.add(cat.category);
      });
    });

    // 2. แปลงข้อมูล (Mapping & Flattening)
    const mappedData = rawData.map((item: any) => {
      const studentInfo = students.find(
        (s: any) =>
          s.id === item.student_id || s.student_id === item.student_id,
      );

      // สร้าง Row พื้นฐาน
      const row: any = {
        student_code: studentInfo?.student_code ?? "-",
        studentName: studentInfo
          ? `${studentInfo.first_name} ${studentInfo.last_name}`
          : item.studentName || "-",
        totalScore:
          item.totalScore !== undefined ? item.totalScore.toFixed(2) : "-",
        grade: item.grade || "-",
      };

      // 🟢 กำหนดค่าเริ่มต้นเป็น "-" ให้กับทุกหมวดหมู่ที่พบในวิชานี้
      allCategories.forEach((catName) => {
        row[catName] = "-";
      });

      // นำคะแนนจริงมาเขียนทับ (ถ้ามี)
      item.categoryScores?.forEach((cat: any) => {
        if (cat.category) {
          row[cat.category] =
            cat.realScore !== undefined ? cat.realScore.toFixed(2) : "-";
        }
      });

      return row;
    });

    // 3. จัดเรียงข้อมูลตามรหัสนิสิต (Numeric Sorting)
    return mappedData.sort((a, b) => {
      if (a.student_code === "-") return 1;
      if (b.student_code === "-") return -1;

      return a.student_code.localeCompare(b.student_code, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [studentCourseAssScoreData, students]);

  const handleClear = () => {
    localStorage.removeItem("edit_fix_filters");
    setSelections({
      university: "",
      faculty: "",
      program: "",
      year: "",
      courseId: "",
    });
    setIsOptionsLoaded({ years: false, courses: false });
  };

  // --- MEMOS FOR TABLES & CHARTS ---

  const formattedGradeData = useMemo(() => {
    const grades = gradeSummaryData || {};
    return Object.entries(grades)
      .map(([grade, details]: [string, any]) => ({
        grade,
        count: details.count,
      }))
      .sort((a, b) => {
        const order = ["A", "B+", "B", "C+", "C", "D+", "D", "F"];
        return order.indexOf(a.grade) - order.indexOf(b.grade);
      });
  }, [gradeSummaryData]);

  const flattenedCLOTableData = useMemo(() => {
    const rawList = cloStudentData?.cloScoresPerStudent || [];

    return rawList
      .map((item: any) => {
        const studentInfo = students.find(
          (s: any) =>
            s.id === item.student_id || s.student_id === item.student_id,
        );
        const row: any = {
          student_id: item.student_id,
          student_code: studentInfo?.student_code || "",
          studentName: studentInfo
            ? `${studentInfo.first_name} ${studentInfo.last_name}`
            : item.studentName || "-",
        };
        item.cloScores?.forEach((clo: any) => {
          row[clo.cloCode] = clo.cloScore;
        });
        return row;
      })
      .sort((a: any, b: any) =>
        a.student_code?.localeCompare(b.student_code, undefined, {
          numeric: true,
        }),
      );
  }, [cloStudentData]);

  const flattenedPLOTableData = useMemo(() => {
    const rawPLOList = ploStudentData || [];
    return rawPLOList
      .map((item: any) => {
        const studentInfo = students.find(
          (s: any) =>
            s.id === item.student_id || s.student_id === item.student_id,
        );
        const row: any = {
          student_id: item.studentId,
          student_code: studentInfo?.student_code || "",
          studentName: studentInfo
            ? `${studentInfo.first_name} ${studentInfo.last_name}`
            : "Unknown",
        };

        item.ploScores?.forEach((plo: any) => {
          // 🟢 แก้ไขตรงนี้: จัดการค่าคะแนนให้เป็นทศนิยม 2 ตำแหน่ง
          // ใช้ Number() ครอบเพื่อให้ยังเป็น type number สำหรับการคำนวณหรือเปรียบเทียบ
          row[plo.ploCode] =
            plo.ploScore !== undefined && plo.ploScore !== null
              ? Number(plo.ploScore.toFixed(2))
              : 0;
        });

        return row;
      })
      .sort((a, b) =>
        a.student_code.localeCompare(b.student_code, undefined, {
          numeric: true,
        }),
      );
  }, [ploStudentData, students]);

  const toggleLine = (key: string) =>
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));

  const metricConfig = {
    CLO: {
      title: "CLO Analysis",
      trendData: cloBalanceData?.cloStats || [],
      balanceData: [],
      xAxis: "cloCode",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
    },
    PLO: {
      title: "PLO Analysis",
      trendData: ploBalanceData?.ploStats || [],
      balanceData: [],
      xAxis: "ploCode",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
    },
    Ass: {
      title: "Assignment Analysis",
      trendData: assignmentBalanceData?.categoryStats || [],
      balanceData: [],
      xAxis: "category",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
    },
  };

  // Column Definitions
  const CloScoreColumns: Column<any>[] = [
    { header: "Student Code", accessor: "student_code" },
    { header: "Student Name", accessor: "studentName" },
    ...Object.keys(flattenedCLOTableData?.[0] ?? {})
      .filter((k) => k.startsWith("CLO"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((clo) => ({ header: clo, accessor: clo })),
  ];

  const PloScoreColumn: Column<any>[] = [
    { header: "Student Code", accessor: "student_code" },
    { header: "Student Name", accessor: "studentName" },
    ...Object.keys(flattenedPLOTableData?.[0] ?? {})
      .filter((k) => k.startsWith("PLO"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((plo) => ({ header: plo, accessor: plo })),
  ];

  const AssScoreColumn: Column<any>[] = useMemo(() => {
    // 1. สร้าง Set เพื่อเก็บหมวดหมู่คะแนนที่ไม่ซ้ำกันจากนิสิตทุกคน
    const allCategoryKeys = new Set<string>();

    flattenedAssTableData.forEach((row) => {
      Object.keys(row).forEach((key) => {
        // กรองเอาเฉพาะคีย์ที่เป็นหมวดหมู่คะแนน
        if (
          ![
            "student_code",
            "studentName",
            "totalScore",
            "student_id",
            "grade",
            "categoryScores",
          ].includes(key)
        ) {
          allCategoryKeys.add(key);
        }
      });
    });

    // 2. แปลง Set กลับเป็น Array และจัดเรียงลำดับ (เช่น ตามตัวอักษร)
    const sortedCategories = Array.from(allCategoryKeys).sort();

    // 3. สร้างโครงสร้างคอลัมน์
    return [
      { header: "Student Code", accessor: "student_code" },
      { header: "Student Name", accessor: "studentName" },

      // 🟢 สร้างคอลัมน์จากหมวดหมู่ทั้งหมดที่รวบรวมได้
      ...sortedCategories.map((key) => ({
        // เปลี่ยน camelCase เป็นชื่อที่อ่านง่าย (เช่น midtermExam -> Midterm Exam)
        header: key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase()),
        accessor: key,
      })),

      // { header: "Total Score", accessor: "totalScore" },
      // { header: "Grade", accessor: "grade" },
    ];
  }, [flattenedAssTableData]);

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

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-900 pb-12">
      {loading && <LoadingOverlay />}
      <ToastElement />

      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
                <FaChartLine className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 leading-none">
                  Analytics Dashboard
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-1 italic">
                  NU Computer Engineering
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
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
              onChange={(v) => {
                setSelections({
                  ...selections,
                  program: v as string,
                  year: "",
                  courseId: "",
                });
                setIsOptionsLoaded((prev) => ({ ...prev, years: false }));
              }}
            />

            <DropdownSelect
              label="Year"
              options={options.years}
              value={isOptionsLoaded.years ? selections.year : ""}
              disabled={!selections.program}
              onChange={(v) => {
                setSelections({
                  ...selections,
                  year: v as string,
                  courseId: "",
                });
                setIsOptionsLoaded((prev) => ({ ...prev, courses: false }));
              }}
            />

            <DropdownSelect
              label="Course"
              options={options.courses}
              value={isOptionsLoaded.courses ? selections.courseId : ""}
              disabled={!selections.year}
              onChange={(v) =>
                setSelections({ ...selections, courseId: v as string })
              }
            />

            <button
              onClick={handleClear}
              className="h-[42px] flex items-center justify-center gap-2 px-6 text-sm font-bold text-slate-400 hover:text-orange-600 bg-white border border-slate-200 rounded-xl transition-all shadow-sm"
            >
              <span>↺</span> {t("clear")}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        {!selections.courseId ? (
          <div className="flex flex-col items-center justify-center py-40 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <FaUniversity className="text-6xl text-slate-100 mb-4" />
            <h2 className="text-slate-400 font-semibold italic">
              Select course details to visualize analytics
            </h2>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold text-slate-800">
                  Student Performance
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {["CLO", "PLO", "Ass"].map((m: any) => (
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
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                {activeMetric === "CLO" && flattenedCLOTableData.length > 0 && (
                  <Table
                    columns={CloScoreColumns}
                    data={flattenedCLOTableData}
                  />
                )}
                {activeMetric === "PLO" && flattenedPLOTableData.length > 0 && (
                  <Table
                    columns={PloScoreColumn}
                    data={flattenedPLOTableData}
                  />
                )}
                {activeMetric === "Ass" && flattenedAssTableData.length > 0 && (
                  <Table
                    columns={AssScoreColumn}
                    data={flattenedAssTableData}
                  />
                )}
              </div>
            </div>

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
                  label="Max"
                  active={visibleLines.maxScore}
                  onClick={() => toggleLine("maxScore")}
                  color="#22c55e"
                />
                <ToggleButton
                  label="Min"
                  active={visibleLines.minScore}
                  onClick={() => toggleLine("minScore")}
                  color="#ef4444"
                />
                <ToggleButton
                  label="Avg"
                  active={visibleLines.allAvg}
                  onClick={() => toggleLine("allAvg")}
                  color="#6366f1"
                />
                <div className="flex flex-wrap gap-2 mb-4">
                  {gradeGroupStats
                    .map((item: any) => item.grade) // ดึงชื่อเกรดจากข้อมูลที่จัดกลุ่มไว้แล้ว
                    .map((grade: string) => (
                      <button
                        key={grade}
                        onClick={() => toggleLine(`avg_grade_${grade}`)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 
          ${
            visibleLines[`avg_grade_${grade}`]
              ? "bg-white shadow-sm border-slate-300 text-slate-800"
              : "bg-slate-50 text-slate-300 border-transparent opacity-50"
          }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: getGradeColor
                              ? getGradeColor(grade)
                              : "#cbd5e1",
                          }}
                        />
                        {/* แสดงชื่อเกรด เช่น A, B+, B */}
                        {grade}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600 shadow-inner">
                    <FaThLarge />
                  </div>
                  <h3 className="font-bold text-slate-800">
                    {metricConfig[activeMetric].title}
                  </h3>
                </div>
                <div className="p-8 h-[500px]">
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
              <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-sm p-8 flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                  <FaUserGraduate className="text-emerald-600" />
                  <h3 className="font-bold text-slate-800">
                    Grade Distribution
                  </h3>
                </div>
                <div className="h-[400px]">
                  <GradeDistributionChart data={formattedGradeData} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
