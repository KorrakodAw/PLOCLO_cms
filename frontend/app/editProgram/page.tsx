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

interface University {
  name: string;
  id: string;
}

interface Faculty {
  name: string;
  id: string;
}

interface Program {
  program_name_en: string;
  program_code: string;
  program_year: number;
}

export default function EditProgram() {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");
  // const ACTIVE_TAB_KEY = "editProgramActiveTab";
  const ACTIVE_TAB_KEY = `activeTab_${location.pathname}`;

  // Initialize activeTab from URL hash or localStorage on first client render
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const hash = window.location.hash
          ? window.location.hash.replace(/^#/, "")
          : "";
        const valid = ["general", "plo", "add-student"];
        if (hash && valid.includes(hash)) return hash;
        const stored = localStorage.getItem(ACTIVE_TAB_KEY);
        if (stored && valid.includes(stored)) return stored;
      }
    } catch {
      // ignore
    }
    return "general";
  });

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

  // (initial value handled by useState initializer)

  // Persist active tab whenever it changes (write both hash and localStorage)
  useEffect(() => {
    try {
      // update hash without adding history entry
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `#${activeTab}`);
      }
      localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
    } catch {
      // ignore localStorage/window errors
    }
  }, [ACTIVE_TAB_KEY, activeTab]);

  const clearFilters = () => {
    setUniversity("");
    setFaculty("");
    setProgram("");
    setYear("");
  };

  // โหลดมหาวิทยาลัยตอนเริ่มต้น
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!university) {
      setUniversity("");
      setFaculty("");
      setProgram("");
      setYear("");
    }

    getUniversities(token)
      .then((data) => {
        setUniversityOptions([
          { label: t("all"), value: "" },
          ...data.map((u: University) => ({
            label: u.name,
            value: String(u.id),
          })),
        ]);
      })
      .catch(() => setUniversityOptions([{ label: t("all"), value: "" }]));
  }, [t]);

  // เมื่อเลือกมหาวิทยาลัย → โหลดคณะ
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !university) {
      setFacultyOptions([{ label: t("all"), value: "" }]);
      setFaculty("");
      setProgram("");
      setYear("");
      setFacultyOptions([{ label: t("all"), value: "" }]);
      setProgramOptions([{ label: t("all"), value: "" }]);
      setYearOptions([{ label: t("all"), value: "" }]);
      return;
    }

    const fetchFaculties = async () => {
      try {
        // Send universityId to the API
        const data = await getFaculties(token, university);

        setFacultyOptions([
          { label: t("all"), value: "" },
          ...data.map((f: Faculty) => ({
            label: f.name,
            value: String(f.id),
          })),
        ]);
      } catch (err) {
        console.error(err);
        setFacultyOptions([{ label: t("all"), value: "" }]);
      }
    };

    fetchFaculties();
  }, [university, t]);

  // เมื่อเลือกคณะ → โหลดโปรแกรม
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !faculty) {
      setProgram("");
      setYear("");
      setProgramOptions([{ label: t("all"), value: "" }]);
      setYearOptions([{ label: t("all"), value: "" }]);
      return;
    }

    getPrograms(token, faculty) // ← ส่ง facultyId ไป
      .then((data) => {
        const uniquePrograms = Array.from(
          new Map(data.map((p: Program) => [p.program_code, p])).values()
        );

        setProgramOptions([
          { label: t("all"), value: "" },
          ...(uniquePrograms as Program[]).map((p) => ({
            label: p.program_name_en,
            value: String(p.program_code),
          })),
        ]);

        // const years = Array.from(
        //   new Set(data.map((p: Program) => p.program_year))
        // ).sort() as number[];
        // setYearOptions([
        //   { label: t("all"), value: "" },
        //   ...years.map((y: number) => ({ label: String(y), value: String(y) })),
        // ]);
      })
      .catch(() => {
        setProgramOptions([{ label: t("all"), value: "" }]);
        // setYearOptions([{ label: t("all"), value: "" }]);
      });
  }, [faculty, t]);

  // เมื่อเลือกโปรแกรม → โหลดปีการศึกษา
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !faculty || !program) {
      setYearOptions([{ label: t("all"), value: "" }]);
      return;
    }

    if (!program) {
      // If no program selected, keep the faculty-wide year options (do nothing)
      return;
    }

    getPrograms(token, faculty)
      .then((data) => {
        // Filter programs with the selected program_code
        const years = Array.from(
          new Set(
            data
              .filter(
                (p: Program) => String(p.program_code) === String(program)
              )
              .map((p: Program) => p.program_year)
          )
        ).sort() as number[];

        if (years.length === 0) {
          setYearOptions([{ label: t("all"), value: "" }]);
        } else {
          setYearOptions([
            { label: t("all"), value: "" },
            ...years.map((y) => {
              const label = lang === "en" ? String(y - 543) : String(y);
              return { label, value: String(y) }; // display converted label, keep real value
            }),
          ]);
        }
      })
      .catch(() => setYearOptions([{ label: t("all"), value: "" }]));
  }, [program, faculty, t, lang]);

  return (
    <ProtectedRoute roles={["admin", "instructor"]}>
      <div className="max-w-[1400px] h-full flex flex-col mx-auto">
        <p className="font-extralight text-2xl ">{t("program information")}</p>

        {/* Tabs */}
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

        {/* Filters */}
        <div className="flex gap-3 mt-5 items-center">
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
            disabled={!university}
          />

          <DropdownSelect
            label={t("program")}
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            options={programOptions}
            disabled={!faculty}
          />

          <DropdownSelect
            label={t("year")}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={yearOptions}
            disabled={!program}
          />

          <button
            onClick={clearFilters}
            className="text-white bg-orange-300 hover:bg-orange-400 h-5 flex ml-3 items-center p-2 rounded-full cursor-pointer"
          >
            {t("clear")}
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "general" && (
          <ProgramManagement
            universityId={university}
            facultyId={faculty}
            programId={program}
            year={year}
          />
        )}
        {activeTab === "plo" && (
          <AddPlo
            universityId={university}
            facultyId={faculty}
            programId={program}
            year={year}
          />
        )}
        {activeTab === "add-student" && (
          <AddStudent
            universityId={university}
            facultyId={faculty}
            programId={program}
            year={year}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
