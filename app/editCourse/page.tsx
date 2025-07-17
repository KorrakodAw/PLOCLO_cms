"use client";

import { useState } from "react";
import DropdownSelect from "../../components/DropdownSelect";
import CourseManagement from "./courseManage";
import { useTranslation } from "react-i18next";

export default function EditCourse() {
  const { t } = useTranslation("common");
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
    <div className="max-w-[1100px] px-4 h-full">
      <p className="font-extralight text-2xl">{t("course information")}</p>

      <div className="max-w-200 flex gap-3 mt-5">
        <DropdownSelect
          label={t("university")}
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          options={options}
        />
        <DropdownSelect
          label={t("faculty")}
          value={faculty}
          onChange={(e) => setFaculty(e.target.value)}
          options={options}
        />
        <DropdownSelect
          label={t("program")}
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          options={options}
        />
        <DropdownSelect
          label={t("year")}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={options}
        />
        <DropdownSelect
          label={t("semester")}
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          options={options}
        />
      </div>
      <CourseManagement />
    </div>
  );
}
