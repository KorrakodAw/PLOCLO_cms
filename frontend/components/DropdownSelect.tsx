"use client";
import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline"; 
import { useTranslation } from "react-i18next";

interface Option {
  label: string | number;
  value: string | number;
}

interface CustomDropdownProps {
  label?: string;
  value: string | number;
  onChange: (value: string | number) => void; // Update to pass value directly
  options: Option[];
  disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation("common");

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find the selected option object to display its label
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative max-w-[400px]" ref={dropdownRef}>
      {label && (
        <p className="mb-1 text-sm font-light text-gray-700">{label}</p>
      )}

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          py-2.5 px-3 flex justify-between items-center
          bg-white border rounded-md shadow-sm cursor-pointer
          text-base font-light transition duration-150 ease-in-out
          ${
            isOpen
              ? "ring-2 ring-orange-300 border-orange-300"
              : "border-gray-300"
          }
          ${disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "text-gray-900"}
        `}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : t("select_an_option")}
        </span>
        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
      </div>

      {/* The "Dropdown List" */}
      {isOpen && !disabled && (
        <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {options.length > 0 ? (
            options.map((opt) => (
              <li
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`
            cursor-pointer select-none relative py-2 pl-3 pr-9
            hover:bg-orange-100 hover:text-orange-900
            ${
              value === opt.value
                ? "bg-orange-50 text-orange-900 font-medium"
                : "text-gray-900 font-light"
            }
          `}
              >
                <span className="block truncate">{opt.label}</span>
                {value === opt.value && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-orange-600">
                    {/* SVG Checkmark */}
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </li>
            ))
          ) : (
            /* 🟢 THIS SHOWS IF NO DATA */
            <li className="py-3 px-3 text-sm text-gray-500 italic text-center">
              No data available
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default CustomDropdown;
