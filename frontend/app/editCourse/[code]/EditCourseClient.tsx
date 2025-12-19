"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/components/Toast";
import { useTranslation } from "react-i18next";
import { Course, getCoursePaginate } from "@/utils/courseApi";
import { CLO } from "@/utils/cloApi";
import { Student } from "@/utils/studentApi";
// Assuming you have CLO utils similar to PLO
import { apiClient } from "@/utils/apiClient";
import { Column, Table } from "@/components/Table";
import LoadingOverlay from "@/components/LoadingOverlay";
import DropdownSelect from "@/components/DropdownSelect";
import FormEditPopup from "@/components/EditPopup";
import AddButton from "@/components/AddButton";

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
  const { isLoggedIn, token } = useAuth();
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
  const [showCloTable, setShowCloTable] = useState(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [clos, setClos] = useState<CLO[]>([]); // Replace 'any' with your CLO type

  // --- Dropdown Options (Year + Section) ---
  const courseOptions: Option[] = useMemo(() => {
    if (duplicateCourses.length === 0) return [];
    return [...duplicateCourses]
      .sort((b, a) => Number(b.section) - Number(a.section))
      .map((c) => ({
        label: `Section ${c.section}`,
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
    } catch {
      showToast(t("Failed to load CLO data."), "error");
    }
  };

  const fetchStudentsByCourse = async (courseId: string) => {
    try {
      const res = await apiClient.get("/student", {
        headers: { Authorization: `Bearer ${token}` },
        params: { courseId },
      });
      setStudents(res.data);
    } catch {
      showToast(t("Failed to load student data."), "error");
    }
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
    }
  }, [formData, showCloTable, showStudentTable]);

  // --- Table Columns ---
  const CLOColumn: Column<CLO>[] = [
    { header: t("CLO Code"), accessor: "code", className: "font-semibold" },
    { header: t("CLO Name"), accessor: lang === "th" ? "name_th" : "name" },
  ];

  const StudentColumn: Column<Student>[] = [
    {
      header: t("Student ID"),
      accessor: "student_id",
      className: "font-semibold",
    },
    { header: t("First Name"), accessor: "first_name" },
    { header: t("Last Name"), accessor: "last_name" },
  ];

  // --- Handlers ---

  if (loading && !formData) return <LoadingOverlay />;
  if (error || !formData)
    return <div className="p-8 text-red-500">{error || "Error"}</div>;

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
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {t("Manage Course Variants & Data")}
            </h2>
            <button
              onClick={() => setShowEditPopup(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all active:scale-95"
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
              {t("edit")}
            </button>
          </div>

          <div className="grid grid-cols-1 md:flex md:items-center md:justify-between gap-6 pt-4 border-t border-gray-50">
            <div className="w-full md:w-64">
              <DropdownSelect
                label={t("Select Section")}
                value={selectedCourseId}
                options={courseOptions}
                onChange={(e) => {
                  setLoading(true);
                  setSelectedCourseId(e.target.value);
                }}
              />
            </div>

            <div className="flex items-center gap-4 mt-6">
              <div className="inline-flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                <button
                  onClick={() => {
                    setShowStudentTable(false);
                    setShowCloTable(true);
                  }}
                  className={`px-8 py-2.5 rounded-lg transition-all duration-200 text-sm font-bold flex items-center cursor-pointer gap-2 ${
                    showCloTable
                      ? "bg-white text-orange-600 shadow-md"
                      : "text-gray-500"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      showCloTable ? "bg-orange-500" : "bg-transparent"
                    }`}
                  />
                  {t("CLO")}
                </button>
                <button
                  onClick={() => {
                    setShowCloTable(false);
                    setShowStudentTable(true);
                  }}
                  className={`px-8 py-2.5 rounded-lg transition-all duration-200 text-sm font-bold flex items-center cursor-pointer gap-2 ${
                    showStudentTable
                      ? "bg-white text-amber-600 shadow-md"
                      : "text-gray-500"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      showStudentTable ? "bg-amber-500" : "bg-transparent"
                    }`}
                  />
                  {t("student")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- TABLES --- */}
      {showCloTable && formData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {t("Course Learning Outcomes")}
            </h3>
            <AddButton
              buttonText={t("create new clo")}
              onSubmit={() => {}}
              selectedProgram={formData.id}
            />
          </div>
          <Table columns={CLOColumn} data={clos} />
        </div>
      )}

      {showStudentTable && formData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t("Student List")}</h3>
            <AddButton
              buttonText={t("add student")}
              onSubmit={() => {}}
              selectedProgram={formData.id}
            />
          </div>
          <Table columns={StudentColumn} data={students} />
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
    </div>
  );
}
