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
import { toPng } from "html-to-image";
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
    midScore: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem("edit_fix_filters");
    if (saved && token) {
      try {
        const parsed = JSON.parse(saved);
        setSelections(parsed);
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }
    setIsHydrated(true);
  }, [token]);

  useEffect(() => {
    if (selections.university || selections.faculty || selections.program) {
      localStorage.setItem("edit_fix_filters", JSON.stringify(selections));
    }
  });

  // 🟢 1. ฟังก์ชัน Capture รูปภาพที่แก้ปัญหา oklch และ Animation
  const handleCaptureGraph = async () => {
    if (!graphRef.current) return;

    try {
      setLoading(true);
      // 🟢 รอให้ Animation ของกราฟนิ่งสนิท
      await new Promise((r) => setTimeout(r, 800));

      // 🟢 กำหนด Filter เพื่อเอาปุ่มและขอบที่ไม่ต้องการออก
      const dataUrl = await toPng(graphRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        style: {
          borderRadius: "0",
          padding: "20px",
        },
        // 🟢 กรองเฉพาะสิ่งที่ต้องการ: เก็บเฉพาะกราฟและคำอธิบาย (Legend)
        filter: (node) => {
          const exclusionClasses = ["button", "toggle-btn", "no-export"];
          if (node.classList) {
            return !exclusionClasses.some((cls) =>
              node.classList.contains(cls),
            );
          }
          return true;
        },
      });

      const link = document.createElement("a");
      link.download = `CLO_Analysis_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();

      showToast("บันทึกรูปภาพสำเร็จ!", "success");
    } catch (error) {
      console.error("Capture Error:", error);
      showToast("ไม่สามารถบันทึกภาพได้", "error");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 2. ฟังก์ชัน Export Excel รวมทุก Sheet
  const handleExportAllExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const dataToExport = flattenedAssTableData.map((item) => {
        const newItem = { ...item }; // Copy ข้อมูลเพื่อไม่ให้กระทบตัวแปรหลัก
        delete newItem.Total; // ลบ ID ภายในที่อาจารย์ไม่จำเป็นต้องเห็น
        delete newItem.Grade; // ลบโน้ตภายในระบบ
        return newItem;
      });

      // สร้าง Sheet สำหรับแต่ละข้อมูล
      const sheets = [
        { data: flattenedCLOTableData, name: "CLO_Scores" },
        { data: flattenedPLOTableData, name: "PLO_Scores" },
        { data: dataToExport, name: "Assignment_Scores" },
      ];

      sheets.forEach((s: { data: any[]; name: string; label?: string }) => {
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
    } catch {
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
    return mappedData.sort((a: any, b: any) =>
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
    return mappedData.sort((a: any, b: any) =>
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

  const [cloPersentageData, setCloPercentageData] = useState<any>(null);
  const [assignmentPersentageData, setAssignmentPercentageData] =
    useState<any>(null);
  const [ploPersentageData, setPloPercentageData] = useState<any>(null);

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
      apiClient.get("/calculation/ass-clo/course/stats/percentage", {
        params,
        headers,
      }),
      apiClient.get("/calculation/realScoreAndGrade/stats/percentage", {
        params,
        headers,
      }),
      apiClient.get("/calculation/clo-plo/course/stats/percentage", {
        params,
        headers,
      }),
    ])
      .then(
        ([
          ploS,
          cloAll,
          cloB,
          ploB,
          realG,
          assignmentStats,
          cloPersentage,
          assignmentPersentage,
          ploPersentage,
        ]) => {
          setPloStudentData(ploS.data);
          setCloStudentData(cloAll.data);
          setCloBalanceData(cloB.data);
          setPloBalanceData(ploB.data);
          setStudentCourseAssScoreData(realG.data.studentResults || []);
          setAssignmentBalanceData(assignmentStats.data);
          setCloPercentageData(cloPersentage.data);
          setAssignmentPercentageData(assignmentPersentage.data);
          setPloPercentageData(ploPersentage.data);
        },
      )
      .finally(() => setLoading(false));
  }, [selections.courseId, token]);

  const [percentageStage, setPercentageStage] = useState(false);

  const [cloStudentPercentageData, setCloStudentPercentageData] =
    useState<any>(null);
  const [ploStudentPercentageData, setPloStudentPercentageData] =
    useState<any>(null);
  const [assignmentStudentPercentageData, setAssignmentStudentPercentageData] =
    useState<any>(null);

  useEffect(() => {
    if (!percentageStage) return;
    setLoading(true);
    const params = { courseId: selections.courseId };
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      apiClient.get("calculation/ass-clo/allStudentCourse/percentage", {
        params,
        headers,
      }),
      apiClient.get(
        "/calculation/realScoreAndGrade/allStudentCourse/percentage",
        { params, headers },
      ),
      apiClient.get("/calculation/clo-plo/allStudentCourse/percentage", {
        params,
        headers,
      }),
    ])
      .then(([cloPercentage, assignmentPercentage, ploPercentage]) => {
        setCloStudentPercentageData(cloPercentage.data);
        setAssignmentStudentPercentageData(assignmentPercentage.data);
        setPloStudentPercentageData(ploPercentage.data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [percentageStage, token]);

  const gradeGroupStatsPercentage = useMemo(() => {
    // 1. ตรวจสอบเงื่อนไขการรัน หากไม่ตรงให้คืนค่า Array ว่างทันที
    if (!percentageStage || !studentCourseAssScoreData.length) return [];

    // --- ขั้นตอนที่ 1: Merge ข้อมูลรายบุคคล (Data Flattening) ---
    const studentMap: Record<string, any> = {};

    // รวมข้อมูล Grade เป็นหลัก
    studentCourseAssScoreData.forEach((item: any) => {
      const id = item.student_id;
      studentMap[id] = { studentId: id, grade: item.grade || "N/A" };
    });

    // รวม CLO (ใช้ student_id)
    (cloStudentPercentageData?.cloPercentagePerStudent || []).forEach(
      (item: any) => {
        const id = item.student_id;
        if (studentMap[id]) {
          item.cloPercentages?.forEach((clo: any) => {
            studentMap[id][clo.cloCode] = Number(clo.percentage.toFixed(2));
          });
        }
      },
    );

    // รวม PLO (ใช้ studentId)
    (ploStudentPercentageData?.ploPercentagePerStudent || []).forEach(
      (item: any) => {
        const id = item.studentId;
        if (studentMap[id]) {
          item.ploPercentages?.forEach((plo: any) => {
            studentMap[id][plo.ploCode] = Number(plo.percentage.toFixed(2));
          });
        }
      },
    );

    // รวม Assignments (ใช้ student_id)
    (
      assignmentStudentPercentageData?.realScorePercentagePerStudent || []
    ).forEach((item: any) => {
      const id = item.student_id;
      if (studentMap[id]) {
        item.categoryPercentages?.forEach((cat: any) => {
          studentMap[id][cat.category] = Number(cat.percentage.toFixed(2));
        });
      }
    });

    const flattenedStudents = Object.values(studentMap);

    // --- ขั้นตอนที่ 2: จัดกลุ่มและคำนวณค่าเฉลี่ย (Grouping & Aggregation) ---
    const groups = flattenedStudents.reduce((acc: any, s: any) => {
      const g = s.grade;
      if (!acc[g]) acc[g] = [];
      acc[g].push(s);
      return acc;
    }, {});

    // สกัด Keys สำหรับการคำนวณ
    const sample = flattenedStudents[0] || {};
    const allKeys = Object.keys(sample);
    const ploKeys = allKeys.filter((k) => k.startsWith("PLO"));
    const cloKeys = allKeys.filter((k) => k.startsWith("CLO"));
    const otherKeys = allKeys.filter(
      (k) =>
        !ploKeys.includes(k) &&
        !cloKeys.includes(k) &&
        !["grade", "studentId"].includes(k),
    );

    // --- ขั้นตอนที่ 3: จัดรูปแบบข้อมูลส่งออก (Formatting) ---
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
      .sort((a, b) => {
        const order = ["A", "B+", "B", "C+", "C", "D+", "D", "F", "N/A"];
        return order.indexOf(a.grade) - order.indexOf(b.grade);
      });
  }, [
    percentageStage,
    studentCourseAssScoreData,
    cloStudentPercentageData,
    ploStudentPercentageData,
    assignmentStudentPercentageData,
  ]);

  const metricBalanceConfig = {
    CLO: {
      title: "CLO Balance",
      trendData: cloPersentageData?.cloStatsPercentage || [],
      xAxis: "cloCode",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
      med: "median",
    },
    PLO: {
      title: "PLO Balance",
      trendData: ploPersentageData?.ploStatsPercentage || [],
      xAxis: "ploCode",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
      med: "median",
    },
    Ass: {
      title: "Assignment Balance",
      trendData: assignmentPersentageData?.categoryStatsPercentage || [],
      xAxis: "category",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
      med: "median",
    },
  };

  const metricConfig = {
    CLO: {
      title: "CLO Analysis",
      trendData: cloBalanceData?.cloStats || [],
      xAxis: "cloCode",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
      med: "median",
    },
    PLO: {
      title: "PLO Analysis",
      trendData: ploBalanceData?.ploStats || [],
      xAxis: "ploCode",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
      med: "median",
    },
    Ass: {
      title: "Assignment Analysis",
      trendData: assignmentBalanceData?.categoryStats || [],
      xAxis: "category",
      maxPos: "highestPossible",
      avg: "mean",
      max: "max",
      min: "min",
      med: "median",
    },
  };

  const [isPercentage, setIsPercentage] = useState(false);
  const currentConfig = isPercentage ? metricBalanceConfig : metricConfig;

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

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  const individualStudentData = useMemo(() => {
    if (!selectedStudentId) return null;

    // 1. หาข้อมูลนิสิตต้นทางจาก ID ที่เลือก (เพื่อให้ได้รหัส Code มาใช้เป็น Key ในภายหลัง)
    const targetStudent = students.find(
      (s) => String(s.id) === String(selectedStudentId),
    );
    if (!targetStudent) return null;

    let dataSource: any[] = [];

    if (isPercentage) {
      // 🟢 โหมด Percentage: ดึงข้อมูลโดยใช้ studentId เป็นหลัก
      if (activeMetric === "CLO") {
        dataSource = (
          cloStudentPercentageData?.cloPercentagePerStudent || []
        ).map((item: any) => ({
          // ใช้ student_id ที่มีในก้อน Percentage ตรงๆ
          studentId: item.student_id,
          Name: targetStudent.first_name, // ดึงชื่อจาก targetStudent ที่เราหาไว้แล้ว
          ...item.cloPercentages?.reduce(
            (acc: any, c: any) => ({
              ...acc,
              [c.cloCode]: Number(c.percentage.toFixed(2)),
            }),
            {},
          ),
        }));
      } else if (activeMetric === "PLO") {
        dataSource = (
          ploStudentPercentageData?.ploPercentagePerStudent || []
        ).map((item: any) => ({
          studentId: item.studentId, // ⚠️ สังเกตว่า PLO อาจใช้ camelCase
          ...item.ploPercentages?.reduce(
            (acc: any, p: any) => ({
              ...acc,
              [p.ploCode]: Number(p.percentage.toFixed(2)),
            }),
            {},
          ),
        }));
      } else {
        dataSource = (
          assignmentStudentPercentageData?.realScorePercentagePerStudent || []
        ).map((item: any) => ({
          studentId: item.student_id,
          ...item.categoryPercentages?.reduce(
            (acc: any, cat: any) => ({
              ...acc,
              [cat.category]: Number(cat.percentage.toFixed(2)),
            }),
            {},
          ),
        }));
      }
    } else {
      // ⚪️ โหมด Real Score (ใช้ flattenedData ที่มีคีย์ Code อยู่แล้ว)
      if (activeMetric === "CLO") dataSource = flattenedCLOTableData;
      else if (activeMetric === "PLO") dataSource = flattenedPLOTableData;
      else dataSource = flattenedAssTableData;
    }

    // 3. การค้นหา (Match):
    // - ถ้าเป็น Percentage ให้เทียบด้วย ID
    // - ถ้าเป็น Real Score ให้เทียบด้วย Code (เพราะ flattenedData มักใช้ Code เป็นคีย์หลัก)
    const studentData = dataSource.find((item: any) =>
      isPercentage
        ? String(item.studentId) === String(selectedStudentId)
        : String(item.Code) === String(targetStudent.student_code),
    );

    return studentData
      ? { ...studentData, Name: targetStudent.first_name }
      : null;
  }, [
    selectedStudentId,
    activeMetric,
    isPercentage,
    flattenedCLOTableData,
    flattenedPLOTableData,
    flattenedAssTableData,
    cloStudentPercentageData,
    ploStudentPercentageData,
    assignmentStudentPercentageData,
    students,
  ]);

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-900 pb-20 font-kanit">
      {loading && <LoadingOverlay />}
      <ToastElement />

      {/* Header & Sticky Filter Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
                <FaChartLine className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">
                  Analytics <span className="text-blue-600">Dashboard</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Performance Insight System
                </p>
              </div>
            </div>

            {selections.courseId && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportAllExcel}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white text-xs font-black rounded-xl transition-all active:scale-95"
                >
                  <FaFileExcel className="text-sm group-hover:scale-110 transition-transform" />{" "}
                  EXPORT REPORT
                </button>
                <button
                  onClick={handleCaptureGraph}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95"
                >
                  <FaCamera className="text-sm group-hover:rotate-12 transition-transform" />{" "}
                  SAVE IMAGE
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Filters Grid */}
          <div className="bg-slate-50/80 p-3 rounded-[2rem] border border-slate-100 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
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
              className="h-[46px] mt-auto text-slate-400 font-black hover:text-red-500 hover:bg-red-50 transition-colors border border-slate-200 rounded-xl text-[10px] uppercase tracking-widest"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10 space-y-10">
        {!selections.courseId ? (
          <div className="py-48 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 text-center flex flex-col items-center">
            <div className="bg-slate-50 p-10 rounded-full mb-8">
              <FaUniversity className="text-8xl text-slate-200" />
            </div>
            <h2 className="text-slate-400 font-black text-2xl uppercase tracking-widest italic">
              Ready to analyze?
            </h2>
            <p className="text-slate-300 mt-2 font-medium">
              Please select a course from the filters above to load data
            </p>
          </div>
        ) : (
          <>
            {/* Performance Navigation & Tab Switcher */}
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 border-b border-slate-200 pb-6">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                  Learning{" "}
                  <span className="text-blue-600 italic">Performance</span>
                </h3>
                <p className="text-slate-400 text-sm font-medium mt-1">
                  Visualize student achievements and outcome distributions
                </p>
              </div>
              <div className="flex bg-slate-200/50 p-1.5 rounded-2xl backdrop-blur-sm">
                {["CLO", "PLO", "Ass"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setActiveMetric(m as any)}
                    className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${activeMetric === m ? "bg-white text-blue-600 shadow-xl scale-105" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {m === "Ass" ? "ASSIGNMENTS" : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Analytics Container */}
            {/* --- ส่วนกราฟที่ปรับให้กระชับขึ้น (Tidier Version) --- */}
            <div
              ref={graphRef}
              id="analytics-graph-container"
              className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col"
            >
              {/* 1. Header & Primary Controls (กระชับขึ้น 40%) */}
              <div className="px-8 py-5 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4 bg-white">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md">
                    <FaThLarge className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-none">
                      {metricConfig[activeMetric].title}
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      {isPercentage ? "Percentage Mode" : "Real Score Mode"}
                    </p>
                  </div>
                </div>

                {/* รวมกลุ่ม Toggle ทั้งหมดเข้าด้วยกันในแนวราบ */}
                <div className="flex items-center gap-3">
                  {/* Real vs Percent */}
                  <div className="bg-slate-100 p-1 rounded-xl flex items-center shadow-inner">
                    <button
                      onClick={() => setIsPercentage(false)}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${!isPercentage ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
                    >
                      SCORE
                    </button>
                    <button
                      onClick={() => {
                        setIsPercentage(true);
                        setPercentageStage(true);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${isPercentage ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
                    >
                      PERCENT
                    </button>
                  </div>

                  <div className="h-6 w-px bg-slate-200" />

                  {/* Trend vs Balance */}
                  <div className="bg-slate-900 p-1 rounded-xl flex items-center">
                    <button
                      onClick={() => setActiveTab("line")}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${activeTab === "line" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
                    >
                      TREND
                    </button>
                    <button
                      onClick={() => setActiveTab("radar")}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${activeTab === "radar" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
                    >
                      BALANCE
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Secondary Bar: Student Focus & Statistical Toggles (ลดความสูงลง) */}
              <div className="px-8 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                {/* Student Selector แบบ Minimal */}

                {/* ส่วน Dropdown: ใช้ความกว้างที่พอเหมาะ ไม่ให้ยาวเกินไปจนดันส่วนอื่น */}
                <div className="min-w-[240px] lg:min-w-[300px] flex items-center gap-2">
                  <DropdownSelect
                    label="Individual Focus"
                    value={selectedStudentId || ""}
                    disabled={!selections.courseId}
                    options={studentCourseAssScoreData.map((scoreItem: any) => {
                      const studentInfo = students.find(
                        (std: any) =>
                          String(std.id) === String(scoreItem.student_id),
                      );
                      return {
                        label: studentInfo
                          ? `${studentInfo.student_code} - ${studentInfo.first_name} ${studentInfo.last_name}`
                          : `ID: ${scoreItem.student_id}`,
                        value: String(scoreItem.student_id),
                      };
                    })}
                    onChange={(v) => setSelectedStudentId(v as string)}
                  />

                  {selectedStudentId && (
                    <button
                      onClick={() => setSelectedStudentId(null)}
                      className="flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-red-100 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm group mt-4" // mt-4 เพื่อให้กึ่งกลางพอกับระดับ Dropdown
                      title="Clear Focus"
                    >
                      <svg
                        className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* ปุ่ม Clear: ปรับให้ดูเป็นส่วนหนึ่งของคอมโพเนนต์มากขึ้น */}

                {/* 4. Grade Group Footer (เลื่อนลงมาเป็นส่วนท้ายของกราฟ) */}
                <div className="px-8 py-4 bg-slate-50/30 border-t border-slate-100">
                  <div className="flex flex-wrap justify-center gap-2">
                    {(isPercentage
                      ? gradeGroupStatsPercentage
                      : gradeGroupStats
                    ).map((item: any) => (
                      <button
                        key={item.grade}
                        onClick={() =>
                          setVisibleLines((p) => ({
                            ...p,
                            [`avg_grade_${item.grade}`]:
                              !p[`avg_grade_${item.grade}`],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black border transition-all flex items-center gap-2 
                      ${visibleLines[`avg_grade_${item.grade}`] ? "bg-white shadow-sm border-slate-200 text-slate-800" : "bg-transparent border-transparent text-slate-300"}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getGradeColor(item.grade) }}
                        />
                        {item.grade}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Statistical Toggles แบบไอคอนหรือปุ่มจิ๋ว */}
                <div className="flex items-center gap-2">
                  <ToggleButton
                    label="MAX"
                    active={visibleLines.maxScore}
                    onClick={() =>
                      setVisibleLines((p) => ({ ...p, maxScore: !p.maxScore }))
                    }
                    color="#22c55e"
                  />
                  <ToggleButton
                    label="MIN"
                    active={visibleLines.minScore}
                    onClick={() =>
                      setVisibleLines((p) => ({ ...p, minScore: !p.minScore }))
                    }
                    color="#ef4444"
                  />
                  <ToggleButton
                    label="AVG"
                    active={visibleLines.allAvg}
                    onClick={() =>
                      setVisibleLines((p) => ({ ...p, allAvg: !p.allAvg }))
                    }
                    color="#6366f1"
                  />
                  <ToggleButton
                    label="MED"
                    active={visibleLines.midScore}
                    onClick={() =>
                      setVisibleLines((p) => ({ ...p, midScore: !p.midScore }))
                    }
                    color="#f59e0b"
                  />
                </div>
              </div>

              {/* 3. Graph Area (เพิ่มพื้นที่แสดงผล) */}
              <div className="p-6">
                <div className="h-[480px] w-full">
                  {activeTab === "line" ? (
                    <PerformanceTrendChart
                      chartData={currentConfig[activeMetric].trendData}
                      balanceData={
                        isPercentage
                          ? gradeGroupStatsPercentage
                          : gradeGroupStats
                      }
                      individualStudentData={individualStudentData}
                      getGradeColor={getGradeColor}
                      xAxisKey={currentConfig[activeMetric].xAxis}
                      maxScorePosKey={currentConfig[activeMetric].maxPos}
                      maxScoreKey={currentConfig[activeMetric].max}
                      minScoreKey={currentConfig[activeMetric].min}
                      allAvgKey={currentConfig[activeMetric].avg}
                      midScoreKey={currentConfig[activeMetric].med}
                      visibleLines={visibleLines}
                    />
                  ) : (
                    <PerformanceBalanceChart
                      chartData={currentConfig[activeMetric].trendData}
                      balanceData={
                        isPercentage
                          ? gradeGroupStatsPercentage
                          : gradeGroupStats
                      }
                      individualStudentData={individualStudentData}
                      xAxisKey={currentConfig[activeMetric].xAxis}
                      maxScorePosKey={currentConfig[activeMetric].maxPos}
                      maxScoreKey={currentConfig[activeMetric].max}
                      minScoreKey={currentConfig[activeMetric].min}
                      allAvgKey={currentConfig[activeMetric].avg}
                      midScoreKey={currentConfig[activeMetric].med}
                      visibleLines={visibleLines}
                      getGradeColor={getGradeColor}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Table Data Section */}
            <div className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/40 mb-20">
              <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/20">
                <div>
                  <h4 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                    Raw Data <span className="text-blue-600">Breakdown</span>
                  </h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 italic">
                    Tabular view of student achievements
                  </p>
                </div>
                <span className="px-5 py-2 bg-blue-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-blue-100 uppercase tracking-widest">
                  {activeMetric} Analysis
                </span>
              </div>
              <div className="p-6">
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
                            ...Object.keys(flattenedAssTableData[0] || {})
                              .filter(
                                (k) =>
                                  !["Code", "Name", "Total", "Grade"].includes(
                                    k,
                                  ),
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
