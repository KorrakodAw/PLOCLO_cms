"use client";

import { motion, AnimatePresence } from "framer-motion";
import React from "react";

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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="bg-white rounded-xl shadow-lg p-6 w-80 text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-3">
              {title || (type === "confirm" ? "Confirm" : "Alert")}
            </h2>
            <p className="text-gray-700 mb-6">{message}</p>

            <div className="flex justify-center gap-3">
              {type === "confirm" && (
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded"
                  onClick={onCancel}
                >
                  {cancelText}
                </button>
              )}
              <button
                className={`px-3 py-1 rounded text-white ${
                  type === "error"
                    ? "bg-red-500 hover:bg-red-600"
                    : type === "success"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
