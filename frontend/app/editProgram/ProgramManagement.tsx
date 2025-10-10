/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  addProgram,
  bulkUploadPrograms,
  getProgramsPaginated,
} from "../../utils/programApi";
import { Table } from "../../components/Table";
import AddButton from "../../components/AddButton";
import { useTranslation } from "next-i18next";
import { getFaculties } from "../../utils/facultyApi";

interface Program {
  id: number;
  program_code: number;
  program_name_en: string;
  program_name_th: string;
  program_shortname_en: string;
  program_shortname_th: string;
  program_year: number;
}

export default function ProgramManagement() {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn } = useAuth();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [facultyOptions, setFacultyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [programOptions, setProgramOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch faculties
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const fetchFaculties = async () => {
      try {
        const data = await getFaculties(token);
        setFacultyOptions([
          { label: t("please select a faculty"), value: "" },
          ...data.map((f) => ({ label: f.name, value: String(f.id) })),
        ]);
      } catch (err) {
        console.error(err);
        alert("API faculty error");
      }
    };
    fetchFaculties();
  }, [isLoggedIn, token, t]);

  // Fetch programs (paginated)
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    setLoading(true);
    getProgramsPaginated(token, page, 10)
      .then((res) => {
        setPrograms(res.data);
        setTotalPages(Math.ceil((res.total || 1) / 10));
      })
      .catch((err) => {
        alert(err.message || "Failed to fetch programs");
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, token, page]);

  // Prepare programOptions for dropdowns
  useEffect(() => {
    setProgramOptions(
      programs.map((p) => ({
        label: lang === "en" ? p.program_name_en : p.program_name_th,
        value: String(p.id),
      }))
    );
  }, [programs, lang]);

  // Add single program
  const handleAddProgram = async (data: Record<string, unknown>) => {
    if (!selectedFaculty) {
      alert("Please select a faculty before saving data.");
      return;
    }
    try {
      await addProgram(
        {
          program_code: String(data.code),
          faculty_id: selectedFaculty,
          program_name_en: String(data.nameEn),
          program_name_th: String(data.nameTh),
          program_shortname_en: String(data.abbrEn),
          program_shortname_th: String(data.abbrTh),
          program_year: parseInt(String(data.year)),
        },
        token!
      );
      alert("Program added successfully!");
      window.location.reload();
    } catch (err: any) {
      alert("Error: " + (err.message || err));
    }
  };

  // Bulk upload programs from Excel
  const handleFileUpload = async (mappedRows: any[]) => {
    if (!selectedFaculty) {
      alert("Please select a faculty before uploading Excel");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rowsWithFaculty = mappedRows.map((row) => ({
        ...row,
        faculty_id: row.faculty_id || selectedFaculty,
      }));
      await bulkUploadPrograms(rowsWithFaculty, token!);
      alert("Programs uploaded successfully!");
      setPage(1);
    } catch (err: any) {
      alert("Upload failed: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{t("program management")}</h1>
        <AddButton
          buttonText={t("create new program")}
          placeholderText={{
            code: t("Program Code"),
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
          programOptions={programOptions}
          selectedFaculty={selectedFaculty}
          onFacultyChange={(e) => setSelectedFaculty(e.target.value)}
        />
      </div>
      <hr className="my-3" />
      {/* Table Component for Programs */}
      <Table<Program>
        columns={[
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
            render: (value) => (lang === "en" ? Number(value) - 543 : value),
          },
        ]}
        data={programs}
      />
      <div className="flex justify-center items-center gap-2 mt-4 mb-4">
        <button
          className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          {t("previous")}
        </button>
        <span>
          {t("page")} {page} {t("of")} {totalPages}
        </span>
        <button
          className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
