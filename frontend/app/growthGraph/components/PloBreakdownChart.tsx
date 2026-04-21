import React, { useState, useMemo, useEffect, act } from "react";
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
  Cell,
} from "recharts";
import { ChevronDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BreakdownItem {
  semester: number;
  year: number;
  rawScore: number;
  termHighestPossible: number;
  contributionPercentage: number;
  termHighestPossiblePercentage: number;
}

interface PloDetail {
  ploCode: string;
  breakdown: BreakdownItem[];
}

export const PloBreakdownChart = ({ data }: { data: PloDetail[] }) => {
  // 1. Sort PLO Buttons by Code (PLO1, PLO2, PLO10...)
  const sortedPloList = useMemo(() => {
    return [...data].sort((a, b) =>
      a.ploCode.localeCompare(b.ploCode, undefined, { numeric: true }),
    );
  }, [data]);

  // 2. State สำหรับเก็บค่าที่เลือก (เริ่มต้นเป็นค่าว่าง)
  const [percentageMode, setPercentageMode] = useState(false);
  const [selectedPlo, setSelectedPlo] = useState("");
  const { t } = useTranslation("common");

  // 🟢 3. บังคับให้ Default กลับไปที่ปุ่มแรกทุกครั้งที่ sortedPloList เปลี่ยนแปลง (Data Update)
  useEffect(() => {
    if (sortedPloList.length > 0) {
      setSelectedPlo(sortedPloList[0].ploCode);
    } else {
      setSelectedPlo("");
    }
  }, [sortedPloList]);

  // 4. เตรียมข้อมูลสำหรับวาดกราฟ
  const chartData = useMemo(() => {
    if (!selectedPlo) return [];

    const currentPlo = data.find((p) => p.ploCode === selectedPlo);
    if (!currentPlo) return [];

    return [...currentPlo.breakdown]
      .sort((a, b) =>
        a.year !== b.year ? a.year - b.year : a.semester - b.semester,
      )
      .map((item) => ({
        name: `${item.semester}/${item.year}`,
        actual: item.rawScore,
        actualPercentage: item.contributionPercentage,
        targetPercentage: item.termHighestPossiblePercentage,
        target: item.termHighestPossible,
      }));
  }, [data, selectedPlo]);

 

  if (data.length === 0)
    return (
      <div className="text-center text-slate-400 py-20">
        {t("No PLO achievement data available.")}
      </div>
    );

  return (
    <div className="bg-white p-8  rounded-[32px]  mt-8 transition-all ">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        {/* Header Info */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100 shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {t("PLO Semester Growth")}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5 font-medium uppercase tracking-wider">
              {t("Line: Actual Score | Bar: Term Potential")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* 🟢 Refined Segmented Control (Toggle) */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setPercentageMode(false)}
              className={`relative px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                !percentageMode
                  ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Raw
            </button>
            <button
              onClick={() => setPercentageMode(true)}
              className={`relative px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                percentageMode
                  ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Percent
            </button>
          </div>

          {/* 🟢 Enhanced PLO Selector Dropdown */}
          <div className="relative min-w-[180px] group">
            <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-black text-indigo-500 uppercase tracking-tighter z-10">
              Program Outcome
            </label>
            <select
              value={selectedPlo}
              onChange={(e) => setSelectedPlo(e.target.value)}
              className="w-full appearance-none bg-white border-2 border-slate-100 text-slate-700 py-2.5 px-4 pr-10 rounded-2xl text-sm font-bold group-hover:border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
            >
              {sortedPloList.map((plo) => (
                <option key={plo.ploCode} value={plo.ploCode}>
                  {plo.ploCode}
                </option>
              ))}
            </select>

            {/* Custom Animated Arrow Icon */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 group-hover:text-indigo-500 transition-colors">
              <ChevronDown size={18} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 Composed Chart Section */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
              dy={10}
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

            <Bar
              dataKey={percentageMode ? "targetPercentage" : "target"}
              name={
                percentageMode ? "Term Potential (%)" : "Term Highest Possible"
              }
              radius={[8, 8, 8, 8]}
              barSize={300} // ปรับขนาดให้พอดี ไม่บังกัน
              fill="#3e2a85"
            >
              {sortedPloList.map((entry, index) => {
                const opacity = 0.4 + (index / sortedPloList.length) * 0.4;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill="#3e2a85"
                    fillOpacity={opacity}
                  />
                );
              })}
            </Bar>

            <Line
              type="monotone"
              dataKey={percentageMode ? "actualPercentage" : "actual"}
              name={percentageMode ? "Actual Score (%)" : "Actual Score"}
              stroke="#6366f1"
              strokeWidth={4}
              dot={{ r: 6, fill: "#6366f1", strokeWidth: 3, stroke: "#fff" }}
              activeDot={{ r: 10, strokeWidth: 0 }}
              animationDuration={1200}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
        <span className="text-[14px] text-slate-400 font-black uppercase tracking-[0.2em]">
          Analysis Mode: <span className="text-indigo-600">{selectedPlo}</span>
        </span>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-slate-200 rounded-full" />
            <span className="text-[14px] font-bold text-slate-400 uppercase">
              Potential
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-indigo-500 rounded-full" />
            <span className="text-[14px] font-bold text-slate-400 uppercase">
              Actual Score
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
