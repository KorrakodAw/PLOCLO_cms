"use client";

import { useState } from "react";
import { X } from "lucide-react";
import * as XLSX from "xlsx";
import DropdownSelect from "./DropdownSelect";

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
  fieldMap?: Record<string, string>; // { internalName: externalName }
  facultyOptions?: { label: string; value: string }[];
  programOptions?: { label: string; value: string }[];
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
  selectedFaculty = "",
  selectedProgram = "",
  onFacultyChange,
  onProgramChange,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    requiredFields.forEach((internalKey) => {
      // Use fieldMap if provided, otherwise use internalKey
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
      await onSubmit(formData); // 👈 delegate to parent
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
        await onSubmitExcel(rows); // 👈 ส่งข้อมูลกลับไป parent
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black opacity-50"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative z-10 bg-white p-6 rounded shadow-lg w-2/3 max-w-3xl">
        <div className="flex justify-end items-center mb-5">
          <X
            onClick={onClose}
            className="text-gray-600 hover:text-black cursor-pointer"
          />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Faculty Dropdown */}
          {facultyOptions.length > 0 && onFacultyChange && (
            <div className="mb-4">
              <DropdownSelect
                label="Faculty"
                value={selectedFaculty}
                onChange={onFacultyChange}
                options={facultyOptions}
              />
            </div>
          )}
          {/* Program Dropdown */}
          {programOptions.length > 0 && onProgramChange && (
            <div className="mb-4">
              <DropdownSelect
                label="Program"
                value={selectedProgram}
                onChange={onProgramChange}
                options={programOptions}
              />
            </div>
          )}

          {/* Code, Name EN, Name TH */}
          {[
            { name: "code", placeholder: code },
            { name: "nameEn", placeholder: nameEn },
            { name: "nameTh", placeholder: nameTh },
          ].map(({ name, placeholder }) => (
            <div key={name} className="mb-4">
              <input
                type="text"
                name={name}
                placeholder={placeholder}
                value={formData[name as keyof FormData]}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded border ${
                  errors[name] ? "border-red-500" : "border"
                }`}
              />
              {errors[name] && (
                <p className="text-red-500 text-sm mt-1">{errors[name]}</p>
              )}
            </div>
          ))}

          {/* Abbreviation */}
          {showAbbreviationInputs && (
            <div className="flex gap-2 mb-4">
              {[
                { name: "abbrEn", placeholder: abbrEn },
                { name: "abbrTh", placeholder: abbrTh },
              ].map(({ name, placeholder }) => (
                <div key={name} className="w-full">
                  <input
                    type="text"
                    name={name}
                    placeholder={placeholder}
                    value={formData[name as keyof FormData]}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 rounded border ${
                      errors[name] ? "border-red-500" : "border"
                    }`}
                  />
                  {errors[name] && (
                    <p className="text-red-500 text-sm mt-1">{errors[name]}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Year */}
          {showYearInput && (
            <div className="mb-4">
              <input
                type="text"
                name="year"
                placeholder={year}
                value={formData.year}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded border ${
                  errors.year ? "border-red-500" : "border"
                }`}
              />
              {errors.year && (
                <p className="text-red-500 text-sm mt-1">{errors.year}</p>
              )}
            </div>
          )}

          <div className="flex justify-between gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Submitting..." : insert}
            </button>
            <label className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700 text-center cursor-pointer">
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
