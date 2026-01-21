"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BookOpen, Calculator } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/components/Toast";
import { useTranslation } from "react-i18next";
import { Course, getCoursePaginate } from "@/utils/courseApi";

import { apiClient } from "@/utils/apiClient";

import LoadingOverlay from "@/components/LoadingOverlay";
import DropdownSelect from "@/components/DropdownSelect";
import FormEditPopup from "@/components/EditPopup";

import CloPloMapping from "../cloploMapping";
import AssignmentMapping from "../assignmentMapping";
import AssignmentCloMapping from "../assignmentCloMapping";
import AddStudentCourse from "../addStudentCourse";
import AlertPopup from "@/components/AlertPopup";
import ScoreMapping from "../scoreMapping";
import AssignmentPloMapping from "../assignmentPloMapping";
import GradeSetting from "../gradeSetting";
import ScoreCalculated from "../scoreCalculatedforGrade";
import CLOManagement from "../cloManage";

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

  // 🟢 Stores the SECTION ID (e.g. 55)
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

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

  // --- Dropdown Options ---
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
        label: `${t("Year")} ${c.year} / ${t("Sem")} ${c.semester} - ${t(
          "Sec",
        )} ${c.section}`,
        value: String(c.id), // This is the SECTION ID
      }));
  }, [duplicateCourses, t]);

  // --- Fetch Matching Variants ---
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

  // --- Sync Selection to Form ---
  useEffect(() => {
    const selected = duplicateCourses.find(
      (c) => String(c.id) === selectedSectionId,
    );
    setFormData(selected || null);
  }, [selectedSectionId, duplicateCourses]);

  // --- Table Columns ---

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
    // Reset all tabs first (Optional, but safer to prevent overlap if logic changes)
    setShowCloTable(false);
    setShowStudentTable(false);
    setShowCloPloMappingTable(false);
    setShowAssignmentTable(false);
    setShowAssignmentCloMappingTable(false);
    setShowAssignmentPloMappingTable(false);
    setShowScoreMappingTable(false);
    setShowGradeSettingTable(false);
    setShowScoreCalculatedTable(false);

    // Set active tab
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

  // 🟢 3. Handler for Mode Switching
  const handleModeChange = (mode: "setup" | "grading") => {
    setViewMode(mode);
    if (mode === "setup") {
      handleTabChange("clo"); // Default tab for Setup
    } else {
      handleTabChange("score-mapping"); // Default tab for Grading
    }
  };

  // --- Handlers ---

  if (loading && !formData) return <LoadingOverlay />;
  if (error || !formData)
    return <div className="p-8 text-red-500">{error || "Error"}</div>;

  const handleDuplicateSection = async () => {
    if (!formData || !token) return;

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

  return (
    <div className="p-5 md:p-8 min-h-screen bg-gray-50/50">
      {loading && <LoadingOverlay />}
      <ToastElement />

      {/* Header Section */}
      <div className="mb-8 border-b pb-4 bg-white p-6 rounded-2xl shadow-sm border-gray-100">
        <h1 className="text-3xl font-light text-gray-800">
          {lang === "en" ? formData.name : formData.name_th}:{" "}
          <span className="text-orange-600">{courseCode}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-light">
          {t("Year")}: {formData.year} | {t("Sem")}: {formData.semester} |{" "}
          {t("Sec")}: {formData.section}
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col space-y-6">
          {/* Top Controls: Dropdown & Edit Buttons */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-end gap-3 w-full lg:w-auto">
              <div className="w-full sm:w-80">
                <DropdownSelect
                  label={t("Select Year / Semester / Section")}
                  value={selectedSectionId}
                  options={courseOptions}
                  onChange={(value) => {
                    setLoading(true);
                    setSelectedSectionId(String(value));
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDuplicateSection}
                  className="px-4 py-2.5 text-sm font-light text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all border border-blue-100 shadow-sm whitespace-nowrap"
                >
                  {t("Add Section")}
                </button>
                <button
                  onClick={() => setShowDeletePopup(true)}
                  className="p-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all border border-red-100 shadow-sm"
                  title={t("Delete Section")}
                >
                  {t("Delete")}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowEditPopup(true)}
              className="px-5 py-2.5 text-sm font-light text-orange-600 bg-orange-50 rounded-xl hover:bg-orange-100 transition-all border border-orange-100 shadow-sm whitespace-nowrap"
            >
              {t("Edit Metadata")}
            </button>
          </div>

          <hr className="border-gray-100" />

          {/* 🟢 4. NEW: Mode Selection Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2 sm:p-3 rounded-2xl border border-gray-100 shadow-sm">
            {/* Left: Segmented Control (Toggle) */}
            <div className="flex bg-gray-100/80 p-1.5 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => handleModeChange("setup")}
                className={`
        flex-1 sm:flex-none font-light px-6 py-2.5 rounded-lg text-sm
        flex items-center justify-center gap-2 transition-all duration-200 ease-in-out
        ${
          viewMode === "setup"
            ? "bg-white text-blue-600  shadow-sm ring-1 ring-black/5 scale-[1.02]"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
        }
      `}
              >
                <BookOpen
                  size={18}
                  className={viewMode === "setup" ? "text-blue-500" : ""}
                />
                {t("Course Setup")}
              </button>
              <button
                onClick={() => handleModeChange("grading")}
                className={`
        flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-light
        flex items-center justify-center gap-2 transition-all duration-200 ease-in-out
        ${
          viewMode === "grading"
            ? "bg-white  text-emerald-600 shadow-sm ring-1 ring-black/5 scale-[1.02]"
            : "text-gray-500  hover:text-gray-700 hover:bg-gray-200/50"
        }
      `}
              >
                <Calculator
                  size={18}
                  className={viewMode === "grading" ? "text-emerald-500" : ""}
                />
                {t("Grading & Scores")}
              </button>
            </div>

            {/* Right: Dropdown Selector */}
            {/* Changed w-[300px] to w-full sm:w-72 for better mobile responsiveness */}
            <div className="w-full sm:w-72 relative z-20">
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

          {/* 🟢 5. Tab Navigation (Filtered by Mode) */}
        </div>
      </div>

      {/* --- CONTENT SECTION --- */}
      {/* The content rendering remains effectively the same, just controlled by the boolean flags */}

      {/* Setup Tables */}
      {showCloTable && formData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <CLOManagement courseId={String(formData.course_id)} />
        </div>
      )}

      {showStudentTable && formData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <AddStudentCourse
            masterCourseId={formData ? String(formData.course_id) : ""}
            programId={formData.program_id}
            sectionId={formData ? String(formData.id) : ""}
          />
        </div>
      )}

      {showCloPloMappingTable && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <CloPloMapping
            masterCourseId={formData ? String(formData.course_id) : ""}
            programId={formData ? formData.program_id : ""}
          />
        </div>
      )}

      {showAssignmentTable && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <AssignmentMapping
            courseId={formData ? String(formData.course_id) : ""}
          />
        </div>
      )}

      {showAssignmentCloMappingTable && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <AssignmentCloMapping
            courseId={formData ? String(formData.course_id) : ""}
          />
        </div>
      )}

      {showAssignmentPloMappingTable && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <AssignmentPloMapping
            courseId={formData ? String(formData.course_id) : ""}
          />
        </div>
      )}

      {/* Grading Tables */}
      {showScoreMappingTable && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {/*  - Context: showing how score mapping looks inside the Grading mode */}
          <ScoreMapping
            masterCourseId={formData ? String(formData.course_id) : ""}
            sectionId={formData ? String(formData.id) : ""}
          />
        </div>
      )}

      {showGradeSettingTable && formData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <GradeSetting
            masterCourseId={formData ? String(formData.course_id) : ""}
          />
        </div>
      )}

      {showScoreCalculatedTable && formData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <ScoreCalculated
            masterCourseId={formData ? String(formData.course_id) : ""}
            sectionId={formData ? String(formData.id) : ""}
          />
        </div>
      )}

      {/* Popups */}
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
        message={`${t("Are you sure you want to delete the section")} ${
          formData?.section || ""
        } ${t("This action cannot be undone.")}`}
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
