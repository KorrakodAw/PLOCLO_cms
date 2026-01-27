"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Calculator,
  UserPlus,
  Trash2,
  MoreHorizontal,
  Edit3,
  Copy,
  X,
  ChevronRight,
  School,
} from "lucide-react"; // Assuming you use lucide-react based on your icons
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/components/Toast";
import { useTranslation } from "react-i18next";
import { Course, getCoursePaginate } from "@/utils/courseApi";
import { apiClient } from "@/utils/apiClient";
import { useCallback } from "react";

import LoadingOverlay from "@/components/LoadingOverlay";
import DropdownSelect from "@/components/DropdownSelect";
import FormEditPopup from "@/components/EditPopup";
import BreadCrumb from "@/components/BreadCrumb";

// ... [Keep imports for Mappings/Components] ...
import CLOManagement from "../cloManage";
import AddStudentCourse from "../addStudentCourse";
import CloPloMapping from "../cloploMapping";
import AssignmentMapping from "../assignmentMapping";
import AssignmentCloMapping from "../assignmentCloMapping";
import AssignmentPloMapping from "../assignmentPloMapping";
import ScoreMapping from "../scoreMapping";
import GradeSetting from "../gradeSetting";
import ScoreCalculated from "../scoreCalculatedforGrade";
import AlertPopup from "@/components/AlertPopup";

