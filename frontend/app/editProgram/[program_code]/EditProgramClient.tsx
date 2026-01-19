// app/editProgram/[program_code]/EditProgramClient.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/components/Toast";
import { useTranslation } from "next-i18next";
import { getProgramsPaginated, Program } from "@/utils/programApi";
import { PLO, addPlo, PLOInputExcel } from "@/utils/ploApi";
import { addStudent, Student } from "@/utils/studentApi";
import { Column, Table } from "@/components/Table";
import LoadingOverlay from "@/components/LoadingOverlay";
import DropdownSelect from "@/components/DropdownSelect";
import { apiClient } from "@/utils/apiClient"; // import
import FormEditPopup from "@/components/EditPopup";
import axios from "axios";

import AddButton from "@/components/AddButton";

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

// --- API Fetch Function (Remains the same) ---
async function fetchMatchingPrograms(
  token: string,
  programCode: string
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
      error
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
  const { token, isLoggedIn, initialized } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // --- State ---
  const [formData, setFormData] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicatePrograms, setDuplicatePrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [showEditPopup, setShowEditPopup] = useState(false);

  const [showStudentTable, setShowStudentTable] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [plos, setPlos] = useState<PLO[]>([]);
  const [showPloTable, setShowPloTable] = useState(true);
  // --- Memoized Data ---

  // Options for the Dropdown Select (Program Year/ID)
  const programOptions: Option[] = useMemo(() => {
    if (duplicatePrograms.length === 0) return [];

    // Sort variants by year (most recent first)
    const sortedPrograms = [...duplicatePrograms].sort(
      (a, b) => b.program_year - a.program_year
    );

    return sortedPrograms.map((p) => ({
      // Show Year and short name for context
      // label: `${p.program_year} (${p.program_shortname_en})`,
      label: `${p.program_year}`,
      value: String(p.id),
    }));
  }, [duplicatePrograms]);

  // --- Data Fetching Effect ---
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
          // Set the initial selection ID to the ID of the newest variant (by year)
          const latestProgram = matchingPrograms.sort(
            (a, b) => b.program_year - a.program_year
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
      .finally(() => {});
  }, [isLoggedIn, token, programCode, t, showToast]);

  // --- Data Synchronization Effect ---
  // Update formData when the user selects a new ID from the dropdown or initial load
  useEffect(() => {
    if (!selectedProgramId) {
      setFormData(null);
      return;
    }

    const selected = duplicatePrograms.find(
      (p) => String(p.id) === selectedProgramId
    );
    setFormData(selected || null);
  }, [selectedProgramId, duplicatePrograms]);

  const fetchPLobyProgram = async (programId: string) => {
    try {
      const res = await apiClient.get("/plo", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          programId,
        },
      });
      setPlos(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching PLOs:", error);
      showToast(t("Failed to load PLO data."), "error");
    }
  };

  const fetchStudentsbyProgram = async (programId: string) => {
    try {
      const res = await apiClient.get("/student", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          programId,
        },
      });
      setStudents(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching students:", error);
      showToast(t("Failed to load student data."), "error");
    }
  };

  useEffect(() => {
    if (formData) {
      setLoading(true);
      fetchPLobyProgram(formData.id);
    }
  }, [formData]);

  const PLOColumn: Column<PLO>[] = [
    {
      header: t("PLO Code"),
      accessor: "code",
      className: "font-semibold",
    },
    {
      header: t("PLO Name"),
      accessor: lang === "th" ? "name" : "engname",
    },
    {
      header: "actions",
      accessor: "id",
      actions: [
        {
          label: t("View Details"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row: PLO) => {
            showToast(t("Viewing details for PLO ID ") + row.id, "success");
          },
        },
      ],
    },
  ];

  const StudentColumn: Column<Student>[] = [
    {
      header: t("Student ID"),
      accessor: "student_code",
      className: "font-semibold",
    },
    {
      header: t("First Name"),
      accessor: "first_name",
    },
    {
      header: t("Last Name"),
      accessor: "last_name",
    },
    {
      header: "actions",
      accessor: "id",
      actions: [
        {
          label: t("View Details"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row: Student) => {
            showToast(t("Viewing details for Student ID ") + row.id, "success");
          },
        },
      ],
    },
  ];

  const handleAddPloExcel = async (rows: PLOInputExcel[]) => {
    if (!initialized) {
      showToast("Auth context not initialized.", "error");
      return;
    }
    if (!isLoggedIn || !token) {
      showToast(
        "You are logged out or token expired. Please log in again.",
        "error"
      );
      return;
    }

    if (!formData) {
      showToast("Program data is not loaded.", "error");
      return;
    }
    // if (!selectedProgram) {
    //   showToast("Please select the program from the filters above", "error");
    //   return;
    // }
    let successCount = 0;
    let failCount = 0;
    const errorDetails = [];
    // Process each row from Excel
    for (const [i, row] of rows.entries()) {
      const missingFields = [];
      // Accept both camelCase, snake_case, and Excel header keys for import
      const code = row.code || row.Code || row.PLO_code;
      const nameTh = row.nameTh || row.name || row["ชื่อไทย"] || row.PLO_name;
      const nameEn =
        row.nameEn || row.engname || row["ชื่ออังกฤษ"] || row.PLO_engname;
      if (!code) missingFields.push("code");
      if (!nameTh) missingFields.push("nameTh");
      if (!nameEn) missingFields.push("nameEn");
      if (missingFields.length > 0) {
        failCount++;
        errorDetails.push(`Row ${i + 1}: missing ${missingFields.join(", ")}`);
        continue;
      }
      const payload = {
        code: String(code),
        name: String(nameTh),
        engname: String(nameEn),
        program_id: formData.id,
      };

      try {
        await addPlo(payload, token);
        setLoading(true);
        successCount++;
      } catch (err: unknown) {
        failCount++;
        let backendMsg = "Unknown error";

        // 1. Check if it's a standard Axios Error
        if (axios.isAxiosError(err)) {
          // Access message or response safely
          backendMsg = err.response?.data?.message || err.message;

          // Handle the .text() or raw response if needed
          if (err.response?.data instanceof Blob) {
            // If your API returns a blob/stream
            backendMsg += ` | Status: ${err.response.status}`;
          } else if (typeof err.response?.data === "string") {
            backendMsg += ` | Details: ${err.response.data}`;
          } else if (typeof err.response?.data === "object") {
            backendMsg += ` | Details: ${JSON.stringify(err.response.data)}`;
          }
        }
        // 2. Check if it's a standard JS Error
        else if (err instanceof Error) {
          backendMsg = err.message;
        }

        errorDetails.push(`Row ${i + 1}: backend error - ${backendMsg}`);
        showToast(`Error adding PLO from row ${i + 1}: ${backendMsg}`, "error");
      }
    }
    let summary = `เพิ่มข้อมูลจาก Excel สำเร็จ: ${successCount} รายการ\nล้มเหลว: ${failCount} รายการ`;
    if (errorDetails.length > 0) {
      summary += `\n\nรายละเอียดข้อผิดพลาด:\n` + errorDetails.join("\n");
    }
    showToast(summary, failCount > 0 ? "error" : "success");
    // รีเฟรชรายการ PLO หลังเพิ่ม
    try {
      fetchPLobyProgram(formData.id);
    } catch {
      showToast("Failed to refresh PLO list after Excel upload.", "error");
    }
  };

  // ฟังก์ชันสำหรับเพิ่ม PLO
  const handleAddPlo = async (data: Record<string, unknown>) => {
    if (!initialized) return; // wait for auth context to load
    if (!isLoggedIn || !token) {
      showToast(
        "You are logged out or token expired. Please log in again.",
        "error"
      );
      return;
    }

    if (!data.code || !data.nameTh || !data.nameEn) {
      showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
      return;
    }

    if (!formData) {
      showToast("Program data is not loaded.", "error");
      return;
    }

    try {
      await addPlo(
        {
          code: String(data.code),
          name: String(data.nameTh), // Thai name
          engname: String(data.nameEn), // English name
          program_id: formData.id, // Use the modal-selected program
        },
        token
      );
      fetchPLobyProgram(formData.id); // รีเฟรชรายการ PLO หลังเพิ่ม
      setLoading(true);
      showToast(t("PLO added successfully!"), "success");
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast("Error: " + err.message, "error");
      } else {
        showToast("Unexpected error occurred while adding PLO.", "error");
      }
    }
  };

  const handleAddStudent = async (data: Record<string, unknown>) => {
    if (!initialized) return;
    if (!isLoggedIn || !token)
      return showToast("Please log in again.", "error");
    if (!formData) return;

    // Map form fields to backend payload
    const payload = {
      student_code: String(data.code), // code → student_id
      first_name: String(data.nameEn), // nameEn → first_name
      last_name: String(data.nameTh), // nameTh → last_name
      program_id: formData.id, // Use current program ID
    };

    try {
      await addStudent(payload, token);
      fetchStudentsbyProgram(formData.id);
      setLoading(true);
      showToast("Student added successfully!", "success");
    } catch (err) {
      if (err instanceof Error) {
        showToast("Failed to add student: " + err.message, "error");
      } else if (typeof err === "string") {
        showToast("Failed to add student: " + err, "error");
      } else {
        showToast("Failed to add student: An unknown error occurred", "error");
      }
    }
  };

  // 🧩 Add from Excel
  const handleAddStudentExcel = async (rows: Student[]) => {
    if (!initialized) return alert("Auth not initialized.");
    if (!isLoggedIn || !token) return alert("Please log in again.");
    if (!formData) return;

    // 💡 1. เริ่มแสดง Loading ตั้งแต่ก่อนเข้า Loop
    setLoading(true);

    let successCount = 0;
    let failCount = 0;
    const errorDetails: string[] = [];

    const rowsWithProgram = rows.map((row) => ({
      ...row,
      program_id: formData.id,
    }));

    for (const [i, row] of rowsWithProgram.entries()) {
      const { student_id, first_name, last_name, program_id } = row;

      if (!student_id || !first_name || !last_name || !program_id) {
        failCount++;
        errorDetails.push(`Row ${i + 1}: missing required fields`);
        continue;
      }

      const payload = {
        student_code: String(student_id),
        first_name: String(first_name),
        last_name: String(last_name),
        program_id,
      };

      try {
        await addStudent(payload, token);
        successCount++;
        // 💡 2. เอา fetchStudentsbyProgram ออกจากที่นี่ เพื่อกันการดึงข้อมูลซ้ำซ้อน
      } catch (err: unknown) {
        failCount++;
        if (err instanceof Error) {
          errorDetails.push(`Row ${i + 1}: ${err.message}`);
        } else {
          errorDetails.push(`Row ${i + 1}: An unknown error occurred`);
        }
      }
    }

    // 💡 3. เรียกข้อมูลใหม่เพียงครั้งเดียวหลังจาก Loop เสร็จสิ้น
    if (successCount > 0) {
      await fetchStudentsbyProgram(formData.id);
    }

    // 💡 4. ปิด Loading เมื่อทำงานเสร็จทั้งหมด
    setLoading(false);

    showToast(
      `Excel upload completed: ${successCount} succeeded, ${failCount} failed.`,
      failCount > 0 ? "error" : "success"
    );

    if (failCount > 0) {
      showToast(
        `Some rows failed to add:\n${errorDetails.join("\n")}`,
        "error"
      );
    }
  };

  // ฟังก์ชันสำหรับ Duplicate Program ไปยังปีถัดไป
  const handleDuplicateProgram = async () => {
    if (!formData || !token) return;

    const currentYear = Number(formData.program_year);
    const nextYear = currentYear + 1;

    // ตรวจสอบเบื้องต้นว่ามีปีถัดไปอยู่แล้วหรือไม่
    const isDuplicate = duplicatePrograms.some(
      (p) => p.program_year === nextYear
    );
    if (isDuplicate) {
      showToast(
        `${t("Program for year")} ${nextYear} ${t("already exists.")}`,
        "error"
      );
      return;
    }

    // เตรียมข้อมูลชุดเดิมแต่เปลี่ยนปี
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
      // ใช้ endpoint เดียวกับตอนสร้าง program ใหม่ แต่ส่งข้อมูลชุดเดิม
      await apiClient.post("/program", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast(
        `${t("Program duplicated to year")} ${nextYear} ${t("successfully!")}`,
        "success"
      );

      // รีเฟรชข้อมูลรายการปีทั้งหมดเพื่อให้ Dropdown อัปเดต
      const response = await fetchMatchingPrograms(token, programCode);
      const updatedPrograms = response.data || [];
      setDuplicatePrograms(updatedPrograms);

      // เลือกปีใหม่ที่เพิ่งสร้างให้อัตโนมัติ
      const newVariant = updatedPrograms.find(
        (p) => p.program_year === nextYear
      );
      if (newVariant) setSelectedProgramId(String(newVariant.id));
    } catch (err: unknown) {
      console.error(err);
      showToast(t("Failed to duplicate program."), "error");
    } finally {
      setLoading(false);
    }
  };

  // --- Render Logic ---

  if (loading) {
    return <LoadingOverlay />;
  }

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
      {loading && <LoadingOverlay />}
      <ToastElement />

      {/* --- HEADER AND GLOBAL ACTIONS --- */}
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-semibold text-gray-800">
          {lang === "en"
            ? formData.program_shortname_en
            : formData.program_shortname_th}
          : <span className="text-orange-600">{programCode}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t("Currently editing ID")}: {formData.id}
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col space-y-6">
          {/* Upper Row: Title and Main Utility */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {t("Manage Program Variants & Data")}
            </h2>

            <div className="flex items-center gap-2">
              {/* ปุ่มสร้างปีถัดไป (New Action) */}
              <button
                onClick={handleDuplicateProgram}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all active:scale-95 border border-blue-100 shadow-sm"
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

              {/* ปุ่ม Edit เดิม */}
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

          {/* Lower Row: Selectors and Tabs */}
          <div className="grid grid-cols-1 md:flex md:items-center md:justify-between gap-6 pt-4 border-t border-gray-50">
            {/* 1. Year Selector with refined width */}
            <div className="w-full md:w-64">
              <DropdownSelect
                label={t("Select Program Year")}
                value={selectedProgramId}
                options={programOptions}
                onChange={(e) => {
                  setLoading(true);
                  setSelectedProgramId(e.target.value);
                  fetchPLobyProgram(e.target.value);
                  setShowPloTable(true);
                  setShowStudentTable(false);
                }}
                disabled={duplicatePrograms.length === 0}
              />
            </div>

            {/* 2. Tab Switcher - Styled as a Segmented Control */}
            <div className="flex items-center gap-4 mt-6">
              {/* <span className="hidden lg:block text-xs font-bold uppercase tracking-wider text-gray-400">
                {t("View Mode")}:
              </span> */}
              <div className="inline-flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                <button
                  onClick={() => {
                    setLoading(true);
                    setShowStudentTable(false);
                    setShowPloTable(true);
                    fetchPLobyProgram(formData ? formData.id : "");
                  }}
                  className={`px-8 py-2.5 rounded-lg transition-all duration-200 text-sm font-bold flex items-center cursor-pointer gap-2 ${
                    showPloTable
                      ? "bg-white text-orange-600 shadow-md transform scale-100"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      showPloTable ? "bg-orange-500" : "bg-transparent"
                    }`}
                  />
                  {t("PLO")}
                </button>
                <button
                  onClick={() => {
                    setLoading(true);
                    setShowPloTable(false);
                    setShowStudentTable(true);
                    fetchStudentsbyProgram(formData ? formData.id : "");
                  }}
                  className={`px-8 py-2.5 rounded-lg transition-all duration-200 text-sm font-bold flex items-center cursor-pointer gap-2 ${
                    showStudentTable
                      ? "bg-white text-amber-600 shadow-md transform scale-100"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
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

      {/* --- EDIT FORM --- */}
      {showEditPopup && formData && (
        <FormEditPopup
          title="Edit Program"
          data={formData}
          fields={[
            // { label: t("Program Code"), key: "program_code", type: "text" },
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
            // { label: t("Program Year"), key: "program_year", type: "number" },
          ]}
          onSave={() => {}}
          onChange={(updated) => setFormData(updated)}
          onClose={() => {
            setShowEditPopup(false);
          }}
        />
      )}
      {showStudentTable && formData && (
        <div className="space-y-6">
          {/* --- Action Section --- */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {t("Student List")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t(
                    "Manage and define the students for this program version."
                  )}
                </p>
              </div>

              {/* The AddButton Component */}
              <AddButton
                buttonText={t("create new student")}
                placeholderText={{
                  code: t("student code"),
                  nameEn: t("student name (en)"),
                  nameTh: t("student name (th)"),
                }}
                showAbbreviationInputs={false}
                submitButtonText={{
                  insert: t("insert student"),
                  upload: t("upload student (excel)"),
                }}
                onSubmit={handleAddStudent}
                onSubmitExcel={handleAddStudentExcel}
                selectedProgram={formData.id}
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
              {students.length > 0 ? (
                <Table columns={StudentColumn} data={students} />
              ) : (
                <div className="py-12 text-center bg-gray-50">
                  <p className="text-gray-400 italic">
                    {t("No PLO data available for this selection.")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showPloTable && formData && (
        <div className="space-y-6">
          {/* --- Action Section --- */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {t("Program Learning Outcomes")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t(
                    "Manage and define the learning outcomes for this program version."
                  )}
                </p>
              </div>

              {/* The AddButton Component */}
              <AddButton
                buttonText={t("create new plo")}
                placeholderText={{
                  code: t("plo code"),
                  nameEn: t("plo name (en)"),
                  nameTh: t("plo name (th)"),
                }}
                showAbbreviationInputs={false}
                submitButtonText={{
                  insert: t("insert plo"),
                  upload: t("upload plo (excel)"),
                }}
                onSubmit={handleAddPlo}
                onSubmitExcel={handleAddPloExcel}
                selectedProgram={formData.id}
              />
            </div>

            {/* --- Table Section --- */}
            <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
              {plos.length > 0 ? (
                <Table columns={PLOColumn} data={plos} />
              ) : (
                <div className="py-12 text-center bg-gray-50">
                  <p className="text-gray-400 italic">
                    {t("No PLO data available for this selection.")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
