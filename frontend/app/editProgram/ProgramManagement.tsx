"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import ProtectedRoute from "../../components/ProtectedRoute";
import AddButton from "../../components/AddButton";
import { useTranslation } from "next-i18next";
import * as XLSX from "xlsx";

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
  const { token, isLoggedIn } = useAuth();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !token) return;

    const fetchPrograms = async () => {
      try {
        const res = await apiClient("/api/program", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to fetch programs");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setPrograms(data);
      } catch (err) {
        console.error(err);
        alert("Cannot reach API. Check backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, [isLoggedIn, token]);

  if (!isLoggedIn) return <p>Please login first.</p>;
  if (loading) return <p>Loading programs...</p>;

  const handleAddProgram = async (data: any) => {
    try {
      const res = await apiClient("/api/program", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          program_code: data.code,
          program_name_en: data.nameEn,
          program_name_th: data.nameTh,
          program_shortname_en: data.abbrEn,
          program_shortname_th: data.abbrTh,
          program_year: parseInt(data.year),
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      try {
        const res = await apiClient("/api/program/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(rows),
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to upload");
          return;
        }
        alert("Programs uploaded successfully!");
      } catch (err) {
        console.error(err);
        alert("Upload failed. Check backend.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
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
          />
        </div>

        <hr className="my-3" />

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
                  {" "}
                  {lang === "en" ? p.program_year - 543 : p.program_year}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProtectedRoute>
  );
}
