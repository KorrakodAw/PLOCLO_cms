"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";

export function Toast({
  message,
  type = "success",
  visible,
  onClose,
  duration = 10000,
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
      className={`fixed bottom-6 right-6 z-50 max-w-xl w-full rounded-lg shadow-lg border px-4 py-3 flex flex-col gap-2 transition-transform duration-300 transform ${
        type === "success"
          ? "bg-green-50 border-green-300 text-green-800"
          : "bg-red-50 border-red-300 text-red-800"
      } animate-slide-in`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`w-3 h-3 mt-1 rounded-full ${
            type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        />

        <div className="flex-1 text-sm">{message}</div>

        <button
          onClick={onClose}
          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-1 ${
            type === "success" ? "bg-green-500" : "bg-red-500"
          } transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
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
    duration: 10000,
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
      duration = 10000
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
