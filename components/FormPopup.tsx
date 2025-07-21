"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface FormPopupProps {
  onClose: () => void;
  placeholderText: {
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

export default function FormPopup({
  onClose,
  placeholderText,
  submitButtonText = {},
}: FormPopupProps) {
  const {
    code = "Course Code",
    nameEn = "Course Name (EN)",
    nameTh = "Course Name (TH)",
    abbrEn = "Abbreviation EN",
    abbrTh = "Abbreviation TH",
    year = "Year",
  } = placeholderText;

  const { insert = "Insert", upload = "Upload" } = submitButtonText;

  const [formData, setFormData] = useState({
    code: "",
    nameEn: "",
    nameTh: "",
    abbrEn: "",
    abbrTh: "",
    year: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" }); // clear error on typing
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors[key] = "This field is required.";
      }
    });
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    } else {
      console.log("Form submitted:", formData);
      onClose();
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
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold">Add Program</h3>
          <X
            onClick={onClose}
            className="text-gray-600 hover:text-black cursor-pointer"
          />
        </div>

        <form onSubmit={handleSubmit} noValidate>
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
                value={formData[name as keyof typeof formData]}
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

          {/* Abbreviation inputs */}
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
                  value={formData[name as keyof typeof formData]}
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

          {/* Year input */}
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

          <div className="flex justify-between gap-2">
            <button
              type="submit"
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
  );
}
