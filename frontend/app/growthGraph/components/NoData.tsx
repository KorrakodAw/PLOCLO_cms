import { Search, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export const NoData = () => {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center rounded-3xl mt-4">
      {/* Visual Indicator */}
      <div className="relative mb-6">
        <div className="absolute -inset-4 bg-indigo-50 rounded-full animate-pulse" />
        <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-indigo-500">
          <TrendingUp size={48} strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md border border-slate-100 text-slate-400">
          <Search size={16} />
        </div>
      </div>

      {/* Text Content */}
      <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
        {t("Growth Analytics")}
      </h1>
      <p className="text-slate-500 max-w-[280px] leading-relaxed font-medium">
        {t("Select a program from the menu above to visualize its performance and growth trends.")}
      </p>

      {/* Decorative Elements */}
      <div className="mt-8 flex gap-2">
        <div className="w-8 h-1 bg-slate-100 rounded-full" />
        <div className="w-16 h-1 bg-indigo-500/20 rounded-full" />
        <div className="w-8 h-1 bg-slate-100 rounded-full" />
      </div>
    </div>
  );
};
