import React from "react";

interface GradeFilterGroupProps {
  uniqueGrades: string[];
  visibleLines: Record<string, boolean>;
  setVisibleLines: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  getGradeColor: (grade: string) => string;
}

export const GradeFilterGroup = ({
  uniqueGrades,
  visibleLines,
  setVisibleLines,
  getGradeColor,
}: GradeFilterGroupProps) => {
  const handleToggle = (grade: string) => {
    const key = `avg_grade_${grade}`;
    setVisibleLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleClearAll = () => {
    setVisibleLines((prev) => {
      const newState = { ...prev };
      uniqueGrades.forEach((g) => delete newState[`avg_grade_${g}`]);
      return newState;
    });
  };

  const hasActiveFilter = uniqueGrades.some(
    (g) => visibleLines[`avg_grade_${g}`],
  );

  if (uniqueGrades.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-6 p-2 bg-slate-50/50 rounded-xl border border-slate-100/50">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 border-r border-slate-200 mr-1">
        Grade Filters
      </span>

      <div className="flex flex-wrap gap-2">
        {uniqueGrades.map((grade) => {
          const isActive = !!visibleLines[`avg_grade_${grade}`];
          const gradeColor = getGradeColor(grade);

          return (
            <button
              key={grade}
              onClick={() => handleToggle(grade)}
              className={`
                relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200
                border-2 flex items-center gap-2
                ${
                  isActive
                    ? "bg-white shadow-sm scale-105"
                    : "bg-transparent text-slate-400 border-transparent hover:bg-slate-100 opacity-80"
                }
              `}
              style={{
                borderColor: isActive ? gradeColor : undefined,
                color: isActive ? gradeColor : undefined,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: gradeColor }}
              />
              Grade {grade}
            </button>
          );
        })}
      </div>

      {hasActiveFilter && (
        <button
          onClick={handleClearAll}
          className="ml-auto px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center gap-1.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          Reset
        </button>
      )}
    </div>
  );
};
