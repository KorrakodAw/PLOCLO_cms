"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Calculator,
  UserPlus,
  Trash2,
  Edit3,
  Copy,
} from "lucide-react"; // Assuming you use lucide-react based on your icons
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/components/Toast";
import { useTranslation } from "react-i18next";
import { Course, getCoursePaginate } from "@/utils/courseApi";
import { apiClient } from "@/utils/apiClient";

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
import { useRouter } from "next/navigation";

// --- Interfaces ---
interface PaginatedResponse {
  data: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
  const router = useRouter();
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

    // Store the ID we are about to delete to find the neighbor later
    const deletedId = formData.id;
    setLoading(true);

    try {
      await apiClient.delete(`/course/${deletedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const response = await fetchMatchingCourses(token, courseCode);
      const matching = response.data || [];
      setDuplicateCourses(matching);

      if (matching.length > 0) {
        // Find the best "previous" candidate:
        // The largest ID that is still smaller than the one we just deleted
        const previousVariant = matching
          .filter((c) => c.id < deletedId)
          .sort((a, b) => b.id - a.id)[0];

        if (previousVariant) {
          setSelectedSectionId(String(previousVariant.id));
        } else {
          // If no smaller ID exists, fall back to the first available one in the list
          setSelectedSectionId(String(matching[0].id));
        }
      } else {
        setFormData(null);
        setError(t("No more course variants available."));
      }

      setShowDeletePopup(false);
      showToast(t("Course variant deleted successfully"), "success");
    } catch {
      showToast(t("Failed to delete course variant"), "error");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 NEW: Handler to remove instructor (Optional but good UX)

  const [selectedTerm, setSelectedTerm] = useState<string>(""); // Format: "Year-Semester"
  const termOptions = useMemo(() => {
    const terms = duplicateCourses.map((c) => ({
      year: c.year,
      semester: c.semester,
    }));
    // Remove duplicates
    const uniqueTerms = terms.filter(
      (value, index, self) =>
        index ===
        self.findIndex(
          (t) => t.year === value.year && t.semester === value.semester,
        ),
    );

    return uniqueTerms
      .sort(
        (a, b) =>
          Number(b.year) - Number(a.year) ||
          Number(b.semester) - Number(a.semester),
      )
      .map((t) => ({
        label: `${t.year} / ${t.semester}`,
        value: `${t.year}-${t.semester}`,
      }));
  }, [duplicateCourses]);

  const sectionOptions = useMemo(() => {
    const [year, semester] = selectedTerm.split("-");
    return duplicateCourses
      .filter((c) => String(c.year) === year && String(c.semester) === semester)
      .sort((a, b) => Number(a.section) - Number(b.section))
      .map((c) => ({
        label: `${t("section")} ${c.section}`,
        value: String(c.id),
      }));
  }, [selectedTerm, duplicateCourses, t]);

  useEffect(() => {
    if (duplicateCourses.length > 0 && !selectedTerm) {
      const latest = [...duplicateCourses].sort(
        (a, b) => Number(b.year) - Number(a.year),
      )[0];
      setSelectedTerm(`${latest.year}-${latest.semester}`);
      setSelectedSectionId(String(latest.id));
    }
  }, [duplicateCourses]);

  // --- Render ---
  if (loading && !formData) return <LoadingOverlay />;
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 ">
          {/* Top Row: Title & Dual Selection */}
          <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                  {formData.course_id}
                </span>
                {/* Cleaned up redundant text here */}
              </div>

              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                  {lang === "en" ? formData.name : formData.name_th}
                </h1>
                <span className="text-2xl font-medium text-orange-500">
                  ({formData.code})
                </span>
              </div>
            </div>

            {/* Combined Selection Group */}
            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto relative z-[50]">
              <div className="w-full md:w-[130px]">
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">
                  {t("year") + "/ " + t("semester")}
                </label>
                <DropdownSelect
                  value={selectedTerm}
                  options={termOptions}
                  onChange={(value) => {
                    setSelectedTerm(String(value));
                    const [y, s] = String(value).split("-");
                    const firstSec = duplicateCourses.find(
                      (c) => String(c.year) === y && String(c.semester) === s,
                    );
                    if (firstSec) setSelectedSectionId(String(firstSec.id));
                  }}
                />
              </div>
              <div className="w-full md:w-[130px]">
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">
                  {t("Section")}
                </label>
                <DropdownSelect
                  value={selectedSectionId}
                  options={sectionOptions}
                  onChange={(value) => {
                    setLoading(true);
                    setSelectedSectionId(String(value));
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: Separated Action Toolbar */}
          <div className="px-6 py-4 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() =>
                  router.push(
                    `/editCourse/${courseCode}/instructors?courseId=${formData?.course_id}`,
                  )
                }
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm"
              >
                <UserPlus size={16} />
                {t("Instructors")}
              </button>

              <button
                onClick={() => setShowEditPopup(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-orange-600 transition-all shadow-sm"
              >
                <Edit3 size={16} />
                {t("Metadata")}
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200 justify-end">
              <button
                onClick={handleDuplicateSection}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-all"
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

        {/* --- STICKY NAVIGATION CONTROLS --- */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 sticky top-4 z-20">
          <div className="bg-white p-1 rounded-xl shadow-md border border-gray-200 flex">
            <button
              onClick={() => handleModeChange("setup")}
              className={`flex-1 lg:px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all
              ${viewMode === "setup" ? "bg-gray-900 text-white shadow-inner" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <BookOpen size={16} />
              {t("Course Setup")}
            </button>
            <button
              onClick={() => handleModeChange("grading")}
              className={`flex-1 lg:px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all
              ${viewMode === "grading" ? "bg-emerald-600 text-white shadow-inner" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <Calculator size={16} />
              {t("Grading & Scores")}
            </button>
          </div>

          <div className="w-full lg:w-72 shadow-md rounded-xl">
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
