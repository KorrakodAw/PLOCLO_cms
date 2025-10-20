"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import * as XLSX from "xlsx";
import DropdownSelect from "./DropdownSelect";
import { useTranslation } from "react-i18next";

interface FormData {
  code: string;
  nameEn: string;
  nameTh: string;
  abbrEn: string;
  abbrTh: string;
  year: string;
}

interface FormPopupProps {
  requiredFields?: string[];
  fieldMap?: Record<string, string>;
  facultyOptions?: { label: string; value: string }[];
  programOptions?: { label: string; value: string }[];
  universityOptions?: { label: string; value: string }[];
  selectedUniversity?: string;
  onUniversityChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedFaculty?: string;
  selectedProgram?: string;
  onFacultyChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onProgramChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void> | void;
  onSubmitExcel?: (rows: unknown[]) => Promise<void> | void;
  placeholderText: Partial<FormData>;
  submitButtonText?: {
    insert?: string;
    upload?: string;
  };
  showAbbreviationInputs?: boolean;
  showYearInput?: boolean;
}

export default function FormPopup({
  onClose,
  onSubmit,
  onSubmitExcel,
  placeholderText,
  submitButtonText = {},
  showAbbreviationInputs = false,
  showYearInput = false,
  facultyOptions = [],
  programOptions = [],
  universityOptions = [],
  selectedFaculty = "",
  selectedProgram = "",
  selectedUniversity = "",
  onFacultyChange,
  onProgramChange,
  onUniversityChange,
  requiredFields = ["code", "nameEn", "nameTh"],
  fieldMap = {},
}: FormPopupProps) {
  const {
    code = "",
    nameEn = "",
    nameTh = "",
    abbrEn = "",
    abbrTh = "",
    year = "",
  } = placeholderText;

  const { insert = "Insert", upload = "Upload" } = submitButtonText;

  const [formData, setFormData] = useState<FormData>({
    code: "",
    nameEn: "",
    nameTh: "",
    abbrEn: "",
    abbrTh: "",
    year: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation("common");

  // 🚫 Disable background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    requiredFields.forEach((internalKey) => {
      const propKey = fieldMap[internalKey] || internalKey;
      const value = formData[propKey as keyof typeof formData];
      if (!value || String(value).trim() === "") {
        newErrors[propKey] = "This field is required.";
      }
    });
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    try {
      setLoading(true);
      await onSubmit(formData);
      window.location.reload();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to submit form");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: unknown[] = XLSX.utils.sheet_to_json(worksheet);

      console.log("Excel Data:", rows);

      if (onSubmitExcel) {
        await onSubmitExcel(rows);
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative z-10 bg-white p-8 rounded-2xl shadow-2xl w-[90%] max-w-3xl transition-all">
        {/* Header */}
        <div className="flex justify-end mb-6 border-b pb-3">
          <X
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 cursor-pointer transition-colors"
          />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Dropdown Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {universityOptions.length > 0 && onUniversityChange && (
              <DropdownSelect
                label={t("University")}
                value={selectedUniversity}
                onChange={onUniversityChange}
                options={universityOptions}
              />
            )}

            {facultyOptions.length > 0 && onFacultyChange && (
              <DropdownSelect
                label="Faculty"
                value={selectedFaculty}
                onChange={onFacultyChange}
                options={facultyOptions}
                disabled={!selectedUniversity}
              />
            )}

            {programOptions.length > 0 && onProgramChange && (
              <DropdownSelect
                label="Program"
                value={selectedProgram}
                onChange={onProgramChange}
                options={programOptions}
                disabled={!selectedFaculty}
              />
            )}
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {[
              { name: "code", placeholder: code },
              { name: "nameEn", placeholder: nameEn },
              { name: "nameTh", placeholder: nameTh },
            ].map(({ name, placeholder }) => (
              <div key={name}>
                <input
                  type="text"
                  name={name}
                  placeholder={placeholder}
                  value={formData[name as keyof FormData]}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    errors[name] ? "border-red-500" : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                />
                {errors[name] && (
                  <p className="text-red-500 text-sm mt-1">{errors[name]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Abbreviation Fields */}
          {showAbbreviationInputs && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "abbrEn", placeholder: abbrEn },
                { name: "abbrTh", placeholder: abbrTh },
              ].map(({ name, placeholder }) => (
                <div key={name}>
                  <input
                    type="text"
                    name={name}
                    placeholder={placeholder}
                    value={formData[name as keyof FormData]}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      errors[name] ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                  />
                  {errors[name] && (
                    <p className="text-red-500 text-sm mt-1">{errors[name]}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Year Input */}
          {showYearInput && (
            <div>
              <input
                type="text"
                name="year"
                placeholder={year}
                value={formData.year}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.year ? "border-red-500" : "border-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-400`}
              />
              {errors.year && (
                <p className="text-red-500 text-sm mt-1">{errors.year}</p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col md:flex-row justify-end gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-5 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
            >
              {loading ? "Submitting..." : insert}
            </button>

            <label className="w-full md:w-auto px-5 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 cursor-pointer text-center transition">
              {upload}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </form>
      </div>
    </div>
  );
}
