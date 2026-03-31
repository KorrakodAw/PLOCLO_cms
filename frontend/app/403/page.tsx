"use client";

import React from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "next-i18next";

export default function ForbiddenPage() {
  const router = useRouter();
  const { t } = useTranslation("common");

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Icon Section */}
        <div className="mb-8 relative inline-block">
          <div className="w-24 h-24 bg-red-100 rounded-[2rem] flex items-center justify-center text-red-500 shadow-xl shadow-red-100/50">
            <ShieldAlert size={48} strokeWidth={1.5} />
          </div>
          {/* Decorative Elements */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full border-4 border-white"></div>
        </div>

        {/* Text Content */}
        <h1 className="text-6xl font-black text-slate-900 mb-4 tracking-tighter">
          403
        </h1>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Access Denied
        </h2>
        <p className="text-slate-500 mb-10 leading-relaxed font-medium">
          You don't have permission to access this page. <br />
          If you believe this is an error, please contact your
          <span className="text-slate-800 font-bold">
            {" "}
            System Administrator
          </span>
          .
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.replace("/")}
            className="flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            <ArrowLeft size={18} />
            Back to Home
          </button>
        </div>

        {/* Footer Info */}
        <p className="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
          Security Policy Restriction
        </p>
      </div>
    </div>
  );
}
