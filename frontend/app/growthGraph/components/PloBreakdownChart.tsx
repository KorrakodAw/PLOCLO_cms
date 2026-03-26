import React, { useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Layers, Calendar, TrendingUp } from "lucide-react";

interface BreakdownItem {
  semester: number;
  year: number;
  rawScore: number;
  termHighestPossible: number;
}

interface PloDetail {
  ploCode: string;
  breakdown: BreakdownItem[];
}

export const PloBreakdownChart = ({ data }: { data: PloDetail[] }) => {
  // 1. Sort PLO Buttons by Code (เช่น PLO1, PLO2, PLO10)
  const sortedPloList = useMemo(() => {
    return [...data].sort((a, b) =>
      a.ploCode.localeCompare(b.ploCode, undefined, { numeric: true }),
    );
  }, [data]);

  const [selectedPlo, setSelectedPlo] = useState(
    sortedPloList[0]?.ploCode || "",
  );

  // 2. Prepare & Sort Chart Data by Year/Semester
  const chartData = useMemo(() => {
    const currentPlo = data.find((p) => p.ploCode === selectedPlo);
    if (!currentPlo) return [];

    return [...currentPlo.breakdown]
      .sort((a, b) =>
        a.year !== b.year ? a.year - b.year : a.semester - b.semester,
      )
      .map((item) => ({
        name: `${item.semester}/${item.year}`,
        actual: item.rawScore,
        target: item.termHighestPossible,
      }));
  }, [data, selectedPlo]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm w-full">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500 rounded-xl text-white shadow-md shadow-indigo-100">
                <TrendingUp size={20} />
              </div>
              PLO Semester Growth
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Line: Actual Score | Bar: Term Potential
            </p>
          </div>
        </div>

        {/* 🟢 Sorted PLO Selector Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50/80 rounded-2xl border border-slate-100">
          {sortedPloList.map((plo) => (
            <button
              key={plo.ploCode}
              onClick={() => setSelectedPlo(plo.ploCode)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                selectedPlo === plo.ploCode
                  ? "bg-white shadow-md text-indigo-600 border border-slate-200 ring-2 ring-indigo-500/5"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
            >
              {plo.ploCode}
            </button>
          ))}
        </div>
      </div>

      {/* 🟢 Composed Chart Section */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="12 12"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 13, fontWeight: 800 }}
              dy={15}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#cbd5e1", fontSize: 11, fontWeight: 600 }}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc", radius: 12 }}
              contentStyle={{
                borderRadius: "20px",
                border: "none",
                boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                padding: "16px",
              }}
              itemStyle={{ color: "#0f172a" }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{
                paddingBottom: "30px",
                fontSize: "11px",
                fontWeight: "900",
                textTransform: "uppercase",
              }}
            />

            {/* 🟢 Bar: Term Highest Possible (เป็นพื้นหลัง) */}
            <Bar
              dataKey="target"
              name="Term Max Potential"
              fill="#f1f5f9"
              radius={[12, 12, 12, 12]}
              barSize={50}
            />

            {/* 🟢 Line: Raw Score (เส้นการเติบโต) */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Student Raw Score"
              stroke="#6366f1"
              strokeWidth={4}
              dot={{ r: 6, fill: "#6366f1", strokeWidth: 3, stroke: "#fff" }}
              activeDot={{ r: 10, strokeWidth: 0 }}
              animationDuration={1200}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
          Breakdown Active: {selectedPlo}
        </span>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-slate-200 rounded-full" />
            <span className="text-[10px] font-bold text-slate-400">
              Potential
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-indigo-500 rounded-full" />
            <span className="text-[10px] font-bold text-slate-400">Actual</span>
          </div>
        </div>
      </div>
    </div>
  );
};
