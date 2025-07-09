"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function ButtonWithPopup() {
  const [isOpen, setIsOpen] = useState(false);

  const handleTogglePopup = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClosePopup = () => {
    setIsOpen(false);
  };

  const handleSaveProgram = () => {
    console.log();
  };

  return (
    <>
      <button
        onClick={handleTogglePopup}
        className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Add Program
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center ">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={handleClosePopup}
          ></div>

          {/* Modal */}
          <div className="relative z-10 bg-white p-6 rounded shadow-lg w-2/3">
            <div className="flex justify-between">
              <h3 className="text-xl font-bold mb-4">Add Program</h3>
              <X
                onClick={handleClosePopup}
                className="w-5 h-5 text-gray-600 hover:text-black cursor-pointer"
              />
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                placeholder="Program Code"
                className="w-full px-3 py-2 rounded mb-4 border"
              />
              <input
                type="text"
                placeholder="Program Name (EN)"
                className="w-full px-3 py-2 rounded mb-4 border"
              />
              <input
                type="text"
                placeholder="Program Name (TH)"
                className="w-full px-3 py-2 rounded mb-4 border"
              />
              <div className="flex justify-between gap-2">
                <input
                  type="text"
                  placeholder="Program abbreviation (EN)"
                  className="w-full px-3 py-2 rounded mb-4 border"
                />
                <input
                  type="text"
                  placeholder="Program abbreviation (TH)"
                  className="w-full px-3 py-2 rounded mb-4 border"
                />
              </div>

              <input
                type="text"
                placeholder="Year"
                className="w-full px-3 py-2 rounded mb-4 border"
              />
              <div className="flex justify-between gap-2">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-700"
                >
                  Insert Program
                </button>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-700"
                >
                  Upload Program (Excel)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
