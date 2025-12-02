import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../../components/Toast";
import React, { useEffect, useState } from "react";

import DropdownSelect from "../../components/DropdownSelect";
import { University, getUniversities } from "../../utils/universityApi";
import { getFaculties, Faculty } from "../../utils/facultyApi";
import { getPrograms, Program } from "../../utils/programApi";
import { getCourses, Course } from "../../utils/courseApi";
import { apiClient } from "../../utils/apiClient";

interface Option {
  label: string;
  value: string;
}

interface CourseVariant {
  id: string;
  code: string;
  name: string;
  program_id: string;
  year: number;
  semester: number;
  section: string;
}

interface Assignment {
  id: number;
  course_id: number;
  name: string;
  description: string;
  max_score: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

export default function AssignmentMapping() {
  const { token, isLoggedIn } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  // --- SELECTION STATES ---
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedCourseCode, setSelectedCourseCode] = useState(""); // Stores "305100"
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // Stores the specific database ID (e.g., 145) determined by Code + Semester + Section

  // --- OPTION STATES ---
  const [uniOptions, setUniOptions] = useState<Option[]>([]);
  const [facOptions, setFacOptions] = useState<Option[]>([]);
  const [progOptions, setProgOptions] = useState<Option[]>([]);
  const [yearOptions, setYearOptions] = useState<Option[]>([]);
  const [courseOptions, setCourseOptions] = useState<Option[]>([]);
  const [semesterOptions, setSemesterOptions] = useState<Option[]>([]);
  const [sectionOptions, setSectionOptions] = useState<Option[]>([]);

  // --- DATA STATES ---
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [courseVariants, setCourseVariants] = useState<CourseVariant[]>([]);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [newAssignName, setNewAssignName] = useState("");

  const [specificCourseId, setSpecificCourseId] = useState<string>("");

  // --------------------------------------------------------
  // 1. DROPDOWN LOADING LOGIC
  // --------------------------------------------------------

