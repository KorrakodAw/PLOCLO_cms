"use client";

import React, { useEffect, useState } from "react";
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
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ViewChartPage() {
  const { token, user } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [loading, setLoading] = useState(false);

  interface Option {
    value: string;
    label: string;
  }

  interface Course {
    courseCode: string;
    courseName: string;
    courseNameTh: string;
    semesterId: number;
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
    id: string;
    year: string;
  } | null>(null);

  const [chartSemesterParams, setChartSemesterParams] = useState<{
    id: string;
    year: string;
    semester: string;
  } | null>(null);

  const [chartCourseParams, setChartCourseParams] = useState<{
    Csemester_id: string;
    year: string;
    semester: string;
    courseId: string;
    program_id: string;
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
    if (token && (selections.university || selections.faculty)) {
      localStorage.setItem("edit_fix_filters", JSON.stringify(selections));
    }
  }, [selections, token]);

  const isInstructor = user?.role === "instructor";
  const isStudent = user?.role === "student";
  const isGuest = user?.role === "guest";


  const updateSelections = (updates: Partial<typeof selections>) => {
    setSelections((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (!token || !user?.email) return;

    const initializeBaseData = async () => {
      try {
        const uniRes = await apiClient.get("/university", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const universityOptions = uniRes.data.map((uni: University) => ({
          label: lang === "th" ? uni.name_th || uni.name : uni.name,
          value: String(uni.id),
        }));

        if (isInstructor) {
          const insRes = await apiClient.get(
            `/instructor/email/${user.email}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const facultyId = insRes.data?.faculty_id;

          const facRes = await apiClient.get(`/faculty/${facultyId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const facultyData = facRes.data;

          const allFacsRes = await apiClient.get("/faculty", {
            headers: { Authorization: `Bearer ${token}` },
            params: { university_id: facultyData.university_id },
          });

          const formattedFacs = allFacsRes.data.map((f: Faculty) => ({
            label: lang === "th" ? f.name_th || f.name : f.name,
            value: String(f.id),
          }));

          // ✅ อัปเดต Options: มหาลัยทั้งหมด + คณะในมหาลัยนั้น
          setOptions((prev) => ({
            ...prev,
            university: universityOptions,
            faculty: formattedFacs,
          }));

          // ✅ อัปเดต Selections ล็อกค่าตามสังกัด
          updateSelections({
            university: String(facultyData.university_id),
            faculty: String(facultyData.id),
          });
        } else if (isStudent) {
          // --- 🎓 Student Logic ---

          // 1. ดึงข้อมูลนักศึกษาจาก Email
          const stdRes = await apiClient.get(`/student/email/${user.email}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const studentData = stdRes.data; // ในนี้จะมี program_id ของนักศึกษาคนนี้

          // 2. ดึงข้อมูล Program ของนักศึกษาคนนี้โดยเฉพาะ เพื่อเอา program_year จริงๆ
          const studentProgramRes = await apiClient.get(
            `/program/${studentData.program_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const studentProgramData = studentProgramRes.data;
          const targetYear = studentProgramData.program_year; // 🟢 ปีการศึกษาที่นักศึกษาสังกัด

          // 3. ดึงข้อมูล Faculty (เพื่อเอา university_id และชื่อคณะ)
          const facRes = await apiClient.get(
            `/faculty/${studentProgramData.faculty_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const facultyData = facRes.data;

          // 4. ดึงรายการปีการศึกษาทั้งหมดที่เปิดใน Program Code นี้ (เพื่อสร้างตัวเลือกใน Dropdown)
          const yearRes = await apiClient.get(`/program/ByCodeForViewChart`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { programCode: studentProgramData.program_code },
          });

          const yearOptions = yearRes.data.map((item: any) => ({
            label: item.program_year.toString(),
            value: JSON.stringify({ id: item.id, year: item.program_year }),
          }));

          // 🟢 5. หาตัวเลือก (Option) ที่มี year ตรงกับ studentProgramData.program_year
          const studentYearOption =
            yearOptions.find((opt: any) => {
              try {
                const val = JSON.parse(opt.value);
                return val.year === targetYear;
              } catch {
                return false;
              }
            }) || yearOptions[0];

          // ✅ อัปเดต Options
          setOptions((prev) => ({
            ...prev,
            university: universityOptions,
            faculty: [
              {
                label: lang === "th" ? facultyData.name_th : facultyData.name,
                value: String(facultyData.id),
              },
            ],
            program: [
              {
                label:
                  lang === "th"
                    ? studentProgramData.program_shortname_th
                    : studentProgramData.program_shortname_en,
                value: String(studentProgramData.program_code),
              },
            ],
            years: yearOptions,
          }));

          // ✅ ล็อกค่า Selections ทั้งหมดตามสังกัดของนักศึกษา
          updateSelections({
            university: String(facultyData.university_id),
            faculty: String(facultyData.id),
            program: String(studentProgramData.program_code),
            years: studentYearOption ? studentYearOption.value : "", // 🟢 ล็อกปีการศึกษาที่ถูกต้อง
          });
        } else {
          setOptions((prev) => ({ ...prev, university: universityOptions }));
        }
      } catch (err) {
        console.error(err);
        showToast("Error initializing data", "error");
      }
    };

    initializeBaseData();
  }, [token, lang, isInstructor, user?.email]);

  useEffect(() => {
    if (isInstructor || !selections.university || !token) return;

    const fetchFaculties = async () => {
      try {
        const res = await apiClient.get("/faculty", {
          headers: { Authorization: `Bearer ${token}` },
          params: { university_id: selections.university },
        });
        const facOptions = res.data.map((f: Faculty) => ({
          label: lang === "th" ? f.name_th || f.name : f.name,
          value: String(f.id),
        }));
        setOptions((prev) => ({ ...prev, faculty: facOptions, program: [] }));
      } catch {
        showToast("Error fetching faculty", "error");
      }
    };
    fetchFaculties();
  }, [selections.university, token, lang, isInstructor]);

  useEffect(() => {
    if (!selections.faculty || !token) return;

    const fetchPrograms = async () => {
      try {
        const res = await apiClient.get(
          `/program/ByFaculty/${selections.faculty}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const progOptions = res.data.map((p: Program) => ({
          label:
            lang === "th"
              ? p.program_shortname_th || p.program_shortname_en
              : p.program_shortname_en,
          value: p.program_code,
        }));

        setOptions((prev) => ({ ...prev, program: progOptions }));

        if (isInstructor && progOptions.length === 1 && !selections.program) {
          updateSelections({ program: progOptions[0].value });
        }
      } catch {
        showToast("Error fetching program", "error");
      }
    };
    fetchPrograms();
  }, [selections.faculty, token, lang, isInstructor]);

  useEffect(() => {
    const fetchYears = async () => {
      if (!selections.program || !token) return;
      try {
        const res = await apiClient.get(`/program/ByCodeForViewChart`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { programCode: selections.program },
        });
        const options = res.data.map(
          (item: { program_year: number; id: number }) => ({
            label: item.program_year.toString(),
            value: JSON.stringify({ id: item.id, year: item.program_year }),
          }),
        );
        setOptions((prev) => ({ ...prev, years: options }));
      } catch {
        showToast("Error fetching years", "error");
      }
    };

    fetchYears();
  }, [selections.program, token]);

  useEffect(() => {
    const fetchSemesters = async () => {
      if (!selections.years || !token) return;

      try {
        let selectedYear;
        try {
          const yearObj =
            typeof selections.years === "string"
              ? JSON.parse(selections.years)
              : selections.years;
          selectedYear = yearObj?.year;
        } catch {
          selectedYear = selections.years;
        }

        if (!selectedYear) return;

        const res = await apiClient.get(`/course/unique/${selectedYear}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const semesterOptions = res.data.map((item: number) => ({
          label: `${item}`,
          value: String(item),
        }));

        setOptions((prev) => ({ ...prev, semester: semesterOptions }));
      } catch (error) {
        console.error("Fetch Semesters Error:", error);
        showToast("Error fetching semesters", "error");
      }
    };

    fetchSemesters();
  }, [selections.years, token, showToast]);

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

        const courseOptions = res.data.map((c: Course) => ({
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
  }, [selections.semester, selections.years]);

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

  const handleClearFilters = () => {
    if (isInstructor) {
      updateSelections({
        university: selections.university,
        faculty: selections.faculty,
        program: "",
        years: "",
        courses: "",
        semester: "",
      });
      setChartYearParams(null);
    } else if (isStudent) {
      updateSelections({
        university: selections.university,
        faculty: selections.faculty,
        program: selections.program,
        years: selections.years,
        courses: "",
        semester: "",
      });
    } else {
      updateSelections({
        university: "",
        faculty: "",
        program: "",
        years: "",
        courses: "",
        semester: "",
      });
      setChartYearParams(null);
    }

    setChartSemesterParams(null);
    setChartCourseParams(null);
    localStorage.removeItem("edit_fix_filters");
  };

  return (
    <ProtectedRoute
      roles={[
        "system_admin",
        "Super_admin",
        "instructor",
        "curriculum_admin",
        "student",
        "guest",
      ]}
    >
      {loading && <LoadingOverlay />}{" "}
      {/* แสดง Loading Overlay เมื่อกำลังโหลดข้อมูล */}
      <div className="max-w-[1500px] mx-auto">
        <div
          className={`relative bg-white/60 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm 
        grid grid-cols-2 md:grid-cols-3 gap-5 items-end transition-all duration-300
        ${isGuest ? "xl:grid-cols-5" : "xl:grid-cols-7"}`} // 🟢 ปรับจำนวน Column ตาม Role
        >
          {/* 1. University */}
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
            disabled={isInstructor || isStudent}
          />

          {/* 2. Faculty */}
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
            disabled={!selections.university || isInstructor || isStudent}
          />

          {/* 3. Program */}
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
            disabled={!selections.faculty || isStudent}
          />

          {/* 4. Year */}
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
            disabled={!selections.program || isStudent}
          />

          {/* 🟢 5. Semester (ซ่อนถ้าเป็น Guest) */}
          {!isGuest && (
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
          )}

          {/* 🟢 6. Course (ซ่อนถ้าเป็น Guest) */}
          {!isGuest && (
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
          )}

          {/* 7. Clear Filters Button */}
          <div
            className={`col-span-2 md:col-span-3 flex justify-end xl:justify-center pb-1 ${isGuest ? "xl:col-span-1" : "xl:col-span-1"}`}
          >
            <button
              onClick={handleClearFilters}
              className="w-full xl:w-auto px-5 py-2.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white 
             border border-red-100 hover:border-red-500 rounded-2xl text-xs font-black 
             transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              CLEAR
            </button>
          </div>
        </div>
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
          courseId={chartCourseParams.courseId}
          program_id={chartCourseParams.program_id}
        />
      )}
    </ProtectedRoute>
  );
}
