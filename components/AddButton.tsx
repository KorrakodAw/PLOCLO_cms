"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface ButtonWithPopupProps {
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
}

export default function ButtonWithPopup({
  buttonText,
  placeholderText = {},
  submitButtonText = {},
}: ButtonWithPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    code = "",
    nameEn = "",
    nameTh = "",
    abbrEn = "",
    abbrTh = "",
    year = "",
  } = placeholderText;

  const { insert = "", upload = "" } = submitButtonText;

  const handleTogglePopup = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClosePopup = () => {
    setIsOpen(false);
  };

  const handleSaveProgram = () => {
    console.log("Save Program clicked");
  };

  return (
    <>
      <button
        onClick={handleTogglePopup}
        className="bg-orange-300 text-white px-4 py-2 rounded hover:bg-orange-400 transition"
      >
        {buttonText}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={handleClosePopup}
          ></div>

          {/* Modal */}
          <div className="relative z-10 bg-white p-6 rounded shadow-lg w-2/3 max-w-3xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold mb-4">Add Program</h3>
              <X
                onClick={handleClosePopup}
                className="w-5 h-5 text-gray-600 hover:text-black cursor-pointer"
              />
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                placeholder={code}
                className="w-full px-3 py-2 rounded mb-4 border"
              />
              <input
                type="text"
                placeholder={nameEn}
                className="w-full px-3 py-2 rounded mb-4 border"
              />
              <input
                type="text"
                placeholder={nameTh}
                className="w-full px-3 py-2 rounded mb-4 border"
              />
              <div className="flex justify-between gap-2 bg">
                <input
                  type="text"
                  placeholder={abbrEn}
                  className="w-full px-3 py-2 rounded mb-4 border"
                />
                <input
                  type="text"
                  placeholder={abbrTh}
                  className="w-full px-3 py-2 rounded mb-4 border"
                />
              </div>
              <input
                type="text"
                placeholder={year}
                className="w-full px-3 py-2 rounded mb-4 border"
              />
              <div className="flex justify-between gap-2">
                <button
                  type="submit"
                  onClick={handleSaveProgram}
                  className="w-full px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-700"
                >
                  {insert}
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-700"
                >
                  {upload}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
