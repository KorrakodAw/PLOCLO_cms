"use client";

import React, { useState, useEffect } from "react";
import DropdownSelect from "../../components/DropdownSelect";
import { getUniversities } from "../../utils/universityApi";
import { getFaculties } from "../../utils/facultyApi";
import { getPrograms } from "../../utils/programApi";
import TabButton from "../../components/TabButton";
import ProgramManagement from "./ProgramManagement";
import AddPlo from "./AddPlo";
import AddStudent from "./AddStudent";
import { useTranslation } from "react-i18next";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function EditProgram() {
  const { t } = useTranslation("common");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  const [universityOptions, setUniversityOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [facultyOptions, setFacultyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [programOptions, setProgramOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [yearOptions, setYearOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const tabs = [
    { id: "general", label: t("general information") },
    { id: "plo", label: t("program learning outcomes (PLO)") },
    { id: "add-student", label: t("add student to program") },
  ];

  const clearFilters = () => {
    setUniversity("");
    setFaculty("");
    setProgram("");
    setYear("");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Universities
    interface University {
      id: number | string;
      name: string;
    }
    interface Faculty {
      id: number | string;
      name: string;
    }
    interface Program {
      id: number | string;
      program_name_en: string;
      program_year: number;
    }

    getUniversities(token)
      .then((data: University[]) => {
        setUniversityOptions([
          { label: t("all"), value: "" },
          ...data.map((u: University) => ({
            label: u.name,
            value: String(u.id),
          })),
        ]);
      })
      .catch(() => setUniversityOptions([{ label: t("all"), value: "" }]));

    getFaculties(token)
      .then((data) => {
        setFacultyOptions([
          { label: t("all"), value: "" },
          ...data.map((f: Faculty) => ({ label: f.name, value: String(f.id) })),
        ]);
      })
      .catch(() => setFacultyOptions([{ label: t("all"), value: "" }]));

    getPrograms(token)
      .then((data: Program[]) => {
        const uniquePrograms: Program[] = [];
        const seen = new Set();
        for (const p of data) {
          if (!seen.has(p.program_name_en)) {
            uniquePrograms.push(p);
            seen.add(p.program_name_en);
          }
        }
        setProgramOptions([
          { label: t("all"), value: "" },
          ...uniquePrograms.map((p: Program) => ({
            label: p.program_name_en,
            value: String(p.id),
          })),
        ]);
        const years = Array.from(
          new Set(data.map((p: Program) => p.program_year))
        ).sort();
        setYearOptions([
          { label: t("all"), value: "" },
          ...years.map((y: number) => ({ label: String(y), value: String(y) })),
        ]);
      })
      .catch(() => {
        setProgramOptions([{ label: t("all"), value: "" }]);
        setYearOptions([{ label: t("all"), value: "" }]);
      });
  }, []);

  return (
    <ProtectedRoute roles={["admin", "instructor"]}>
      <div className="max-w-[1100px] h-full">
        <p className="font-extralight text-2xl ">{t("program information")}</p>
        <div className="flex gap-3 mt-5 px-3 py-2 ">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              isActive={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                clearFilters();
              }}
            />
          ))}
        </div>
        <hr />
        <div className="max-w-200 flex gap-3 mt-5 items-center ">
          <DropdownSelect
            label={t("university")}
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            options={universityOptions}
          />
          <DropdownSelect
            label={t("faculty")}
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            options={facultyOptions}
          />
          <DropdownSelect
            label={t("program")}
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            options={programOptions}
          />
          <DropdownSelect
            label={t("year")}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={yearOptions}
          />
          <button
            onClick={clearFilters}
            className="text-white bg-orange-300 hover:bg-orange-400 h-5 flex ml-3 items-center p-2 rounded-full cursor-pointer"
          >
            {t("clear")}
          </button>
        </div>
        {activeTab === "general" && <ProgramManagement />}
        {activeTab === "plo" && <AddPlo />}
        {activeTab === "add-student" && <AddStudent />}
      </div>
    </ProtectedRoute>
  );
}
