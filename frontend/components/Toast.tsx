"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid"; // Assuming you use Heroicons

export function Toast({
  message,
  type = "success",
  visible,
  onClose,
  duration = 5000,
  toastKey,
}: {
  message: string;
  type?: "success" | "error";
  visible: boolean;
  onClose: () => void;
  duration?: number;
  toastKey?: number;
}) {
  const [progress, setProgress] = useState(100);

  const durationRef = useRef(duration);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    setProgress(100); // 👈 FIX — reset only when new toast is shown

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percent = Math.max(100 - (elapsed / durationRef.current) * 100, 0);
      setProgress(percent);

      if (percent <= 0) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [toastKey]); // 👈 ONLY runs for a NEW toast

  if (!visible) return null;

  return (
    <div
      // Refined positioning, reduced max-width for less screen intrusion
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-full rounded-xl shadow-2xl border px-4 py-3 flex flex-col transition-transform duration-300 animate-slide-in 
      ${
        type === "success"
          ? "bg-white border-green-200 text-gray-800"
          : "bg-white border-red-200 text-gray-800"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 1. Icon Slot (Replaces the dot) */}
        <div className="flex-shrink-0 pt-0.5">
          {type === "success" ? (
            <CheckCircleIcon
              className="h-6 w-6 text-green-500"
              aria-hidden="true"
            />
          ) : (
            <XCircleIcon className="h-6 w-6 text-red-500" aria-hidden="true" />
          )}
        </div>

        {/* 2. Message Content */}
        <div className="flex-1 mt-0.5 text-sm font-medium leading-relaxed">
          {message}
        </div>

        {/* 3. Close Button */}
        <button
          onClick={onClose}
          className="ml-2 flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors duration-150"
        >
          {/* Using a clear X icon instead of the character ✕ */}
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* 4. Progress Bar (Uncommented and improved styling) */}
      {/* <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mt-2">
        <div
          className={`h-1 rounded-full ${
            type === "success" ? "bg-green-500" : "bg-red-500"
          } transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        ></div>
      </div> */}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
    key: number;
    duration: number;
  }>({
    message: "",
    type: "success",
    visible: false,
    key: 0,
    duration: 5000,
  });

  // refs to avoid adding toast.duration/toast.visible to deps
  const durationRef = useRef(toast.duration);
  const visibleRef = useRef(toast.visible);

  // keep refs updated
  useEffect(() => {
    durationRef.current = toast.duration;
    visibleRef.current = toast.visible;
  }, [toast.duration, toast.visible]);

  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" = "success",
      duration = 5000
    ) => {
      setToast({
        message,
        type,
        visible: true,
        key: Date.now(),
        duration,
      });
    },
    []
  );

  const close = useCallback(() => {
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  // Auto-close timer using refs
  useEffect(() => {
    if (!visibleRef.current) return;

    const timer = window.setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, durationRef.current);

    return () => window.clearTimeout(timer);
  }, [toast.key]);

  const ToastElement = () => (
    <Toast
      message={toast.message}
      type={toast.type}
      visible={toast.visible}
      onClose={close}
      toastKey={toast.key}
      duration={toast.duration}
    />
  );

  return { showToast, ToastElement } as const;
}

export default Toast;
