"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/components/Toast";
import { useTranslation } from "react-i18next";
import { Course, getCoursePaginate } from "@/utils/courseApi";
import { addClo, CLO, CLOInputExcel } from "@/utils/cloApi";
import { Student } from "@/utils/studentApi";
// Assuming you have CLO utils similar to PLO
import { apiClient } from "@/utils/apiClient";
import { Column, Table } from "@/components/Table";
import LoadingOverlay from "@/components/LoadingOverlay";
import DropdownSelect from "@/components/DropdownSelect";
import FormEditPopup from "@/components/EditPopup";
import AddButton from "@/components/AddButton";
import CloPloMapping from "../cloploMapping";
import AssignmentMapping from "../assignmentMapping";
import AssignmentCloMapping from "../assignmentCloMapping";
import AddStudentCourse from "../addStudentCourse";
import AlertPopup from "@/components/AlertPopup";
import ScoreMapping from "../scoreMapping";
import AssignmentPloMapping from "../assignmentPloMapping";
import GradeSetting from "../gradeSetting";
import ScoreCalculated from "../scoreCalculatedforGrade";

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
  courseCode: string
): Promise<PaginatedResponse> {
  const limit = 100;
  const page = 1;
  try {
    const res = await getCoursePaginate(token, page, limit, {
      courseCode: courseCode,
    });
    return res as PaginatedResponse;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
}

export default function EditCourseClient({
  courseCode,
}: {
  courseCode: string;
}) {
  const { isLoggedIn, token, initialized } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // --- State ---
  const [formData, setFormData] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCourses, setDuplicateCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

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

  const [, setStudents] = useState<Student[]>([]);
  const [clos, setClos] = useState<CLO[]>([]); // Replace 'any' with your CLO type

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [, setCourseToDelete] = useState<Course | null>(null);

  // --- Dropdown Options (Year + Section) ---
  const courseOptions: Option[] = useMemo(() => {
    if (duplicateCourses.length === 0) return [];
    return [...duplicateCourses]
      .sort((b, a) => Number(b.section) - Number(a.section))
      .map((c) => ({
        label: `${t("Section")} ${c.section}`,
        value: String(c.id),
      }));
  }, [duplicateCourses]);

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
          const latest = matching.sort(
            (b, a) => Number(b.section) - Number(a.section)
          )[0];
          setSelectedCourseId(String(latest.id));
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
      (c) => String(c.id) === selectedCourseId
    );
    setFormData(selected || null);
  }, [selectedCourseId, duplicateCourses]);

  // --- Fetch CLOs/Students when Selection changes ---
  const fetchClosByCourse = async (courseId: string) => {
    try {
      const res = await apiClient.get("/clo", {
        headers: { Authorization: `Bearer ${token}` },
        params: { courseId },
      });
      setClos(res.data);
      setLoading(false);
    } catch {
      showToast(t("Failed to load CLO data."), "error");
    }
  };

  const fetchStudentsByCourse = async (courseId: string) => {
    try {
      const res = await apiClient.get("/studentOnCourse", {
        headers: { Authorization: `Bearer ${token}` },
        params: { courseId },
      });
      setStudents(res.data);
    } catch {
      showToast(t("Failed to load student data."), "error");
    }
  };

  const handleAddClo = async (data: Record<string, CLO>) => {
    if (!initialized) return;
    if (!isLoggedIn || !token) {
      showToast(t("You must be logged in to perform this action."), "error");
      return;
    }

    if (!data.code || !data.name || !data.name_th) {
      showToast(t("Please fill in all required fields."), "error");
      return;
    }

    if (!formData) {
      showToast(t("Course data is not loaded."), "error");
      return;
    }

    try {
      await addClo(
        {
          code: String(data.code),
          name: String(data.name),
          name_th: String(data.name_th),
          course_id: formData.id,
        },
        token
      );
      showToast(t("CLO added successfully."), "success");
      setLoading(true);
      fetchClosByCourse(String(formData.id));
    } catch (err) {
      if (err instanceof Error) {
        showToast(t("Failed to add CLO: ") + err.message, "error");
      } else {
        showToast(t("Failed to add CLO."), "error");
      }
    }
  };

  const handleAddCloExcel = async (rows: CLOInputExcel[]) => {
    if (!initialized) return;

    if (!isLoggedIn || !token) {
      showToast(t("You must be logged in to perform this action."), "error");
      return;
    }

    if (!formData) {
      showToast(t("Course data is not loaded."), "error");
      return;
    }

    let successCount = 0;
    let failureCount = 0;
    const errorDetails = [];

    for (const [i, row] of rows.entries()) {
      const missingFields = [];
      const code = String(row.code || row.CLO_code || "").trim();
      const name = String(row.nameEn || row.CLO_engname || "").trim();
      const name_th = String(row.nameTh || row.CLO_name || "").trim();

      if (!code) missingFields.push("code");
      if (!name) missingFields.push("nameTh");
      if (!name_th) missingFields.push("nameEn");
      if (missingFields.length > 0) {
        failureCount++;
        errorDetails.push(`Row ${i + 1}: missing ${missingFields.join(", ")}`);
        continue;
      }

      try {
        await addClo(
          {
            code,
            name,
            name_th,
            course_id: formData.id,
          },
          token
        );
        setLoading(true);
        successCount++;
      } catch {
        failureCount++;
        errorDetails.push(`Row ${i + 1}: missing ${missingFields.join(", ")}`);
      }
    }

    let summary = `เพิ่มข้อมูลจาก Excel สำเร็จ: ${successCount} รายการ\nล้มเหลว: ${failureCount} รายการ`;
    if (errorDetails.length > 0) {
      summary += `\n\nรายละเอียดข้อผิดพลาด:\n` + errorDetails.join("\n");
    }
    showToast(summary, failureCount > 0 ? "error" : "success");
    fetchClosByCourse(String(formData.id));
  };

  useEffect(() => {
    if (formData?.id) {
      setLoading(true);
      if (showCloTable)
        fetchClosByCourse(String(formData.id)).finally(() => setLoading(false));
      if (showStudentTable)
        fetchStudentsByCourse(String(formData.id)).finally(() =>
          setLoading(false)
        );
      if (showCloPloMappingTable) {
        // Fetch CLO-PLO mapping data here if needed
        setLoading(false);
      }

      if (showAssignmentTable) {
        // Fetch Assignment data here if needed
        setLoading(false);
      }

      if (showAssignmentCloMappingTable) {
        // Fetch Assignment-CLO mapping data here if needed
        setLoading(false);
      }

      if (showAssignmentPloMappingTable) {
        // Fetch Assignment-PLO mapping data here if needed
        setLoading(false);
      }

      if (showScoreMappingTable) {
        // Fetch Score mapping data here if needed
        setLoading(false);
      }

      if (showAssignmentPloMappingTable) {
        setLoading(false);
      }

      if (showGradeSettingTable) {
        // Fetch Grade Setting data here if needed
        setLoading(false);
      }

      if (showScoreCalculatedTable) {
        setLoading(false);
      }
    }
  }, [
    formData,
    showCloTable,
    showStudentTable,
    showCloPloMappingTable,
    showAssignmentTable,
    showAssignmentCloMappingTable,
    showAssignmentPloMappingTable,
    showScoreMappingTable,
    showAssignmentPloMappingTable,
    showGradeSettingTable,
    showScoreCalculatedTable,
    showToast,
  ]);

  // --- Table Columns ---
  const CLOColumn: Column<CLO>[] = [
    { header: t("CLO Code"), accessor: "code", className: "font-semibold" },
    { header: t("CLO Name"), accessor: lang === "th" ? "name_th" : "name" },
  ];

  const TABS = [
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
      id: "score-mapping",
      label: t("Score Mapping"),
      color: "text-gray-600",
      dot: "bg-gray-500",
      state: showScoreMappingTable,
    },
    {
      id: "grade-setting",
      label: t("Grade Setting"),
      color: "text-pink-600",
      dot: "bg-pink-500",
      state: showGradeSettingTable,
    },
    {
      id: "score-calculated",
      label: "Score Calculated",
      color: "text-green-600",
      dot: "bg-green-500",
      state: showScoreCalculatedTable,
    },
  ];

  const activeTabObj = TABS.find((t) => t.state) || TABS[0];

  const handleTabChange = (tabId: string) => {
    setShowCloTable(tabId === "clo");
    setShowStudentTable(tabId === "student");
    setShowCloPloMappingTable(tabId === "mapping");
    setShowAssignmentTable(tabId === "assignment");
    setShowAssignmentCloMappingTable(tabId === "assignment-clo-mapping");
    setShowAssignmentPloMappingTable(tabId === "assignment-plo-mapping");
    setShowScoreMappingTable(tabId === "score-mapping");
    setShowGradeSettingTable(tabId === "grade-setting");
    setShowScoreCalculatedTable(tabId === "score-calculated");
  };

  // --- Handlers ---

  if (loading && !formData) return <LoadingOverlay />;
  if (error || !formData)
    return <div className="p-8 text-red-500">{error || "Error"}</div>;

  // 1. Add this function inside your EditCourseClient component
  const handleDuplicateSection = async () => {
    if (!formData || !token) return;

    // Find the highest section number currently available
    const maxSection = Math.max(
      ...duplicateCourses.map((c) => Number(c.section)),
      0
    );
    const nextSection = String(maxSection + 1).padStart(3, "0"); // e.g., "002"

    setLoading(true);
    try {
      // We send the current formData but override the section and remove the ID
      const { ...payload } = formData;

      const res = await apiClient.post(
        "/course",
        {
          ...payload,
          section: nextSection,
          // You might want to clarify if you want to copy CLOs as well.
          // Usually, backends handle deep copying, but if not,
          // this creates a fresh section with the same metadata.
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      showToast(`${t("Created Section")} ${nextSection}`, "success");

      // Refresh the list of variants to include the new one
      const updatedResponse = await fetchMatchingCourses(token, courseCode);
      setDuplicateCourses(updatedResponse.data);
      setSelectedCourseId(String(res.data.id)); // Switch to the new section automatically
    } catch (err) {
      showToast(t("Failed to duplicate section"), "error");
      console.error(err);
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
          const latest = matching.sort(
            (b, a) => Number(b.section) - Number(a.section)
          )[0];
          setSelectedCourseId(String(latest.id));
        } else {
          setFormData(null);
          setError(t("No more course variants available."));
        }
      });
      setCourseToDelete(null);
      setShowDeletePopup(false);
      showToast(t("Course variant deleted successfully"), "success");
    } catch (err) {
      showToast(t("Failed to delete course variant"), "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 md:p-8 min-h-screen">
      {loading && <LoadingOverlay />}
      <ToastElement />

      {/* --- HEADER --- */}
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-semibold text-gray-800">
          {lang === "en" ? formData.name : formData.name_th}:{" "}
          <span className="text-orange-600">{courseCode}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t("Currently editing ID")}: {formData.id} | {t("Section")}:{" "}
          {formData.section}
        </p>
      </div>

      {/* --- MANAGE BOX --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col space-y-8">
          {/* --- TOP ROW: Title & Primary Actions --- */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 tracking-tight">
                {t("Manage Course Variants & Data")}
              </h2>
              <p className="text-sm text-gray-500">
                {t("Configure sections, CLOs, and student mappings")}
              </p>
            </div>

            <button
              onClick={() => setShowEditPopup(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-orange-600 bg-orange-50 rounded-xl hover:bg-orange-100 transition-all active:scale-95 border border-orange-100 shadow-sm whitespace-nowrap"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              {t("Edit Metadata")}
            </button>
          </div>

          {/* --- BOTTOM ROW: Selection & Navigation --- */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-8 border-t border-gray-100">
            {/* Left Side: Section Controls */}
            <div className="flex flex-col sm:flex-row items-end gap-3 w-full lg:w-auto">
              <div className="w-full sm:w-64">
                <DropdownSelect
                  label={t("Current Section")}
                  value={selectedCourseId}
                  options={courseOptions}
                  onChange={(e) => {
                    setLoading(true);
                    setSelectedCourseId(e.target.value);
                  }}
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDuplicateSection}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all active:scale-95 border border-blue-100 shadow-sm whitespace-nowrap"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {t("Add Section")}
                </button>

                <button
                  onClick={() => setShowDeletePopup(true)}
                  className="flex items-center justify-center p-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all active:scale-95 border border-red-100 shadow-sm"
                  title={t("Delete Section")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
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
                </button>
              </div>
            </div>

            {/* Right Side: Tab Navigation */}
            <div className="w-full lg:w-auto">
              {/* MOBILE TABS */}
              <div className="2xl:hidden">
                <div className="relative">
                  <button
                    className="
          w-full flex items-center justify-between
          px-4 py-3
          bg-white
          border border-gray-200
          rounded-xl
          shadow-sm
          hover:bg-gray-50
          transition
        "
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${activeTabObj.dot}`}
                      />
                      <span
                        className={`font-semibold text-sm ${activeTabObj.color}`}
                      >
                        {activeTabObj.label}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  <select
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={activeTabObj.id}
                    onChange={(e) => handleTabChange(e.target.value)}
                  >
                    {TABS.map((tab) => (
                      <option key={tab.id} value={tab.id}>
                        {tab.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>{" "}
              {/* DESKTOP TABS */}
              <div
                className="
                hidden
                2xl:flex flex-wrap items-center bg-gray-100 border border-gray-200 rounded-2xl p-1 gap-1 w-[500px]
                "
              >
                {TABS.map((tab) => {
                  const isActive = tab.state;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        relative
                        px-4 py-2
                        rounded-xl
                        text-sm
                        font-semibold
                        flex items-center gap-2
                        transition-all duration-200
                        whitespace-nowrap 
                        flex-shrink-0
                        ${
                          isActive
                            ? `bg-white ${tab.color} shadow-sm`
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                        }
                      `}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? tab.dot : "bg-gray-300"
                        }`}
                      />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- TABLES --- */}
      {showCloTable && formData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-end mb-4">
            {/* <h3 className="text-lg font-semibold">
              {t("Course Learning Outcomes")}
            </h3> */}
            <AddButton
              buttonText={t("create new clo")}
              placeholderText={{
                code: "clo code",
                nameEn: "clo name (en)",
                nameTh: "clo name (th)",
              }}
              showAbbreviationInputs={false}
              onSubmit={handleAddClo}
              onSubmitExcel={handleAddCloExcel}
              selectedProgram={formData.id}
            />
          </div>
          <Table columns={CLOColumn} data={clos} />
        </div>
      )}

      {showStudentTable && formData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            {/* <h3 className="text-lg font-semibold">{t("Student List")}</h3> */}
            {/* <AddButton
              buttonText={t("Add Student")}
              onSubmit={() => {}}
              selectedProgram={formData.id}
            /> */}
          </div>
          {/* <Table columns={StudentColumn} data={students} /> */}
          <AddStudentCourse
            courseId={formData.id}
            programId={formData.program_id}
          />
        </div>
      )}

      {showCloPloMappingTable && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {/* <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t("CLO-PLO Mapping")}</h3>
          </div> */}
          <CloPloMapping
            courseId={formData ? formData.id : ""}
            programId={formData ? formData.program_id : ""}
          />
        </div>
      )}

      {showAssignmentTable && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {/* <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t("Assignment Mapping")}</h3>
          </div> */}
          <AssignmentMapping courseId={formData ? formData.id : ""} />
        </div>
      )}

      {showAssignmentCloMappingTable && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {/* <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t("Assignment-CLO Mapping")}</h3>
          </div> */}
          <AssignmentCloMapping courseId={formData ? formData.id : ""} />
        </div>
      )}

      {showAssignmentPloMappingTable && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {/* <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t("Assignment-PLO Mapping")}</h3>
          </div> */}
          <AssignmentPloMapping courseId={formData ? formData.id : ""} />
        </div>
      )}

      {showScoreMappingTable && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {/* <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t("Score Mapping")}</h3>
          </div> */}
          <ScoreMapping courseId={formData ? formData.id : ""} />
        </div>
      )}

      {showGradeSettingTable && formData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <GradeSetting courseId={formData.id} />
        </div>
      )}

      {showScoreCalculatedTable && formData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <ScoreCalculated courseId={formData.id} />
        </div>
      )}

      {/* --- EDIT POPUP --- */}
      {showEditPopup && formData && (
        <FormEditPopup
          title={t("Edit Course")}
          data={formData}
          fields={[
            {
              label: t("Course Name (EN)"),
              key: "name",
              type: "text",
            },
            {
              label: t("Course Name (TH)"),
              key: "name_th",
              type: "text",
            },
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
