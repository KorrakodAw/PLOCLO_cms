"use client";

import { useState } from "react";
import DropdownSelect from "../../components/DropdownSelect";
import CourseManagement from "./courseManage";
import { useTranslation } from "react-i18next";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function EditCourse() {
  const { t } = useTranslation("common");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");

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

  const semesterOptions = [
    { label: t("all"), value: "" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
  ];

  return (
    <ProtectedRoute roles={["admin", "instructor"]}>
      <div className="max-w-[1100px] h-full">
        <p className="font-extralight text-2xl">{t("course information")}</p>

        <div className="max-w-200 flex gap-3 mt-5 items-center">
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
          <DropdownSelect
            label={t("semester")}
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            options={semesterOptions}
          />
          <button
            onClick={() => {
              setUniversity("");
              setFaculty("");
              setProgram("");
              setYear("");
              setSemester("");
            }}
            className="text-white bg-orange-300 hover:bg-orange-400 h-5 flex ml-3 items-center p-2 rounded-full cursor-pointer"
          >
            {t("clear")}
          </button>
        </div>
        <CourseManagement />
      </div>
    </ProtectedRoute>
  );
}
