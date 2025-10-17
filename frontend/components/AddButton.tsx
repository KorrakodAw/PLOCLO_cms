/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import FormPopup from "./FormPopup";

interface AddButtonProp {
  universityOptions?: { label: string; value: string }[];
  selectedUniversity?: string;
  onUniversityChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  facultyOptions?: { label: string; value: string }[];
  programOptions?: { label: string; value: string }[];
  selectedFaculty?: string;
  selectedProgram?: string;
  onFacultyChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onProgramChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  buttonText?: string;
  placeholderText?: {
    code?: string;
    nameEn?: string;
    nameTh?: string;
    abbrEn?: string;
    abbrTh?: string;
    year?: string;
  };
  submitButtonText?: {
    insert?: string;
    upload?: string;
  };
  onSubmit: (data: any) => void;
  onSubmitExcel?: (data: unknown[]) => void;

  showAbbreviationInputs?: boolean;
  showYearInput?: boolean;
}

export default function AddButton({
  buttonText = "Button",
  placeholderText = {},
  submitButtonText = {},
  showAbbreviationInputs = true,
  showYearInput = true,
  onSubmit,
  onSubmitExcel,
  universityOptions = [],
  selectedUniversity = "",
  onUniversityChange,
  facultyOptions = [],
  programOptions = [],
  selectedFaculty = "",
  selectedProgram = "",
  onFacultyChange,
  onProgramChange,
}: AddButtonProp) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-orange-300 text-white px-4 py-2 rounded hover:bg-orange-400 transition cursor-pointer"
      >
        {buttonText}
      </button>

      {isOpen && (
        <FormPopup
          onClose={() => setIsOpen(false)} // ปิด popup
          onSubmit={onSubmit}
          onSubmitExcel={onSubmitExcel}
          placeholderText={placeholderText}
          submitButtonText={submitButtonText}
          showAbbreviationInputs={showAbbreviationInputs}
          showYearInput={showYearInput}
          selectedUniversity={selectedUniversity}
          selectedFaculty={selectedFaculty}
          selectedProgram={selectedProgram}
          facultyOptions={facultyOptions}
          programOptions={programOptions}
          universityOptions={universityOptions}
          onUniversityChange={onUniversityChange}
          onFacultyChange={onFacultyChange}
          onProgramChange={onProgramChange}
        />
      )}
    </>
  );
}