  // A. Load Universities
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    getUniversities(token)
      .then((data) => {
        setUniOptions([
          { label: t("please select a university"), value: "" },
          ...data.map((u: University) => ({
            label: u.name,
            value: String(u.id),
          })),
        ]);
      })
      .catch(() => showToast("API university error", "error"));
  }, [isLoggedIn, token, t, showToast]);

  // B. Load Faculties
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedUniversity) {
      setFacOptions([{ label: t("please select a faculty"), value: "" }]);
      setSelectedFaculty("");
      return;
    }
    getFaculties(token, selectedUniversity)
      .then((data) => {
        setFacOptions([
          { label: t("please select a faculty"), value: "" },
          ...data.map((f: Faculty) => ({ label: f.name, value: String(f.id) })),
        ]);
      })
      .catch(() => showToast("API faculty error", "error"));
  }, [isLoggedIn, token, selectedUniversity, t, showToast]);

  // C. Load Programs & Years (Optimized Fetch)
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedFaculty) {
      setAllPrograms([]);
      setYearOptions([{ label: t("please select a year"), value: "" }]);
      setProgOptions([{ label: t("please select a program"), value: "" }]);
      return;
    }
    getPrograms(token, selectedFaculty)
      .then((data) => {
        setAllPrograms(data);
        const years = Array.from(
          new Set(data.map((p: Program) => Number(p.program_year)))
        ).sort((a, b) => Number(b) - Number(a));
        setYearOptions([
          { label: t("please select a year"), value: "" },
          ...years.map((y) => ({
            label: lang === "en" ? String(Number(y) - 543) : String(y),
            value: String(y),
          })),
        ]);
      })
      .catch((err) => showToast("API program error: " + err.message, "error"));
  }, [isLoggedIn, token, selectedFaculty, t, lang, showToast]);

  // D. Filter Programs by Year
  useEffect(() => {
    if (!selectedYear || allPrograms.length === 0) {
      setProgOptions([{ label: t("please select a program"), value: "" }]);
      return;
    }
    const filtered = allPrograms.filter(
      (p) => String(p.program_year) === selectedYear
    );
    setProgOptions([
      { label: t("please select a program"), value: "" },
      ...filtered.map((p) => ({
        label: p.program_shortname_en,
        value: String(p.id),
      })),
    ]);
  }, [selectedYear, allPrograms, t]);

  // E. Load Courses (Unique Codes)
  // E. Load Courses (Unique Codes)
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedProgram) {
      setCourseOptions([{ label: t("please select a course"), value: "" }]);
      setSelectedCourseCode("");
      return;
    }
    getCourses(token, selectedProgram)
      .then((data: any) => {
        // FIX: Add 'as Course[]' at the end of Array.from
        const unique = Array.from(
          new Map(data.map((c: Course) => [c.code, c])).values()
        ) as Course[];

        setCourseOptions([
          { label: "please select a course", value: "" },
          // Now TypeScript knows 'c' is a Course, so this works:
          ...unique.map((c) => ({
            label: `${c.code} - ${c.name}`,
            value: String(c.code),
          })),
        ]);
      })
      .catch(() => showToast("API course error", "error"));
  }, [isLoggedIn, token, selectedProgram, t, showToast]);

  // F. Load Variants (Semesters/Sections) based on Course Code
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedCourseCode) {
      setCourseVariants([]);
      setSemesterOptions([{ label: t("please select a semester"), value: "" }]);
      setSectionOptions([{ label: t("please select a section"), value: "" }]);
      return;
    }
    getCourses(token, selectedProgram).then((data: any) => {
      const variants = data.filter(
        (c: Course) => String(c.code) === selectedCourseCode
      );
      setCourseVariants(variants);
    });
  }, [isLoggedIn, token, selectedCourseCode, selectedProgram]);

  // G. Filter Semesters
  useEffect(() => {
    if (courseVariants.length === 0) {
      setSemesterOptions([{ label: t("please select a semester"), value: "" }]);
      return;
    }
    const semesters = Array.from(
      new Set(courseVariants.map((c) => String(c.semester)))
    ).sort();
    setSemesterOptions([
      { label: t("please select a semester"), value: "" },
      ...semesters.map((s) => ({ label: "semester " + s, value: s })),
    ]);
  }, [courseVariants, t]);

  // H. Filter Sections
  useEffect(() => {
    if (!selectedSemester) {
      setSectionOptions([{ label: t("please select a section"), value: "" }]);
      return;
    }
    const sections = courseVariants
      .filter((c) => String(c.semester) === selectedSemester)
      .map((c) => String(c.section))
      .sort();
    setSectionOptions([
      { label: t("please select a section"), value: "" },
      ...sections.map((s) => ({ label: "section " + s, value: s })),
    ]);
  }, [selectedSemester, courseVariants, t]);

  // I. Determine Specific Course ID
  useEffect(() => {
    if (selectedSemester && selectedSection && courseVariants.length > 0) {
      const found = courseVariants.find(
        (c) =>
          String(c.semester) === selectedSemester &&
          String(c.section) === selectedSection
      );
      setSpecificCourseId(found ? found.id : "");
    } else {
      setSpecificCourseId("");
    }
  }, [selectedSemester, selectedSection, courseVariants]);
  // 1. Fetch Assignments when specificCourseId changes
  useEffect(() => {
    if (!specificCourseId || !token) {
      setAssignments([]);
      return;
    }

    apiClient
      .get(`/assignments?courseId=${specificCourseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAssignments(res.data))
      .catch((err) => console.error(err));
  }, [specificCourseId, token]);

  // 2. Handle Create Function
  const handleAddAssignment = async () => {
    if (!newAssignName) return;

    try {
      await apiClient.post(
        "/assignments",
        {
          course_id: Number(specificCourseId),
          name: newAssignName,
          max_score: 100, // Default or add input for this
          weight: 10, // Default or add input for this
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      showToast("Assignment added!", "success");
      setNewAssignName("");

      // Refresh list
      const res = await apiClient.get(
        `/assignments?courseId=${specificCourseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
      showToast("Failed to add assignment", "error");
    }
  };

  return (
    <div className="mt-5 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{t("assignment mapping")}</h1>
      </div>

      <hr className="my-3" />
      {/* --- FILTERS --- */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DropdownSelect
            label="University"
            value={selectedUniversity}
            options={uniOptions}
            onChange={(e) => setSelectedUniversity(e.target.value)}
          />
          <DropdownSelect
            label="Faculty"
            value={selectedFaculty}
            options={facOptions}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            disabled={!selectedUniversity}
          />
          <DropdownSelect
            label="Year"
            value={selectedYear}
            options={yearOptions}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={!selectedFaculty}
          />
          <DropdownSelect
            label="Program"
            value={selectedProgram}
            options={progOptions}
            onChange={(e) => setSelectedProgram(e.target.value)}
            disabled={!selectedYear}
          />

          <DropdownSelect
            label="Course"
            value={selectedCourseCode}
            options={courseOptions}
            onChange={(e) => setSelectedCourseCode(e.target.value)}
            disabled={!selectedProgram}
          />
          <DropdownSelect
            label="Semester"
            value={selectedSemester}
            options={semesterOptions}
            onChange={(e) => setSelectedSemester(e.target.value)}
            disabled={!selectedCourseCode}
          />
          <DropdownSelect
            label="Section"
            value={selectedSection}
            options={sectionOptions}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedSemester}
          />
        </div>
      </div>
      {specificCourseId && (
        <div className="bg-white p-5 rounded-xl shadow-sm border mt-6">
          <h2 className="text-xl font-bold mb-4">Manage Assignments</h2>

          {/* Input Form */}
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="Assignment Name (e.g. Midterm)"
              value={newAssignName}
              onChange={(e) => setNewAssignName(e.target.value)}
            />
            <button
              onClick={handleAddAssignment}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add
            </button>
          </div>

          {/* List */}
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="border p-3 rounded flex justify-between"
              >
                <span>
                  {a.name} (Max Score: {a.max_score})
                </span>
                <span className="text-gray-500 text-sm">
                  Created: {new Date(a.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ToastElement />
    </div>
  );
}
