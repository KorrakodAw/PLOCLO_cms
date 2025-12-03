/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  addProgram,
  bulkUploadPrograms,
  getProgramsPaginated,
} from "../../utils/programApi";
import { Column, Table } from "../../components/Table";
import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";
import { getFaculties } from "../../utils/facultyApi";
import { getUniversities } from "../../utils/universityApi";
import PaginationControlButton from "../../components/PaignateControlButton";
import { useToast } from "../../components/Toast";
import LoadingOverlay from "../../components/LoadingOverlay";
import axios from "axios";

interface ProgramManagementProps {
  universityId?: string;
  facultyId?: string;
  programId?: string; // Now this will be program_code instead of id
  year?: string;
}

interface Program {
  id: number;
  program_code: number;
  program_name_en: string;
  program_name_th: string;
  program_shortname_en: string;
  program_shortname_th: string;
  program_year: number;
}

export default function ProgramManagement({
  universityId,
  facultyId,
  programId,
  year,
}: ProgramManagementProps) {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn } = useAuth();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [universityOptions, setUniversityOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [facultyOptions, setFacultyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [yearOptions, setYearOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10; // You can make this configurable if needed

  const { showToast, ToastElement } = useToast();
  // Fetch universities
  useEffect(() => {
    if (!isLoggedIn || !token) return;

    const fetchUniversities = async () => {
      try {
        const data = await getUniversities(token);

        // Check if no universities were returned
        if (data.length === 0) {
          setUniversityOptions([
            // Display "No data available" if the list is empty
            { label: t("No data available"), value: "" },
          ]);
          return;
        }

        // If data exists, map it and prepend the default option
        setUniversityOptions([
          { label: t("please select a university"), value: "" },
          ...data.map((u: any) => ({ label: u.name, value: String(u.id) })),
        ]);
      } catch {
        showToast("API university error", "error");
      }
    };
    fetchUniversities();
  }, [isLoggedIn, token, t, showToast]);

  // // Fetch faculties for selected university (use parent universityId)
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedUniversity) {
      setSelectedFaculty("");
      setFacultyOptions([{ label: t("please select a faculty"), value: "" }]);
      return;
    }

    const fetchFaculties = async () => {
      try {
        const data = await getFaculties(token, selectedUniversity);

        const filteredFaculties = data.filter(
          (f: any) => String(f.university_id) === selectedUniversity
        );

        if (filteredFaculties.length === 0) {
          setFacultyOptions([{ label: t("No data available"), value: "" }]);
          return;
        }

        setFacultyOptions([
          { label: t("please select a faculty"), value: "" },
          ...filteredFaculties.map((f: any) => ({
            label: f.name,
            value: String(f.id),
          })),
        ]);
      } catch {
        showToast("API faculty error", "error");
      }
    };
    fetchFaculties();
  }, [isLoggedIn, token, t, selectedUniversity, showToast]);

  useEffect(() => {
    const currentYear = new Date().getFullYear() + 543; // Thai year
    const years: { label: string; value: string }[] = [];

    years.push({ label: t("please select a year"), value: "" });

    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push({ label: String(y), value: String(y) });
    }

    setYearOptions(years);
  }, [t]);

  const fetchPrograms = async () => {
    if (!isLoggedIn || !token) return;
    try {
      const data = await getProgramsPaginated(token, page, limit, {
        universityId,
        facultyId,
        programId,
        year,
      });
      setPrograms(data.data || data); // Handle both response types
      const total = data.total || (Array.isArray(data) ? data.length : 1);
      setTotalPages(Math.ceil(total / limit));
    } catch (err: any) {
      showToast(err.message || "Failed to fetch programs", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add single program
  const handleAddProgram = async (data: Record<string, unknown>) => {
    // Prefer faculty from the submitted payload (modal), then parent's
    // selectedFaculty state, then the facultyId prop.
    const facultyToUse =
      (data && (data as any).faculty_id) || selectedFaculty || facultyId;
    const universityToUse =
      (data && (data as any).university_id) ||
      selectedUniversity ||
      universityId;

    if (!facultyToUse) {
      showToast("Please select a faculty before adding a program", "error");
      return;
    }
    try {
      const payload: any = {
        program_code: String((data as any).code),
        faculty_id: facultyToUse,
        program_name_en: String((data as any).nameEn),
        program_name_th: String((data as any).nameTh),
        program_shortname_en: String((data as any).abbrEn),
        program_shortname_th: String((data as any).abbrTh),
        program_year: parseInt(String((data as any).year)),
      };
      if (universityToUse) payload.university_id = universityToUse;
      await addProgram(payload as any, token!);
      fetchPrograms();
      showToast(t("Program added successfully!"), "success");
      setPage(1);
    } catch (err: any) {
      if (err && err.status === 409) {
        showToast(err.message || "Duplicate program code detected", "error");
      } else {
        showToast("Error: " + (err.message || err), "error");
      }
    }
  };

  // Bulk upload programs from Excel

  // ... inside your component

  const handleFileUpload = async (mappedRows: any[]) => {
    // 1. Determine Faculty
    const facultyToUse =
      mappedRows.length > 0
        ? mappedRows[0].faculty_id
        : selectedFaculty || facultyId;

    if (!facultyToUse) {
      showToast("Please select a faculty before uploading", "error");
      return;
    }

    setLoading(true);

    try {
      // 2. DATA TRANSFORMATION (Crucial Step)
      // We must ensure the keys match exactly what the backend expects.
      // We also use String() and parseInt() to prevent type errors.

      const formattedRows = mappedRows.map((row) => ({
        program_code: String(
          row.program_code || row["code"] || row["Program Code"]
        ),
        program_name_en: String(row.program_name_en || row["nameEn"]),
        program_name_th: String(row.program_name_th || row["nameTh"]),
        program_shortname_en: String(row.program_shortname_en || row["abbrEn"]),
        program_shortname_th: String(row.program_shortname_th || row["abbrTh"]),
        // Convert year to number safely
        program_year: parseInt(String(row.program_year || row["year"]), 10),
        faculty_id: facultyToUse,
      }));

      // Debug: Check your console to see if the data looks correct before sending
      console.log("Sending to API:", formattedRows);

      await bulkUploadPrograms(formattedRows, token!);
      fetchPrograms();
      showToast("Programs uploaded successfully!", "success");
      setPage(1);
    } catch (err: any) {
      console.error("Full Error Object:", err);

      if (axios.isAxiosError(err)) {
        // Log the server response to see the REAL error message
        console.log("Server Response Data:", err.response?.data);

        const errorMsg = err.response?.data?.error || "Upload failed";
        showToast(errorMsg, "error");
      } else {
        showToast("An unexpected error occurred", "error");
      }
    }
  };

  const programColumns: Column<Program>[] = [
    { header: t("code"), accessor: "program_code" },
    lang === "en"
      ? { header: "Name", accessor: "program_name_en" }
      : { header: "ชื่อแผนการเรียน", accessor: "program_name_th" },
    lang === "en"
      ? { header: "Abbrev.", accessor: "program_shortname_en" }
      : { header: "ชื่อย่อ", accessor: "program_shortname_th" },
    {
      header: t("year"),
      accessor: "program_year",
      render: (value: any) => (lang === "en" ? Number(value) - 543 : value),
    },
  ];

  useEffect(() => {
    fetchPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token, page, universityId, facultyId, programId, year]);

  return (
    <div className="mt-5 p-5">
      {loading && <LoadingOverlay />}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{t("program management")}</h1>
        {/* University Dropdown */}

        <AddButton
          buttonText={t("create new program")}
          placeholderText={{
            code: "Program Code",
            nameEn: "Program Name (EN)",
            nameTh: "Program Name (TH)",
            abbrEn: "Program abbreviation (EN)",
            abbrTh: "Program abbreviation (TH)",
            year: "Year",
          }}
          submitButtonText={{
            insert: "Insert Program",
            upload: "Upload Program (Excel)",
          }}
          onSubmit={handleAddProgram}
          onSubmitExcel={handleFileUpload}
          facultyOptions={facultyOptions}
          universityOptions={universityOptions}
          yearOptions={yearOptions}
          selectedFaculty={selectedFaculty}
          selectedUniversity={selectedUniversity}
          selectedYear={selectedYear}
          onFacultyChange={(e) => setSelectedFaculty(e.target.value)}
          onUniversityChange={(e) => setSelectedUniversity(e.target.value)}
          onYearChange={(e) => setSelectedYear(e.target.value)}
        />
      </div>
      <hr className="my-3" />
      {/* Table Component for Programs */}
      <Table<Program> columns={programColumns} data={programs} />
      <PaginationControlButton
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      <ToastElement />
    </div>
  );
}
