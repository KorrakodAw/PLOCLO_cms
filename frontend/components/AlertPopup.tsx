"use client";

import React from "react";
// Assuming you have access to Heroicons or similar SVG icons
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/20/solid";

interface AlertPopupProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "info" | "confirm" | "error" | "success";
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function AlertPopup({
  isOpen,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  type = "info",
  onConfirm,
  onCancel,
}: AlertPopupProps) {
  // --- Utility Functions for Dynamic Styling ---
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleIcon className="h-10 w-10 text-green-500" />;
      case "error":
        return <ExclamationCircleIcon className="h-10 w-10 text-red-500" />;
      case "confirm":
        return <ExclamationCircleIcon className="h-10 w-10 text-yellow-500" />;
      case "info":
      default:
        return <InformationCircleIcon className="h-10 w-10 text-blue-500" />;
    }
  };

  const getButtonClasses = (isPrimary: boolean) => {
    if (!isPrimary) {
      // Secondary/Cancel Button Style
      return "bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded-lg transition-colors duration-150";
    }

    // Primary/Confirm Button Style based on type
    switch (type) {
      case "success":
        return "bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-150";
      case "error":
      case "confirm":
        return "bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-150";
      case "info":
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-150";
    }
  };
  // ---------------------------------------------

  if (!isOpen) return null;

  return (
    // 1. Fixed Overlay (Removed Framer Motion)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onCancel}
    >
      {/* 2. Modal Content Container (Removed Framer Motion) */}
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center">
          {/* ICON */}
          <div className="mb-4">{getIcon()}</div>

          {/* TITLE */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {title || (type === "confirm" ? "Confirm Action" : "Notice")}
          </h2>

          {/* MESSAGE */}
          <p className="text-gray-600 text-center mb-6 text-[16px]">
            {message}
          </p>

          {/* BUTTONS */}
          <div className="flex justify-center gap-3 w-full">
            {/* Secondary/Cancel Button (Only for confirm type or if explicit cancel handler is given) */}
            {(type === "confirm" || onCancel) && (
              <button className={getButtonClasses(false)} onClick={onCancel}>
                {cancelText}
              </button>
            )}

            {/* Primary/Confirm Button */}
            <button className={getButtonClasses(true)} onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
