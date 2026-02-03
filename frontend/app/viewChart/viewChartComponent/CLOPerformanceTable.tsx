import React from "react";
import { FaBullseye } from "react-icons/fa";

interface CategoryChartDataProps {
  name: string;
  [key: string]: number | string;
}


interface CLOPerformanceTableProps {
  summaryData: { students: { grade: string }[] };
  cloAveragesByGrade: CategoryChartDataProps[];
  getGradeColor: (grade: string) => string;
}

export const CLOPerformanceTable = ({
  summaryData,
  cloAveragesByGrade,
  getGradeColor,
}: CLOPerformanceTableProps) => {
  const uniqueGrades = React.useMemo(() => {
    return Array.from(new Set(summaryData?.students?.map((s: {grade: string;}) => s.grade)))
      .filter(Boolean)
      .sort() as string[];
  }, [summaryData]);

  const cloNames = React.useMemo(
    () => cloAveragesByGrade.map((item) => item.name),
    [cloAveragesByGrade],
  );

  if (!summaryData || cloAveragesByGrade.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 bg-slate-50/30">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <FaBullseye className="text-blue-500" /> CLO Achievement by Grade
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase border-b">
                Grade Level
              </th>
              {cloNames.map((clo) => (
                <th
                  key={clo}
                  className="p-4 text-xs font-semibold text-slate-500 uppercase border-b text-center"
                >
                  {clo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueGrades.map((grade) => (
              <tr key={grade} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 border-b border-slate-100 font-bold">
                  <span
                    className="px-2 py-1 rounded text-white text-xs"
                    style={{ backgroundColor: getGradeColor(grade) }}
                  >
                    Grade {grade}
                  </span>
                </td>
                {cloAveragesByGrade.map((cloRow) => {
                  const score = cloRow[`avg_grade_${grade}`] || 0;
                  return (
                    <td
                      key={cloRow.name}
                      className="p-4 border-b border-slate-100 text-center"
                    >
                      <span
                        className={`text-sm font-mono font-semibold ${Number(score) >= 80 ? "text-emerald-600" : Number(score) >= 50 ? "text-amber-600" : "text-red-600"}`}
                      >
                        {score}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CLOPerformanceTable;