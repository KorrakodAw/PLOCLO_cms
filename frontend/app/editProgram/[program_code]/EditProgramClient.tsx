// app/editProgram/[program_code]/EditProgramClient.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/components/Toast";
import { useTranslation } from "next-i18next";
import { getProgramsPaginated, Program } from "@/utils/programApi";
import { apiClient } from "@/utils/apiClient";

import LoadingOverlay from "@/components/LoadingOverlay";
import DropdownSelect from "@/components/DropdownSelect";
import FormEditPopup from "@/components/EditPopup";
import BreadCrumb from "@/components/BreadCrumb";

// Import Child Components
import AddPlo from "../AddPlo";
import AddStudent from "../AddStudent";

// --- Types ---
interface PaginatedResponse {
  data: Program[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Option {
  label: string;
  value: string;
}

// --- API Fetch Function ---
async function fetchMatchingPrograms(
  token: string,
  programCode: string,
): Promise<PaginatedResponse> {
  const limit = 100;
  const page = 1;

  try {
    const response = await getProgramsPaginated(token, page, limit, {
      programId: programCode,
    });
    return response as PaginatedResponse;
  } catch (error) {
    console.error(
      `Error fetching matching programs for ${programCode}:`,
      error,
    );
    throw error;
  }
}

// --- Component ---
export default function EditProgramClient({
  programCode,
}: {
  programCode: string;
}) {
  const { token, isLoggedIn } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // --- State ---
  const [formData, setFormData] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stores all years/variants of this program
  const [duplicatePrograms, setDuplicatePrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | number>(
    "",
  );

  const [showEditPopup, setShowEditPopup] = useState(false);

  // Tab State: 'plo' or 'student'
  const [activeTab, setActiveTab] = useState<"plo" | "student">("plo");

  // --- Memoized Dropdown Options ---
  const programOptions: Option[] = useMemo(() => {
    if (duplicatePrograms.length === 0) return [];

    // Sort variants by year (most recent first)
    const sortedPrograms = [...duplicatePrograms].sort(
      (a, b) => b.program_year - a.program_year,
    );

    return sortedPrograms.map((p) => ({
      label: `${p.program_year}`,
      value: String(p.id),
    }));
  }, [duplicatePrograms]);

  // Options for the View Mode Dropdown
  const viewModeOptions: Option[] = [
    { label: t("PLO"), value: "plo" },
    { label: t("student"), value: "student" },
  ];

  // --- 1. Initial Data Fetch ---
  useEffect(() => {
    if (!isLoggedIn || !token || !programCode) {
      setLoading(false);
      return;
    }
    setError(null);
    setDuplicatePrograms([]);

    fetchMatchingPrograms(token, programCode)
      .then((response) => {
        const matchingPrograms = response.data || [];
        setDuplicatePrograms(matchingPrograms);

        if (matchingPrograms.length > 0) {
          // Default to the newest year
          const latestProgram = matchingPrograms.sort(
            (a, b) => b.program_year - a.program_year,
          )[0];
          setSelectedProgramId(String(latestProgram.id));
        } else {
          setError(t("Program data not found or inaccessible."));
        }
      })
      .catch((err) => {
        console.error(err);
        setError(t("Failed to load program data for editing."));
        showToast(t("Failed to load data."), "error");
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, token, programCode, t, showToast]);

  // --- 2. Sync Selected Program to Form Data ---
  useEffect(() => {
    if (!selectedProgramId) {
      setFormData(null);
      return;
    }
    const selected = duplicatePrograms.find(
      (p) => String(p.id) === selectedProgramId,
    );
    setFormData(selected || null);
  }, [selectedProgramId, duplicatePrograms]);

  // --- Handlers ---

  const handleDuplicateProgram = async () => {
    if (!formData || !token) return;

    const currentYear = Number(formData.program_year);
    const nextYear = currentYear + 1;

    // Check if next year already exists
    const isDuplicate = duplicatePrograms.some(
      (p) => p.program_year === nextYear,
    );
    if (isDuplicate) {
      showToast(
        `${t("Program for year")} ${nextYear} ${t("already exists.")}`,
        "error",
      );
      return;
    }

    // Prepare payload (same data, new year)
    const payload = {
      program_code: formData.program_code,
      program_name_en: formData.program_name_en,
      program_name_th: formData.program_name_th,
      program_shortname_en: formData.program_shortname_en,
      program_shortname_th: formData.program_shortname_th,
      program_year: nextYear,
      faculty_id: formData.faculty_id,
    };

    try {
      setLoading(true);
      await apiClient.post("/program", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast(
        `${t("Program duplicated to year")} ${nextYear} ${t("successfully!")}`,
        "success",
      );

      // Refresh list
      const response = await fetchMatchingPrograms(token, programCode);
      const updatedPrograms = response.data || [];
      setDuplicatePrograms(updatedPrograms);

      // Select new year
      const newVariant = updatedPrograms.find(
        (p) => p.program_year === nextYear,
      );
      if (newVariant) setSelectedProgramId(String(newVariant.id));
    } catch (err: unknown) {
      console.error(err);
      showToast(t("Failed to duplicate program."), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProgram = async () => {
    if (!formData || !token) return;
    try {
      await apiClient.patch(`/program/${formData.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Program updated successfully", "success");
      setShowEditPopup(false);

      // Refresh local data
      const response = await fetchMatchingPrograms(token, programCode);
      setDuplicatePrograms(response.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to update program", "error");
    }
  };

  // --- Render ---

  if (loading) return <LoadingOverlay />;

  if (error || !formData) {
    return (
      <div className="mt-8 p-6 bg-red-50 border border-red-300 text-red-700 rounded-lg max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-2">{t("Error")}</h2>
        <p>{error || t("Could not load program data.")}</p>
        <ToastElement />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 min-h-screen">
      <BreadCrumb
        items={[
          { label: t("manage programs"), href: "/editProgram" },
          {
            label:
              lang === "en"
                ? formData.program_shortname_en
                : formData.program_shortname_th,
            href: `/editProgram/${programCode}`,
          },
        ]}
      />
      {loading && <LoadingOverlay />}
      <ToastElement />

      {/* HEADER */}
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-light text-gray-800">
          {lang === "en"
            ? formData.program_shortname_en
            : formData.program_shortname_th}
          : <span className="text-orange-600">{programCode}</span>
        </h1>
        {/* <p className="text-sm text-gray-500 mt-1">
          {t("Currently editing ID")}: {formData.id}
        </p> */}
      </div>

      {/* CONTROL PANEL */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col space-y-6">
          {/* Upper Row: Actions */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-light text-gray-800">
              {t("Manage Program Variants & Data")}
            </h2>

            <div className="flex items-center gap-2">
              {/* Duplicate Button */}
              <button
                onClick={handleDuplicateProgram}
                className="flex items-center gap-2 px-4 py-2 text-sm font-light text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all active:scale-95 border border-blue-100 shadow-sm"
                title={`${t("Create variant for year")} ${
                  Number(formData?.program_year || 0) + 1
                }`}
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
                {t("Add Program Variant")} (
                {Number(formData?.program_year || 0) + 1})
              </button>

              {/* Edit Button */}
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
          </div>

          {/* Lower Row: Selectors (Both Dropdowns) */}
          {/* Filter Toolbar */}
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Year Dropdown */}
            <div className="w-full sm:w-64">
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                {t("Program Year")}
              </label>
              <DropdownSelect
                // Remove the internal label prop if you use the external label above for better styling
                value={selectedProgramId}
                options={programOptions}
                onChange={(value) => setSelectedProgramId(value)}
                disabled={duplicatePrograms.length === 0}
              />
            </div>

            {/* View Mode Dropdown */}
            <div className="w-full sm:w-50">
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                {t("View Mode")}
              </label>
              <DropdownSelect
                value={activeTab}
                options={viewModeOptions}
                onChange={(value) => setActiveTab(value as "plo" | "student")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- EDIT POPUP --- */}
      {showEditPopup && formData && (
        <FormEditPopup
          title="Edit Program"
          data={formData}
          fields={[
            {
              label: t("Program Name (EN)"),
              key: "program_name_en",
              type: "text",
            },
            {
              label: t("Program Name (TH)"),
              key: "program_name_th",
              type: "text",
            },
            {
              label: t("Program Short Name (EN)"),
              key: "program_shortname_en",
              type: "text",
            },
            {
              label: t("Program Short Name (TH)"),
              key: "program_shortname_th",
              type: "text",
            },
          ]}
          onSave={handleSaveProgram}
          onChange={(updated) => setFormData(updated)}
          onClose={() => setShowEditPopup(false)}
        />
      )}

      {/* --- CONTENT --- */}
      {activeTab === "student" && <AddStudent programId={formData.id} />}
      {activeTab === "plo" && <AddPlo programId={formData.id} />}
    </div>
  );
}
