"use client";

import { useState } from "react";
import FormPopup from "./FormPopup";

interface AddButtonProp {
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

  showAbbreviationInputs?: boolean;
  showYearInput?: boolean;
}

export default function AddButton({
  buttonText = "Button",
  placeholderText = {},
  submitButtonText = {},
  showAbbreviationInputs = true,
  showYearInput = true,
}: AddButtonProp) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-orange-300 text-white px-4 py-2 rounded hover:bg-orange-400 transition"
      >
        {buttonText}
      </button>

      {isOpen && (
        <FormPopup
          onClose={() => setIsOpen(false)}
          placeholderText={placeholderText}
          submitButtonText={submitButtonText}
          showAbbreviationInputs={showAbbreviationInputs}
          showYearInput={showYearInput}
        />
      )}
    </>
  );
}
