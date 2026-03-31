import React, { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface QuickActionCardProps {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  colorClass: string;
  loading?: () => void;
}

export default function QuickActionCard({
  href,
  icon,
  title,
  description,
  colorClass,
  loading,
}: QuickActionCardProps) {
  return (
    <Link
      onClick={loading}
      href={href}
      className={`group block p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${colorClass}`}
    >
      <div className="mb-6 w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        {/* Render icon ตรงๆ */}
        {React.cloneElement(icon as React.ReactElement, { size: 32 })}
      </div>

      <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
        {title}
        <ArrowRight
          size={18}
          className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-400"
        />
      </h3>

      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </Link>
  );
}
