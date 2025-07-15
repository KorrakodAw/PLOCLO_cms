"use client";

export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-gray-500/80">
      <div className="w-16 h-16 mb-4 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      <h1 className="text-white text-lg font-semibold">Loading Data...</h1>
    </div>
  );
}
