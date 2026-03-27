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
  Cell,
} from "recharts";
import { Percent, Hash, ChartBar } from "lucide-react";

interface PloStat {
  ploCode: string;
  totalHighest: number;
  totalHighestPercentage: number;
  ploAchievementRaw: number;
  ploAchievementPercentage: number;
}

export const PloAchievementChart = ({ data }: { data: PloStat[] }) => {
  const [isPercentage, setIsPercentage] = useState(false);

  // 1. Sort Data ตาม ploCode (เช่น PLO1, PLO2, PLO10)
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      // ใช้ localeCompare พร้อม numeric: true เพื่อให้เรียง 1, 2, 10 ได้ถูกต้อง
      return a.ploCode.localeCompare(b.ploCode, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [data]);

  const barKey = isPercentage ? "totalHighestPercentage" : "totalHighest";
  const lineKey = isPercentage
    ? "ploAchievementPercentage"
    : "ploAchievementRaw";
  const unit = isPercentage ? "%" : "";

  if (data.length === 0)
    return (
      <div className="text-center text-slate-400 py-20">
        No PLO achievement data available.
      </div>
    ); // หรือแสดงข้อความว่าไม่มีข้อมูล

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <ChartBar size={22} />
            </div>
            PLO Achievement
          </h2>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            Analyze student performance across all Program Learning Outcomes
          </p>
        </div>

        {/* Unit Toggle */}
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50">
          <button
            onClick={() => setIsPercentage(false)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              !isPercentage
                ? "bg-white shadow-md text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Hash size={14} strokeWidth={3} />
            RAW
          </button>
          <button
            onClick={() => setIsPercentage(true)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              isPercentage
                ? "bg-white shadow-md text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Percent size={14} strokeWidth={3} />
            PERCENT
          </button>
        </div>
      </div>

      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={sortedData}
            margin={{ top: 10, right: 10, bottom: 10, left: -15 }}
          >
            <CartesianGrid
              strokeDasharray="8 8"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="ploCode"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 13, fontWeight: 800 }}
              dy={15}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#cbd5e1", fontSize: 11, fontWeight: 600 }}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip
              cursor={{ fill: "#f1f5f9", radius: 12 }}
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
                fontSize: "12px",
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            />

            {/* Bar: Total Highest (พื้นหลังสีอ่อน) */}
            <Bar
              dataKey={barKey}
              name="Target Score"
              fill="#f1f5f9"
              radius={[10, 10, 10, 10]}
              barSize={300}
            >
              {sortedData.map((entry, index) => {
                const opacity = 0.5 + (index / sortedData.length) * 0.4;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill="#c65c2a"
                    fillOpacity={opacity}
                  />
                );
              })}
            </Bar>

            {/* Line: Achievement (เส้นหลัก) */}
            <Line
              type="monotone"
              dataKey={lineKey}
              name="Student Achievement"
              stroke="#4f46e5"
              strokeWidth={4}
              dot={{ r: 6, fill: "#4f46e5", strokeWidth: 3, stroke: "#fff" }}
              activeDot={{ r: 10, strokeWidth: 0, fill: "#4f46e5" }}
              animationDuration={1500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
