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
import { getUniversities } from "../../utils/universityApi";
import PaginationControlButton from "../../components/PaignateControlButton";

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
  const [universityOptions, setUniversityOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [facultyOptions, setFacultyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [programOptions, setProgramOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10); // You can make this configurable if needed

  // Fetch universities
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const fetchUniversities = async () => {
      try {
        const data = await getUniversities(token);
        setUniversityOptions([
          { label: t("please select a university"), value: "" },
          ...data.map((u: any) => ({ label: u.name, value: String(u.id) })),
        ]);
      } catch (err) {
        console.error(err);
        alert("API university error");
      }
    };
    fetchUniversities();
  }, [isLoggedIn, token, t]);

  // Fetch faculties for selected university
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedUniversity) {
      setFacultyOptions([{ label: t("please select a faculty"), value: "" }]);
      return;
    }
    const fetchFaculties = async () => {
      try {
        const data = await getFaculties(token);
        setFacultyOptions([
          { label: t("please select a faculty"), value: "" },
          ...data
            .filter((f: any) => String(f.university_id) === selectedUniversity)
            .map((f: any) => ({ label: f.name, value: String(f.id) })),
        ]);
      } catch (err) {
        console.error(err);
        alert("API faculty error");
      }
    };
    fetchFaculties();
  }, [isLoggedIn, token, t, selectedUniversity]);

  // Fetch programs (paginated)
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    setLoading(true);
    getProgramsPaginated(token, page, limit)
      .then((res) => {
        setPrograms(res.data);
        setTotalPages(Math.ceil((res.total || 1) / limit));
      })
      .catch((err) => {
        alert(err.message || "Failed to fetch programs");
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, token, page, limit]);

  // Prepare programOptions for dropdowns
  useEffect(() => {
    // Filter programs by selected university and faculty
    const filteredPrograms = programs.filter((p: any) => {
      // If you have university_id and faculty_id in program object, filter by them
      // Adjust field names if needed
      if (selectedUniversity && selectedFaculty) {
        return (
          String(p.university_id) === selectedUniversity &&
          String(p.faculty_id) === selectedFaculty
        );
      } else if (selectedFaculty) {
        return String(p.faculty_id) === selectedFaculty;
      } else if (selectedUniversity) {
        return false; // Only show programs if faculty is selected
      }
      return false;
    });
    setProgramOptions([
      { label: t("please select a program"), value: "" },
      ...filteredPrograms.map((p: any) => ({
        label: lang === "en" ? p.program_name_en : p.program_name_th,
        value: String(p.id),
      })),
    ]);
  }, [programs, lang, selectedUniversity, selectedFaculty, t]);

  // Add single program
  const handleAddProgram = async (data: Record<string, unknown>) => {
    if (!selectedFaculty) {
      alert("Please select a faculty before saving data.");
      return;
    }
    if (!selectedUniversity) {
      alert("Please select a University before saving data.");
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
      window.location.reload();
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
        {/* University Dropdown */}

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
          universityOptions={universityOptions}
          selectedFaculty={selectedFaculty}
          selectedUniversity={selectedUniversity}
          onFacultyChange={(e) => setSelectedFaculty(e.target.value)}
          onUniversityChange={(e) => setSelectedUniversity(e.target.value)}
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
      <PaginationControlButton
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
