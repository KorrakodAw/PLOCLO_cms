"use client";

import React from "react";

type FieldType = "text" | "email" | "select";

interface FieldConfig<T> {
  label: string;
  key: keyof T;
  type: FieldType;
  options?: string[]; // for select
}

interface FormEditPopupProps<T> {
  title: string;
  data: T;
  fields: FieldConfig<T>[];
  onChange: (updated: T) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function FormEditPopup<T>({
  title,
  data,
  fields,
  onChange,
  onSave,
  onClose,
}: FormEditPopupProps<T>) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        {fields.map((field) => (
          <div key={String(field.key)} className="mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              {field.label}
            </label>

            {/* TEXT / EMAIL INPUT */}
            {(field.type === "text" || field.type === "email") && (
              <input
                type={field.type}
                className="w-full border rounded px-3 py-2"
                value={String(data[field.key] ?? "")}
                onChange={(e) =>
                  onChange({ ...data, [field.key]: e.target.value })
                }
              />
            )}

            {/* SELECT INPUT */}
            {field.type === "select" && (
              <select
                className="w-full border rounded px-3 py-2"
                value={String(data[field.key] ?? "")}
                onChange={(e) =>
                  onChange({ ...data, [field.key]: e.target.value })
                }
              >
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="bg-gray-400 hover:bg-gray-500 cursor-pointer text-white px-3 py-1 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="bg-green-500 hover:bg-green-600 cursor-pointer text-white px-3 py-1 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