// --- Interfaces ---
interface PaginatedResponse {
  data: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Option {
  label: string;
  value: string;
}

// ✅ Added Instructor Interface
interface Instructor {
  id: number;
  full_thai_name: string;
  full_eng_name: string;
  email: string;
  phoneNum: string;
}

// ... [Keep fetchMatchingCourses function] ...
async function fetchMatchingCourses(
  token: string,
  courseCode: string,
): Promise<PaginatedResponse> {
  const limit = 10;
  const page = 1;
  try {
    const res = await getCoursePaginate(token, page, limit, {
      courseCode: courseCode,
    });
    return res as unknown as PaginatedResponse;
  } catch {
    console.error("Error fetching courses");
    throw new Error("Error fetching courses");
  }
}

export default function EditCourseClient({
  courseCode,
}: {
  courseCode: string;
}) {
  const { isLoggedIn, token } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // --- State ---
  const [formData, setFormData] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCourses, setDuplicateCourses] = useState<Course[]>([]);
  const [viewMode, setViewMode] = useState<"setup" | "grading">("setup");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  // ... [Keep existing visibility states] ...
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showStudentTable, setShowStudentTable] = useState(false);
  const [showCloPloMappingTable, setShowCloPloMappingTable] = useState(false);
  const [showAssignmentTable, setShowAssignmentTable] = useState(false);
  const [showCloTable, setShowCloTable] = useState(true);
  const [showAssignmentCloMappingTable, setShowAssignmentCloMappingTable] =
    useState(false);
  const [showAssignmentPloMappingTable, setShowAssignmentPloMappingTable] =
    useState(false);
  const [showScoreMappingTable, setShowScoreMappingTable] = useState(false);
  const [showGradeSettingTable, setShowGradeSettingTable] = useState(false);
  const [showScoreCalculatedTable, setShowScoreCalculatedTable] =
    useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [, setCourseToDelete] = useState<Course | null>(null);

  // 🟢 NEW STATES FOR INSTRUCTOR POPUP
  const [showInstructorPopup, setShowInstructorPopup] = useState(false);
  const [currentInstructors, setCurrentInstructors] = useState<Instructor[]>(
    [],
  );
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [selectedInstructorToAdd, setSelectedInstructorToAdd] =
    useState<string>("");

  // ... [Keep courseOptions useMemo] ...
  const courseOptions: Option[] = useMemo(() => {
    if (duplicateCourses.length === 0) return [];
    return [...duplicateCourses]
      .sort((a, b) => {
        if (Number(b.year) !== Number(a.year))
          return Number(b.year) - Number(a.year);
        if (Number(b.semester) !== Number(a.semester))
          return Number(b.semester) - Number(a.semester);
        return Number(a.section) - Number(b.section);
      })
      .map((c) => ({
        label: `${t("Year")} ${c.year} / ${t("Sem")} ${c.semester} - ${t("Sec")} ${c.section}`,
        value: String(c.id),
      }));
  }, [duplicateCourses, t]);

  // ... [Keep Fetch Matching Variants useEffect] ...
  useEffect(() => {
    if (!isLoggedIn || !token || !courseCode) {
      setLoading(false);
      return;
    }
    fetchMatchingCourses(token, courseCode)
      .then((response) => {
        const matching = response.data || [];
        setDuplicateCourses(matching);
        if (matching.length > 0) {
          const latest = matching.sort((a, b) => {
            if (Number(b.year) !== Number(a.year))
              return Number(b.year) - Number(a.year);
            if (Number(b.semester) !== Number(a.semester))
              return Number(b.semester) - Number(a.semester);
            return Number(a.section) - Number(b.section);
          })[0];
          setSelectedSectionId(String(latest.id));
        } else {
          setError(t("Course data not found."));
        }
      })
      .catch(() => setError(t("Failed to load course data.")))
      .finally(() => setLoading(false));
  }, [isLoggedIn, token, courseCode, t]);

  // ... [Keep Sync Selection useEffect] ...
  useEffect(() => {
    const selected = duplicateCourses.find(
      (c) => String(c.id) === selectedSectionId,
    );
    setLoading(false);
    setFormData(selected || null);
  }, [selectedSectionId, duplicateCourses]);

  // Add this near your other useEffects
  useEffect(() => {
    if (showInstructorPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showInstructorPopup]);

  // ... [Keep SETUP_TABS, GRADING_TABS, handleTabChange, handleModeChange] ...
  const SETUP_TABS = [
    {
      id: "clo",
      label: t("clo"),
      color: "text-blue-600",
      dot: "bg-blue-500",
      state: showCloTable,
    },
    {
      id: "student",
      label: t("student"),
      color: "text-emerald-600",
      dot: "bg-emerald-500",
      state: showStudentTable,
    },
    {
      id: "mapping",
      label: t("CLO–PLO Mapping"),
      color: "text-violet-600",
      dot: "bg-violet-500",
      state: showCloPloMappingTable,
    },
    {
      id: "assignment",
      label: t("assignment"),
      color: "text-amber-600",
      dot: "bg-amber-500",
      state: showAssignmentTable,
    },
    {
      id: "assignment-clo-mapping",
      label: t("Assignment–CLO Mapping"),
      color: "text-rose-600",
      dot: "bg-rose-500",
      state: showAssignmentCloMappingTable,
    },
    {
      id: "assignment-plo-mapping",
      label: t("Assignment–PLO Mapping"),
      color: "text-indigo-600",
      dot: "bg-indigo-500",
      state: showAssignmentPloMappingTable,
    },
    {
      id: "grade-setting",
      label: t("Grade Setting"),
      color: "text-pink-600",
      dot: "bg-pink-500",
      state: showGradeSettingTable,
    },
  ];

  const GRADING_TABS = [
    {
      id: "score-mapping",
      label: t("Score Mapping"),
      color: "text-gray-600",
      dot: "bg-gray-500",
      state: showScoreMappingTable,
    },
    {
      id: "score-calculated",
      label: "Score Calculated",
      color: "text-green-600",
      dot: "bg-green-500",
      state: showScoreCalculatedTable,
    },
  ];

  const currentTabs = viewMode === "setup" ? SETUP_TABS : GRADING_TABS;
  const activeTabObj = currentTabs.find((t) => t.state) || currentTabs[0];

  const handleTabChange = (tabId: string) => {
    setShowCloTable(false);
    setShowStudentTable(false);
    setShowCloPloMappingTable(false);
    setShowAssignmentTable(false);
    setShowAssignmentCloMappingTable(false);
    setShowAssignmentPloMappingTable(false);
    setShowScoreMappingTable(false);
    setShowGradeSettingTable(false);
    setShowScoreCalculatedTable(false);

    if (tabId === "clo") setShowCloTable(true);
    if (tabId === "student") setShowStudentTable(true);
    if (tabId === "mapping") setShowCloPloMappingTable(true);
    if (tabId === "assignment") setShowAssignmentTable(true);
    if (tabId === "assignment-clo-mapping")
      setShowAssignmentCloMappingTable(true);
    if (tabId === "assignment-plo-mapping")
      setShowAssignmentPloMappingTable(true);
    if (tabId === "score-mapping") setShowScoreMappingTable(true);
    if (tabId === "grade-setting") setShowGradeSettingTable(true);
    if (tabId === "score-calculated") setShowScoreCalculatedTable(true);
  };

  const handleModeChange = (mode: "setup" | "grading") => {
    setViewMode(mode);
    if (mode === "setup") {
      handleTabChange("clo");
    } else {
      handleTabChange("score-mapping");
    }
  };

  // --- Handlers ---
  // ... [Keep handleDuplicateSection, deleteCourseVariant] ...

  const handleDuplicateSection = async () => {
    if (!formData || !token) return;
    // ... (logic omitted for brevity, keep your original code) ...
    const existingSectionsInTerm = duplicateCourses.filter(
      (c) =>
        String(c.year) === String(formData.year) &&
        String(c.semester) === String(formData.semester),
    );

    const maxSection = Math.max(
      ...existingSectionsInTerm.map((c) => Number(c.section)),
      0,
    );
    const nextSection = String(maxSection + 1).padStart(3, "0");

    setLoading(true);
    try {
      const { ...payload } = formData;
      const res = await apiClient.post(
        "/course",
        {
          ...payload,
          section: nextSection,
          year: formData.year,
          semester: formData.semester,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast(`${t("Created Section")} ${nextSection}`, "success");
      const updatedResponse = await fetchMatchingCourses(token, courseCode);
      setDuplicateCourses(updatedResponse.data);
      setSelectedSectionId(String(res.data.id));
    } catch {
      showToast(t("Failed to duplicate section"), "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteCourseVariant = async () => {
    if (!formData || !token) return;
    setLoading(true);
    try {
      await apiClient.delete(`/course/${formData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchMatchingCourses(token, courseCode).then((response) => {
        const matching = response.data || [];
        setDuplicateCourses(matching);
        if (matching.length > 0) {
          const latest = matching.sort((a, b) => {
            if (Number(b.year) !== Number(a.year))
              return Number(b.year) - Number(a.year);
            if (Number(b.semester) !== Number(a.semester))
              return Number(b.semester) - Number(a.semester);
            return Number(a.section) - Number(b.section);
          })[0];
          setSelectedSectionId(String(latest.id));
        } else {
          setFormData(null);
          setError(t("No more course variants available."));
        }
      });
      setCourseToDelete(null);
      setShowDeletePopup(false);
      showToast(t("Course variant deleted successfully"), "success");
    } catch {
      showToast(t("Failed to delete course variant"), "error");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 NEW: Handler to open the Instructor Manager
  // 🟢 UPDATED: Handler to open the Instructor Manager
  const handleOpenInstructorManager = async () => {
    if (!formData || !token) return;
    setLoading(true);

    try {
      // 1. Fetch Instructors already assigned to this course (Current List)
      // Note: Ensure your backend has this endpoint: GET /course/:id/instructors
      const courseInstRes = await apiClient.get(
        `/instructorOnCourse/${formData.course_id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCurrentInstructors(courseInstRes.data || []);

      // 2. Fetch Faculty ID using the Program ID
      let facultyId: number | null = null;

      if (formData.program_id) {
        // Fetch program details to get the faculty_id
        const programRes = await apiClient.get(
          `/program/${formData.program_id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        facultyId = programRes.data.faculty_id;
      }

      // 3. Fetch Available Instructors filtered by Faculty
      if (facultyId) {
        const allInstRes = await apiClient.get(
          `/instructor?facultyId=${facultyId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setAllInstructors(allInstRes.data || []);
        console.log(allInstructors);
      } else {
        console.warn("Could not find faculty ID for this program");
        setAllInstructors([]);
      }

      setShowInstructorPopup(true);
    } catch (err) {
      console.error("Error loading instructor data:", err);
      showToast(t("Failed to load instructors"), "error");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 NEW: Handler to add selected instructor
  const addInstructorToCourse = async () => {
    if (!formData || !token || !selectedInstructorToAdd) return;
    setLoading(true);
    try {
      await apiClient.post(
        `/instructorOnCourse`,
        {
          courseId: formData.course_id,
          instructorId: Number(selectedInstructorToAdd),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast(t("Instructor added to course successfully"), "success");

      // Refresh the list inside the popup
      const res = await apiClient.get(
        `/instructorOnCourse/${formData.course_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCurrentInstructors(res.data || []);
      setSelectedInstructorToAdd(""); // Reset selection
    } catch {
      showToast(t("Failed to add instructor to course"), "error");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 NEW: Handler to remove instructor (Optional but good UX)
  const removeInstructorFromCourse = async (instructorId: number) => {
    if (!formData || !token) return;
    if (!confirm(t("Are you sure you want to remove this instructor?"))) return;

    setLoading(true);
    try {
      // Assuming there is an endpoint to remove. If not, you might need to adjust.
      // Often it's DELETE /course/:id/instructor/:instructorId
      await apiClient.delete(
        `/instructorOnCourse/${formData.course_id}/${instructorId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast(t("Instructor removed"), "success");

      // Refresh list
      const res = await apiClient.get(
        `/instructorOnCourse/${formData.course_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCurrentInstructors(res.data || []);
    } catch {
      showToast(t("Failed to remove instructor"), "error");
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---
  if (loading && !formData && !showInstructorPopup) return <LoadingOverlay />;
  if (error || !formData) return <LoadingOverlay />;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* --- TOP NAVIGATION --- */}
      <div className="px-5 md:px-8 py-6">
        <BreadCrumb
          items={[
            { label: t("manage courses"), href: "/editCourse" },
            {
              label:
                lang === "en" ? formData.name || "" : formData.name_th || "",
              href: `/editCourse/${courseCode}`,
            },
          ]}
        />
      </div>

      <div className="px-5 md:px-8 space-y-6">
        {loading && <LoadingOverlay />}
        <ToastElement />

        {/* --- MAIN HEADER CARD --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          {/* Top Row: Title & Context Switcher */}
          <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Title Section */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-700 text-xs font-bold tracking-wide uppercase">
                  {formData.course_id}
                </span>
                {/* <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold tracking-wide uppercase">
                  {t("Sec")}
                </span> */}
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
                  {lang === "en" ? formData.name : formData.name_th}
                </h1>
                <h1 className="text-2xl font-medium text-orange-500 tracking-tight mt-1">
                  {formData.code && ` (${formData.code})`}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <School size={16} />
                  {t("Year")}: {formData.year}
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span>
                  {t("Sem")}: {formData.semester}
                </span>
              </div>
            </div>

            {/* Context Switcher (Year/Sem/Sec) */}
            <div className="w-full lg:w-72 relative z-[60]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase">
                {t("Switch Section")}
              </label>
              <DropdownSelect
                value={selectedSectionId}
                options={courseOptions}
                onChange={(value) => {
                  setLoading(true);
                  setSelectedSectionId(String(value));
                }}
              />
            </div>
          </div>

          {/* Bottom Row: Action Toolbar */}
          <div className="px-6 py-4 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Primary Actions */}
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <button
                onClick={handleOpenInstructorManager}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm"
              >
                <UserPlus size={16} />
                {t("Instructors")}
              </button>

              <button
                onClick={() => setShowEditPopup(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-orange-600 transition-all shadow-sm"
              >
                <Edit3 size={16} />
                {t("Metadata")}
              </button>
            </div>

            {/* Secondary/Destructive Actions */}
            <div className="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200">
              <button
                onClick={handleDuplicateSection}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-all"
              >
                <Copy size={16} />
                {t("Duplicate")}
              </button>

              <button
                onClick={() => setShowDeletePopup(true)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title={t("Delete Section")}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* --- NAVIGATION & CONTENT CONTROLS --- */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sticky top-4 z-20">
          {/* Mode Switcher (Pill Style) */}
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex w-full lg:w-auto">
            <button
              onClick={() => handleModeChange("setup")}
              className={`
                flex-1 lg:flex-none px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all
                ${
                  viewMode === "setup"
                    ? "bg-gray-900 text-white shadow-md"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }
              `}
            >
              <BookOpen size={16} />
              {t("Course Setup")}
            </button>
            <button
              onClick={() => handleModeChange("grading")}
              className={`
                flex-1 lg:flex-none px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all
                ${
                  viewMode === "grading"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }
              `}
            >
              <Calculator size={16} />
              {t("Grading & Scores")}
            </button>
          </div>

          {/* Tab Selector */}
          <div className="w-full lg:w-80">
            <DropdownSelect
              value={activeTabObj.id}
              options={currentTabs.map((tab) => ({
                label: tab.label,
                value: tab.id,
              }))}
              onChange={(value) => handleTabChange(String(value))}
            />
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="transition-all duration-300 ease-in-out">
          {/* Wrapper for all tables to ensure consistent styling.
            If you want them separate, keep the logic, but this wrapper
            helps standardization.
          */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
            {/* Tip: Add a Header inside the individual components (CLOManagement, etc.)
                or render a generic title here based on activeTabObj.label 
             */}

            <div className="p-6">
              {showCloTable && formData && (
                <CLOManagement courseId={String(formData.course_id)} />
              )}
              {showStudentTable && formData && (
                <AddStudentCourse
                  masterCourseId={String(formData.course_id)}
                  programId={formData.program_id}
                  sectionId={String(formData.id)}
                />
              )}
              {showCloPloMappingTable && (
                <CloPloMapping
                  masterCourseId={String(formData.course_id)}
                  programId={formData.program_id}
                />
              )}
              {showAssignmentTable && (
                <AssignmentMapping courseId={String(formData.course_id)} />
              )}
              {showAssignmentCloMappingTable && (
                <AssignmentCloMapping courseId={String(formData.course_id)} />
              )}
              {showAssignmentPloMappingTable && (
                <AssignmentPloMapping courseId={String(formData.course_id)} />
              )}
              {showScoreMappingTable && (
                <ScoreMapping
                  masterCourseId={String(formData.course_id)}
                  sectionId={String(formData.id)}
                />
              )}
              {showGradeSettingTable && formData && (
                <GradeSetting masterCourseId={String(formData.course_id)} />
              )}
              {showScoreCalculatedTable && formData && (
                <ScoreCalculated
                  masterCourseId={String(formData.course_id)}
                  sectionId={String(formData.id)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- POPUPS --- */}

      {/* Instructor Manager Popup - Refined */}
      {showInstructorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {t("Manage Instructors")}
                </h3>
                {/* <p className="text-sm text-gray-500">
                  Section {formData.section}
                </p> */}
              </div>
              <button
                onClick={() => setShowInstructorPopup(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Current Instructors Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t("Active Instructors")}
                  </label>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {currentInstructors.length}
                  </span>
                </div>

                {currentInstructors.length > 0 ? (
                  <div className="space-y-3">
                    {currentInstructors.map((inst) => (
                      <div
                        key={inst.id}
                        className="group flex justify-between items-center p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center text-sm font-bold border border-blue-50">
                            {inst.full_eng_name
                              ? inst.full_eng_name.charAt(0)
                              : "T"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {inst.full_thai_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {inst.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeInstructorFromCourse(inst.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                          title={t("Remove")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <UserPlus
                      className="mx-auto text-gray-300 mb-2"
                      size={24}
                    />
                    <p className="text-sm text-gray-500">
                      {t("No instructors assigned yet")}
                    </p>
                  </div>
                )}
              </div>

              {/* Add New Section */}
              <div className="pt-6 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  {t("Add Instructor")}
                </label>
                <div className="flex flex-col gap-3">
                  <DropdownSelect
                    label={t("Select from list...")}
                    value={selectedInstructorToAdd}
                    options={allInstructors
                      .filter(
                        (all) =>
                          !currentInstructors.some(
                            (curr) => curr.id === all.id,
                          ),
                      )
                      .map((inst) => ({
                        label: `${inst.full_thai_name} (${inst.email})`,
                        value: String(inst.id),
                      }))}
                    onChange={(val) => setSelectedInstructorToAdd(String(val))}
                  />
                  <button
                    onClick={addInstructorToCourse}
                    disabled={!selectedInstructorToAdd}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
                  >
                    {t("Add to Course")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Other Popups (Keep as is) --- */}
      {showEditPopup && formData && (
        <FormEditPopup
          title={t("Edit Course")}
          data={formData}
          fields={[
            { label: t("Course Name (EN)"), key: "name", type: "text" },
            { label: t("Course Name (TH)"), key: "name_th", type: "text" },
          ]}
          onSave={() => {}}
          onChange={(updated) => setFormData(updated)}
          onClose={() => setShowEditPopup(false)}
        />
      )}

      <AlertPopup
        title={t("confirm deletion")}
        type="confirm"
        message={`${t("Are you sure you want to delete the section")} ${formData?.section || ""} ${t("This action cannot be undone.")}`}
        isOpen={showDeletePopup}
        onCancel={() => {
          setShowDeletePopup(false);
          setCourseToDelete(null);
        }}
        onConfirm={deleteCourseVariant}
      />
    </div>
  );
}
