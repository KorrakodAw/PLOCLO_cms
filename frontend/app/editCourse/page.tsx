"use client";

import { useState, useEffect } from "react";
import DropdownSelect from "../../components/DropdownSelect";
import CourseManagement from "./courseManage";
import ProtectedRoute from "../../components/ProtectedRoute";

import { getUniversities, University } from "../../utils/universityApi";
import { getFaculties, Faculty } from "../../utils/facultyApi";
import { getPrograms, Program } from "../../utils/programApi";
import { Course } from "../../utils/courseApi";
import { apiClient } from "@/utils/apiClient";

import { useTranslation } from "react-i18next";

export default function EditCourse() {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [course, setCourse] = useState("");
  // const ACTIVE_TAB_KEY = "editCourseActiveTab";
  // const ACTIVE_TAB_KEY = `activeTab_${location.pathname}`;

  const [universityOptions, setUniversityOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [facultyOptions, setFacultyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [programOptions, setProgramOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [yearOptions, setYearOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [semesterOptions] = useState([
    { label: t("all"), value: "" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "summer", value: "3" },
  ]);
  const [sectionOptions] = useState([
    { label: t("all"), value: "" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
  ]);
  const [, setCourseOptions] = useState<{ label: string; value: string }[]>([]);

  const tabs = [
    { id: "general", label: t("general information") },
    // { id: "clo", label: t("course learning outcomes (CLO)") },
    // { id: "clo-plo-mapping", label: t("clo-plo mapping") },
    // { id: "assignment", label: t("assignment mapping") },
    // { id: "course-clo-mapping", label: t("course-clo mapping") },
  ];

  // const [activeTab, setActiveTab] = useState<string>(() => {
  //   try {
  //     if (typeof window !== "undefined") {
  //       const hash = window.location.hash
  //         ? window.location.hash.replace(/^#/, "")
  //         : "";
  //       const valid = [
  //         "general",
  //         "clo",
  //         "clo-plo-mapping",
  //         "assignment",
  //         "course-clo-mapping",
  //       ];
  //       if (hash && valid.includes(hash)) return hash;
  //       const stored = localStorage.getItem(ACTIVE_TAB_KEY);
  //       if (stored && valid.includes(stored)) return stored;
  //     }
  //   } catch {
  //     // ignore
  //   }
  //   return "general";
  // });

  // Fetch university options
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    getUniversities(token)
      .then((data) => {
        setUniversityOptions([
          { label: t("all"), value: "" },
          ...data.map((u: University) => ({
            label: lang === "th" ? u.name_th : u.name, // ⬅️ FIX: Conditional label assignment
            value: String(u.id),
          })),
        ]);
      })
      .catch((err) => {
        console.error(err);
        setUniversityOptions([{ label: t("all"), value: "" }]);
      });
  }, [t]);

  // เมื่อเลือกมหาวิทยาลัย → โหลดคณะ
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !university) {
      setFaculty("");
      setProgram("");
      setYear("");
      setSection("");
      setSemester("");
      setFacultyOptions([{ label: t("all"), value: "" }]);
      setProgramOptions([{ label: t("all"), value: "" }]);
      setYearOptions([{ label: t("all"), value: "" }]);
      return;
    }

    if (university) {
      setFaculty("");
      setProgram("");
      setYear("");
      setSection("");
      setSemester("");
      setProgramOptions([{ label: t("all"), value: "" }]);
      setYearOptions([{ label: t("all"), value: "" }]);
    }

    getFaculties(token, university)
      .then((data) => {
        setFacultyOptions([
          { label: t("all"), value: "" },
          ...data.map((f: Faculty) => ({
            label: lang === "th" ? f.name_th : f.name, // ⬅️ FIX: Conditional label assignment if needed
            value: String(f.id),
          })),
        ]);
      })
      .catch(() => setFacultyOptions([{ label: t("all"), value: "" }]));
  }, [university, t, lang]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !faculty) {
      setProgram("");
      setYear("");
      setProgramOptions([{ label: t("all"), value: "" }]);
      setYearOptions([{ label: t("all"), value: "" }]);

      return;
    }
    console.log("facultyId: ", faculty);

    getPrograms(token, faculty) // ← ส่ง facultyId ไป
      .then((data) => {
        const uniquePrograms = Array.from(
          new Map(data.map((p: Program) => [p.program_code, p])).values()
        );

        setProgramOptions([
          { label: t("all"), value: "" },
          ...(uniquePrograms as Program[]).map((p) => ({
            label:
              lang === "th" ? p.program_shortname_th : p.program_shortname_en, // ⬅️ FIX: Conditional label assignment if needed
            value: String(p.program_code),
          })),
        ]);
      })
      .catch(() => {
        setProgramOptions([{ label: t("all"), value: "" }]);
      });
  }, [faculty, t]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !faculty || !program) {
      setYear("");
      setSemester("");
      setSection("");
      setYearOptions([{ label: t("all"), value: "" }]);

      return;
    }

    getPrograms(token, faculty)
      .then((data) => {
        // Filter programs with the selected program_code
        const years = (
          Array.from(
            new Set(
              data
                .filter(
                  (p: Program) => String(p.program_code) === String(program)
                )
                .map((p: Program) => p.program_year)
            )
          ) as number[]
        ).sort((a, b) => b - a);

        if (years.length === 0) {
          setYearOptions([{ label: t("all"), value: "" }]);
        } else {
          setYearOptions([
            { label: t("all"), value: "" },
            ...years.map((y) => {
              const label = lang === "en" ? String(y - 543) : String(y);
              return { label, value: String(y) }; // display converted label, keep real value
            }),
          ]);
        }
      })
      .catch(() => setYearOptions([{ label: t("all"), value: "" }]));
  }, [program, faculty, t, lang]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !faculty || !program || !year) {
      setCourseOptions([{ label: t("all"), value: "" }]);
      setCourse("");
      return;
    }

    // Fetch courses based on selected filters
    const fetchCourses = async () => {
      try {
        const data = await apiClient.get(
          `/courses?facultyId=${faculty}&programCode=${program}&year=${year}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setCourseOptions([
          { label: t("all"), value: "" },
          ...data.data.map((course: Course) => ({
            label: course.name,
            value: String(course.id),
          })),
        ]);
      } catch (err) {
        console.error(err);
        setCourseOptions([{ label: t("all"), value: "" }]);
      }
    };

    fetchCourses();
  }, [faculty, program, year, t, lang]);

  // useEffect(() => {
  //   try {
  //     // update hash without adding history entry
  //     if (typeof window !== "undefined") {
  //       window.history.replaceState(null, "", `#${activeTab}`);
  //     }
  //     localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  //   } catch {
  //     // ignore localStorage/window errors
  //   }
  // }, [ACTIVE_TAB_KEY, activeTab]);

  const clearFilters = () => {
    setUniversity("");
    setFaculty("");
    setProgram("");
    setYear("");
    setSemester("");
    setSection("");
  };

  return (
    <ProtectedRoute roles={["admin", "instructor"]}>
      <div className="max-w-[1400px] h-full flex flex-col mx-auto">
        <p className="font-extralight text-2xl">{t("course information")}</p>

        <div className="flex gap-3 mt-5 px-3 py-2 ">
          {/* {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              isActive={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                clearFilters();
              }}
            />
          ))} */}
        </div>
        <hr />

        <div className="flex gap-3 mt-5 items-center">
          <DropdownSelect
            label={t("university")}
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            options={universityOptions}
          />
          <DropdownSelect
            label={t("faculty")}
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            options={facultyOptions}
            disabled={!university}
          />
          <DropdownSelect
            label={t("program")}
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            options={programOptions}
            disabled={!faculty}
          />
          <DropdownSelect
            label={t("year")}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={yearOptions}
            disabled={!program}
          />
          <DropdownSelect
            label={t("semester")}
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            options={semesterOptions}
            disabled={!year}
          />
          <DropdownSelect
            label={t("section")}
            value={section}
            onChange={(e) => setSection(e.target.value)}
            options={sectionOptions}
            disabled={!semester}
          />
          <button
            onClick={() => {
              setUniversity("");
              setFaculty("");
              setProgram("");
              setYear("");
              setSemester("");
              setSection("");
            }}
            className="text-white bg-orange-300 hover:bg-orange-400 h-5 flex ml-3 items-center p-2 rounded-full cursor-pointer"
          >
            {t("clear")}
          </button>
        </div>
        <CourseManagement
          facultyId={faculty}
          universityId={university}
          programId={program}
          year={year}
          semester={semester}
          section={section}
        />
        {/* {activeTab === "general" && (
          <CourseManagement
            facultyId={faculty}
            universityId={university}
            programId={program}
            year={year}
            semester={semester}
            section={section}
          />
        )}
        {activeTab === "clo" && (
          <CLOManagement
            universityId={university}
            facultyId={faculty}
            programId={program}
            year={year}
            courseId={course}
            semester={semester}
            section={section}
          />
        )} */}
        {/* {activeTab === "clo-plo-mapping" && <CLOPLOMapping />} */}
        {/* {activeTab === "assignment" && <AssignmentMapping />} */}
        {/* {activeTab === "course-clo-mapping" && <CourseCLOMapping />} */}
      </div>
    </ProtectedRoute>
  );
}
