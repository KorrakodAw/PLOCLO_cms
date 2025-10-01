"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import { getProgramsPaginated } from "../../utils/programApi";
import ProtectedRoute from "../../components/ProtectedRoute";
import AddButton from "../../components/AddButton";
import { useTranslation } from "next-i18next";

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
  // ประกาศ hooks และ state ที่ต้องใช้ใน useEffect ก่อน
  const { token, isLoggedIn } = useAuth();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10); // You can make this configurable if needed
  // faculty/program dropdown options
  interface Faculty {
    id: number;
    name: string;
  }
  const [facultyOptions, setFacultyOptions] = useState<
    { label: string; value: string }[]
  >([{ label: "กรุณาเลือกคณะ", value: "" }]);
  const [programOptions, setProgramOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  // (Removed unused local pagination state)
  // ดึงข้อมูลคณะจาก backend เมื่อ login แล้ว
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const fetchFaculties = async () => {
      try {
        const res = await apiClient("/api/faculty", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Unable to retrieve faculty information");
          return;
        }
        const data: Faculty[] = await res.json();
        // แปลงข้อมูลเป็นรูปแบบ dropdown
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
  }, [isLoggedIn, token]);
  // เตรียม programOptions จากข้อมูล programs ที่ดึงมา
  useEffect(() => {
    setProgramOptions(
      programs.map((p) => ({
        label: lang === "en" ? p.program_name_en : p.program_name_th,
        value: String(p.id),
      }))
    );
  }, [programs, lang]);

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const fetchPrograms = async () => {
      setLoading(true);
      try {
        const result = await getProgramsPaginated(token, page, limit);
        setPrograms(result.data);
        setTotalPages(result.totalPages);
      } catch (err) {
        setPrograms([]);
        setTotalPages(1);
        alert("Cannot reach API. Check backend.");
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
  }, [isLoggedIn, token, page, limit]);

  if (!isLoggedIn) return <p>Please login first.</p>;
  if (loading) return <p>Loading programs...</p>;

  const handleAddProgram = async (data: Record<string, unknown>) => {
    // ตรวจสอบว่ามีการเลือก faculty
    if (!selectedFaculty) {
      alert("Please select a faculty before saving data.");
      return;
    }
    try {
      const res = await apiClient("/api/program", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          program_code: data.code,
          faculty_id: selectedFaculty, // ใช้ค่าที่เลือกจาก dropdown
          program_name_en: data.nameEn,
          program_name_th: data.nameTh,
          program_shortname_en: data.abbrEn,
          program_shortname_th: data.abbrTh,
          program_year: parseInt(String(data.year)),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to add program");
        return;
      }

      const newProgram = await res.json();
      setPrograms((prev) => [...prev, newProgram]); // อัปเดต state
    } catch (error) {
      console.error(error);
      alert("Error adding program");
    }
  };

  const handleFileUpload = async (mappedRows: unknown[]) => {
    // เติม faculty_id จาก selectedFaculty ถ้าไม่มีใน excel
    if (!selectedFaculty) {
      alert("Please select a faculty before uploading Excel");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // ตรวจสอบข้อมูลซ้ำจาก program_code ที่มีอยู่ใน state
      // ตรวจสอบซ้ำ: program_code ซ้ำได้ แต่ year ต้องไม่ซ้ำใน program_code เดียวกัน
      const existingPairs = new Set(
        programs.map(
          (p) =>
            `${String(p.program_code).trim()}-${String(p.program_year).trim()}`
        )
      );
      const rowsWithFaculty = mappedRows
        .map((row) => ({
          ...row,
          faculty_id: row.faculty_id || selectedFaculty,
        }))
        .filter((row) => {
          if (!row.program_code || !row.program_year) return false;
          const pairKey = `${String(row.program_code).trim()}-${String(
            row.program_year
          ).trim()}`;
          return !existingPairs.has(pairKey);
        });
      if (rowsWithFaculty.length === 0) {
        alert("No new data to add to the database (duplicate data)");
        setLoading(false);
        return;
      }
      const res = await apiClient("/api/program/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rowsWithFaculty),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to upload");
        return;
      }
      const result = await res.json();
      // Add uploaded programs to local datatable
      if (result.data && Array.isArray(result.data)) {
        setPrograms((prev) => [...prev, ...result.data]);
      }
      alert("Programs uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check backend.");
    } finally {
      setLoading(false);
      window.location.reload(); // Reload to fetch latest data
    }
  };

  return (
    <ProtectedRoute roles={["admin", "instructor"]}>
      <div className="mt-5 p-5">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-extralight">
            {t("program management")}
          </h1>
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
        {/* Pagination Controls */}

        <table className="min-w-full border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">{t("Code")}</th>
              <th className="px-4 py-2 border">
                {lang === "en" ? "Name" : "ชื่อแผนการเรียน"}
              </th>
              <th className="px-4 py-2 border">
                {lang === "en" ? "Abbrev." : "ชื่อย่อ"}
              </th>
              <th className="px-4 py-2 border">{t("year")}</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">{p.program_code}</td>
                <td className="px-4 py-2 border">
                  {lang === "en" ? p.program_name_en : p.program_name_th}
                </td>
                <td className="px-4 py-2 border">
                  {lang === "en"
                    ? p.program_shortname_en
                    : p.program_shortname_th}
                </td>
                <td className="px-4 py-2 border">
                  {lang === "en" ? p.program_year - 543 : p.program_year}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-center items-center gap-2 mt-4 mb-4">
          <button
            className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
