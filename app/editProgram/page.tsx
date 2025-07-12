"use client";

import React, { useState } from "react";
import DropdownSelect from "../../components/DropdownSelect";
import TabButton from "../../components/TabButton";
import ProgramManagement from "./ProgramManagement";
import AddPlo from "./AddPlo";
import AddStudent from "./AddStudent";

export default function EditProgram() {
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General Information" },
    { id: "plo", label: "Program Learning Outcomes (PLO)" },
    { id: "add-student", label: "Add Student To Program" },
  ];

  const options = [
    { label: "All", value: "" },
    { label: "Harvard", value: "harvard" },
    { label: "Oxford", value: "oxford" },
    { label: "Cambridge", value: "cambridge" },
  ];

  return (
    <div className="w-[1100px] px-4 h-full">
      <p className="font-extralight text-2xl">Program Information</p>
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
          label="University"
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          options={options}
        />
        <DropdownSelect
          label="Faculty"
          value={faculty}
          onChange={(e) => setFaculty(e.target.value)}
          options={options}
        />
        <DropdownSelect
          label="Program"
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          options={options}
        />
        <DropdownSelect
          label="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={options}
        />
      </div>
      {activeTab === "general" && <ProgramManagement />}
      {activeTab === "plo" && <AddPlo />}
      {activeTab === "add-student" && <AddStudent />}
    </div>
  );
}
