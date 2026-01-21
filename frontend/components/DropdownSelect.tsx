"use client";
import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline"; // Make sure you have heroicons or use an SVG

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
    <div className="w-full relative" ref={dropdownRef}>
      {label && (
        <p className="mb-1 text-sm font-light text-gray-700">{label}</p>
      )}

      {/* The "Select Box" */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full py-2.5 px-3 flex justify-between items-center
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
          {selectedOption ? selectedOption.label : "Select an option..."}
        </span>
        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
      </div>

      {/* The "Dropdown List" */}
      {isOpen && !disabled && (
        <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {options.map((opt) => (
            <li
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`
                cursor-pointer select-none relative py-2 pl-3 pr-9
                /* 🎨 THIS CONTROLS THE HOVER COLOR */
                hover:bg-orange-100 hover:text-orange-900
                ${
                  value === opt.value
                    ? "bg-orange-50 text-orange-900 font-medium" // Selected state
                    : "text-gray-900 font-light" // Normal state
                }
              `}
            >
              <span className="block truncate">{opt.label}</span>

              {/* Checkmark for selected item */}
              {value === opt.value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-orange-600">
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
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomDropdown;
