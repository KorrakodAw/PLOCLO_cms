"use client";

import React, { useState } from "react";
import DropdownSelect from "../../components/DropdownSelect";
import TabButton from "../../components/TabButton";
import ProgramManagement from "./ProgramManagement";
import AddPlo from "./AddPlo";
import AddStudent from "./AddStudent";
import { useTranslation } from "react-i18next";

export default function EditProgram() {
  const { t } = useTranslation("common");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: t("general information") },
    { id: "plo", label: t("program learning outcomes (PLO)") },
    { id: "add-student", label: t("add student to program") },
  ];

  const universityOptions = [
    { label: t("all"), value: "" },
    { label: "Chulalongkorn University", value: "chula" },
    { label: "Thammasat University", value: "tu" },
    { label: "Kasetsart University", value: "ku" },
  ];

  const facultyOptions = [
    { label: t("all"), value: "" },
    { label: "Engineering", value: "engineering" },
    { label: "Medicine", value: "medicine" },
    { label: "Political Science", value: "politics" },
    { label: "Agriculture", value: "agriculture" },
  ];

  const programOptions = [
    { label: t("all"), value: "" },
    { label: "Computer Engineering", value: "comp-eng" },
    { label: "Electrical Engineering", value: "elec-eng" },
    { label: "Doctor of Medicine", value: "doctor" },
    { label: "International Relations", value: "intl-rel" },
    { label: "Soil Science", value: "soil-science" },
  ];

  const yearOptions = [
    { label: t("all"), value: "" },
    { label: "2021", value: "2021" },
    { label: "2022", value: "2022" },
    { label: "2023", value: "2023" },
    { label: "2024", value: "2024" },
  ];

  return (
    <div className="max-w-[1100px] px-4 h-full">
      <p className="font-extralight text-2xl">{t("program information")}</p>
      <div className="flex gap-3 mt-5 px-3 py-2">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.label}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>
      <hr />
      <div className="max-w-200 flex gap-3 mt-5">
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
      </div>
      {activeTab === "general" && <ProgramManagement />}
      {activeTab === "plo" && <AddPlo />}
      {activeTab === "add-student" && <AddStudent />}
    </div>
  );
}
