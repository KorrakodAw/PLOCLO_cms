"use client";
import { useState } from "react";
import DropdownSelect from "../../components/DropdownSelect";

export default function EditCourse() {
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");

  const options = [
    { label: "All", value: "" },
    { label: "Harvard", value: "harvard" },
    { label: "Oxford", value: "oxford" },
    { label: "Cambridge", value: "cambridge" },
  ];
  return (
    <div className="w-full px-4 overflow-x-auto">
      <p className="font-extralight text-2xl">Course Information</p>
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
        <DropdownSelect
          label="Semester"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          options={options}
        />
      </div>
    </div>
  );
}
