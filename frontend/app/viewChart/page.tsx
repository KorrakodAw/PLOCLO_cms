"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/utils/apiClient";
import DropdownSelect from "@/components/DropdownSelect";
import { useAuth } from "../context/AuthContext";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useTranslation } from "react-i18next";
import { University } from "@/utils/universityApi";
import { Faculty } from "@/utils/facultyApi";
import { Program } from "@/utils/programApi";
import LoadingOverlay from "@/components/LoadingOverlay";

import YearStatsDashboard from "./YearStatsDashboard";
import SemesterStatsDashboard from "./SemesterStatsDashboard";
import CourseStatsDashboard from "./CourseStatsDashboard";
import { University } from "lucide-react";

export default function ViewChartPage() {
  const { token } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [loading, setLoading] = useState(false);

  interface Option {
    value: string;
    label: string;
  }

  const [options, setOptions] = useState({
    university: [] as Option[],
    faculty: [] as Option[],
    program: [] as Option[],
    years: [] as Option[],
    courses: [] as Option[],
    semester: [] as Option[],
  });

  const [selections, setSelections] = useState({
    university: "",
    faculty: "",
    program: "",
    years: "",
    courses: "",
    semester: "",
  });

  const [chartYearParams, setChartYearParams] = useState<{
    id: any;
    year: any;
  } | null>(null);

  const [chartSemesterParams, setChartSemesterParams] = useState<{
    id: any;
    year: any;
    semester: any;
  } | null>(null);

  const [chartCourseParams, setChartCourseParams] = useState<{
    Csemester_id: any;
    year: any;
    semester: any;
    courseId: any;
    program_id: any;
  } | null>(null);

  const [isHydrated, setIsHydrated] = useState(false);

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

  useEffect(() => {
    if (!token) return;

    apiClient
      .get("/university", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const universityOptions = res.data.map((uni: University) => ({
          label: lang === "th" ? uni.name_th || uni.name : uni.name,
          value: String(uni.id),
        }));
        setOptions((prev) => ({ ...prev, university: universityOptions }));
      })
      .catch((err) => {
        showToast("Error fetching university", "error");
      });
  }, [token, lang]); // โหลดแค่ตอน Token หรือ ภาษาเปลี่ยน

  // 1. ฟังก์ชันดึงข้อมูลคณะ (เน้นดึงอย่างเดียว)
  useEffect(() => {
    const fetchFaculties = async () => {
      if (!selections.university || !token) return;
      try {
        const res = await apiClient.get("/faculty", {
          headers: { Authorization: `Bearer ${token}` },
          params: { university_id: selections.university },
        });
        const options = res.data.map((f: any) => ({
          label: lang === "th" ? f.name_th || f.name : f.name,
          value: String(f.id),
        }));
        setOptions((prev) => ({ ...prev, faculty: options }));
      } catch {
        showToast("Error fetching faculty", "error");
      }
    };

    fetchFaculties();
  }, [selections.university, token, lang]); // รันเมื่อ University เปลี่ยน

  useEffect(() => {
    const fetchPrograms = async () => {
      if (!selections.faculty || !token) return;
      try {
        const res = await apiClient.get(
          `/program/ByFaculty/${selections.faculty}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const options = res.data.map((p: any) => ({
          label:
            lang === "th"
              ? p.program_shortname_th || p.program_shortname_en
              : p.program_shortname_en,
          value: p.program_code,
        }));
        setOptions((prev) => ({ ...prev, program: options }));
      } catch {
        showToast("Error fetching program", "error");
      }
    };

    fetchPrograms();
  }, [selections.faculty, token, lang]);

  useEffect(() => {
    const fetchYears = async () => {
      if (!selections.program || !token) return;
      try {
        const res = await apiClient.get(`/program/ByCodeForViewChart`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { programCode: selections.program },
        });
        const options = res.data.map((item: any) => ({
          label: item.program_year.toString(),
          value: JSON.stringify({ id: item.id, year: item.program_year }),
        }));
        setOptions((prev) => ({ ...prev, years: options }));
      } catch {
        showToast("Error fetching years", "error");
      }
    };

    fetchYears();
  }, [selections.program, token]);

  useEffect(() => {
    const fetchSemesters = async () => {
      // 1. ตรวจสอบเงื่อนไข: ต้องมีทั้งปีที่เลือก และ Token
      if (!selections.years || !token) return;

      try {
        // 2. จัดการเรื่อง JSON Value (กรณีที่ปีถูกเก็บเป็น Stringified Object)
        let selectedYear;
        try {
          const yearObj =
            typeof selections.years === "string"
              ? JSON.parse(selections.years)
              : selections.years;
          selectedYear = yearObj?.year;
        } catch (e) {
          // ถ้า Parse ไม่ได้ ให้ใช้ค่านั้นตรงๆ (เผื่อกรณีเป็นตัวเลขธรรมดา)
          selectedYear = selections.years;
        }

        if (!selectedYear) return;

        // 3. เรียก API
        const res = await apiClient.get(`/course/unique/${selectedYear}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // 4. แปลงข้อมูลสำหรับ Dropdown
        const semesterOptions = res.data.map((item: any) => ({
          label: `${item}`,
          value: String(item), // 🟢 บังคับเป็น String
        }));

        // 5. อัปเดต Options ใน State
        setOptions((prev) => ({ ...prev, semester: semesterOptions }));
      } catch (error) {
        console.error("Fetch Semesters Error:", error);
        showToast("Error fetching semesters", "error");
      }
    };

    fetchSemesters();
  }, [selections.years, token, showToast]); // 🟢 รันใหม่ทุกครั้งที่ selections.years เปลี่ยน

  useEffect(() => {
    const fetchCourses = async () => {
      if (!selections.years || !selections.semester || !token) return;

      try {
        const yearObj = JSON.parse(selections.years);
        const res = await apiClient.get(`/course/list`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            year: yearObj.year,
            semester: selections.semester,
            programId: yearObj.id,
          },
        });

        const courseOptions = res.data.map((c: any) => ({
          label: `${c.courseCode} - ${lang === "th" ? c.courseNameTh : c.courseName}`,
          value: String(c.semesterId), // 🟢 บังคับเป็น String
        }));
        setOptions((prev) => ({ ...prev, courses: courseOptions }));
      } catch (err) {
        console.error(err);
      }
    };

    fetchCourses();
  }, [selections.years, selections.semester, token, lang]);

  // 2. ใช้ useEffect ควบคุมเมื่อ University เปลี่ยน

  useEffect(() => {
    if (selections.years) {
      setChartSemesterParams(null); // ล้างค่า Semester ทุกครั้งที่ Year เปลี่ยน

      try {
        const yearData =
          typeof selections.years === "string"
            ? JSON.parse(selections.years)
            : selections.years;

        setChartYearParams({ id: yearData.id, year: yearData.year });
      } catch (e) {
        console.error(e);
      }
    } else {
      setChartYearParams(null); // ล้างค่าถ้าไม่ได้เลือกปี
    }
  }, [selections.years]);

  useEffect(() => {
    if (selections.semester) {
      setChartYearParams(null);
      try {
        // 1. จัดการเรื่อง JSON String หรือ Object ให้ปลอดภัย
        const yearData =
          typeof selections.years === "string"
            ? JSON.parse(selections.years)
            : selections.years;

        // 2. ตรวจสอบว่ามีข้อมูล year จริงๆ ก่อนค่อย Set
        if (yearData && yearData.year) {
          setChartSemesterParams({
            id: yearData.id,
            year: yearData.year,
            semester: selections.semester,
          });
        }
      } catch (e) {
        console.error("Error parsing year data:", e);
      }
    } else {
      setChartSemesterParams(null);
    }
  }, [selections.semester, selections.years]); // 👈 เพิ่ม selections.years ในนี้ด้วยเพื่อให้ค่าอัปเดตเมื่อปีเปลี่ยน

  useEffect(() => {
    if (selections.courses) {
      setChartYearParams(null);
      setChartSemesterParams(null);
      try {
        const yearData =
          typeof selections.years === "string"
            ? JSON.parse(selections.years)
            : selections.years;

        if (yearData && yearData.year) {
          setChartCourseParams({
            Csemester_id: selections.courses,
            year: yearData.year,
            semester: selections.semester,
            courseId: selections.courses,
            program_id: yearData.id, // 🟢 เพิ่ม program_id จาก yearData
          });
        }
      } catch (e) {
        console.error("Error parsing year data:", e);
      }
    } else {
      setChartCourseParams(null);
    }
  }, [selections.courses, selections.years, selections.semester]);

  const updateSelections = (updates: Partial<typeof selections>) => {
    setSelections((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div>
      {loading && <LoadingOverlay />}{" "}
      {/* แสดง Loading Overlay เมื่อกำลังโหลดข้อมูล */}
      <div
        className="bg-white/50 
              min-[768px]:grid-cols-3 
              min-[1400px]:grid-cols-6 
              items-endbg-white/50 backdrop-blur-sm p-4 rounded-[2.5rem] border border-slate-200/60 shadow-sm grid grid-cols-2  gap-4 items-end"
      >
        <DropdownSelect
          label="University"
          options={options.university}
          value={selections.university}
          onChange={(val) =>
            updateSelections({
              university: String(val),
              faculty: "",
              program: "",
              years: "",
              courses: "",
              semester: "",
            })
          }
        />
        <DropdownSelect
          label="Faculty"
          options={options.faculty}
          value={selections.faculty}
          onChange={(val) =>
            updateSelections({
              faculty: String(val),
              program: "",
              years: "",
              courses: "",
              semester: "",
            })
          }
          disabled={!selections.university}
        />
        <DropdownSelect
          label="Program"
          options={options.program}
          value={selections.program}
          onChange={(val) =>
            updateSelections({
              program: String(val),
              years: "",
              courses: "",
              semester: "",
            })
          }
          disabled={!selections.faculty}
        />
        <DropdownSelect
          label="Year"
          options={options.years}
          value={selections.years}
          onChange={(val) =>
            updateSelections({
              years: String(val),
              semester: "",
              courses: "",
            })
          }
          disabled={!selections.program}
        />
        <DropdownSelect
          label="Semester"
          options={options.semester}
          value={selections.semester}
          onChange={(val) =>
            updateSelections({
              semester: String(val),
              courses: "",
            })
          }
          disabled={!selections.years}
        />
        <DropdownSelect
          label="Course"
          options={options.courses}
          value={selections.courses}
          onChange={(val) =>
            updateSelections({
              courses: String(val),
            })
          }
          disabled={!selections.semester}
        />
      </div>
      {/* แสดง Dashboard ตามการเลือก */}
      {!chartYearParams && !chartSemesterParams && !chartCourseParams && (
        <div className="mt-12 mb-20 flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
          {/* Icon Container */}
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-10 h-10 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>

          {/* Text Content */}
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            Ready to analyze your data?
          </h3>
          <p className="text-slate-500 text-center max-w-sm leading-relaxed">
            Please select a{" "}
            <span className="font-semibold text-blue-600">Year</span> or
            <span className="font-semibold text-blue-600"> Semester</span> from
            the dropdown above to generate the performance statistics.
          </p>

          {/* Simple Hint Decorator */}
          <div className="mt-8 flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-widest">
            <div className="w-8 h-px bg-slate-200"></div>
            Waiting for selection
            <div className="w-8 h-px bg-slate-200"></div>
          </div>
        </div>
      )}
      {chartYearParams && (
        <YearStatsDashboard
          programId={chartYearParams.id}
          year={chartYearParams.year}
        />
      )}
      {chartSemesterParams && (
        <SemesterStatsDashboard
          programId={chartSemesterParams.id}
          year={chartSemesterParams.year}
          semester={chartSemesterParams.semester}
        />
      )}
      {chartCourseParams && (
        <CourseStatsDashboard
          CsemesterId={chartCourseParams.Csemester_id}
          year={chartCourseParams.year}
          semester={chartCourseParams.semester}
          courseId={chartCourseParams.courseId}
          program_id={chartCourseParams.program_id}
        />
      )}
    </div>
  );
}
