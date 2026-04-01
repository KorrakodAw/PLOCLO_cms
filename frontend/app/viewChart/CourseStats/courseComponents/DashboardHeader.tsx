import { FaCamera, FaFileExcel } from "react-icons/fa";

export const DashboardHeader = ({ onSaveImage, onExportExcel, title }: any) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <div>
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onSaveImage}
        className="group flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] tracking-wider font-bold rounded-xl shadow-lg shadow-blue-200/50 transition-all duration-300 active:scale-95"
      >
        <FaCamera className="text-sm group-hover:-rotate-12 transition-transform duration-300" />
        <span>SAVE IMAGE</span>
      </button>
      {onExportExcel && (
        <button
          onClick={onExportExcel}
          className="group flex items-center gap-2.5 px-6 py-3 bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white text-[11px] tracking-wider font-bold rounded-xl shadow-sm hover:shadow-emerald-200 transition-all duration-300 active:scale-95"
        >
          <FaFileExcel className="text-sm group-hover:bounce transition-transform duration-300" />
          <span>EXPORT REPORT</span>
        </button>
      )}
    </div>
  </div>
);
