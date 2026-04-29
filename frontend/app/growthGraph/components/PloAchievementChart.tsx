import React, { useState, useMemo, useEffect } from "react";
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
import { useTranslation } from "next-i18next";

interface PloStat {
  ploCode: string;
  totalHighest: number;
  totalHighestPercentage: number;
  ploAchievementRaw: number;
  ploAchievementPercentage: number;
}

interface CumulativePloStat {
  ploCode: string;
  percentageStats: {
    highest: number;
    lowest: number;
    mean: number;
    median: number;
  };
  rawStats: {
    highest: number;
    lowest: number;
    mean: number;
    median: number;
  };
}

export const PloAchievementChart = ({
  data,
  cumulativeData,
}: {
  data: PloStat[];
  cumulativeData: CumulativePloStat[];
}) => {
  const [isPercentage, setIsPercentage] = useState(false);
  const { t } = useTranslation("common");

  // เก็บสถานะการแสดงผลของแต่ละเส้น (เริ่มต้นให้เป็น true ทั้งหมด)
  const [visibleLines, setVisibleLines] = useState({
    mean: true,
    highest: true,
    lowest: true,
    median: true,
  });

  // ฟังก์ชันสำหรับสลับสถานะ
  const toggleLine = (key: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  // ภายใน PloAchievementChart Component
  const cumulativeMap = useMemo(() => {
    return cumulativeData.reduce(
      (acc, curr) => {
        acc[curr.ploCode] = curr;
        return acc;
      },
      {} as Record<string, CumulativePloStat>,
    );
  }, [cumulativeData]);

  useEffect(() => {
    console.log(cumulativeData);
  });

  if (data.length === 0)
    return (
      <div className="text-center text-slate-400 py-20">
        {t("No PLO achievement data available.")}
      </div>
    ); // หรือแสดงข้อความว่าไม่มีข้อมูล

  return (
    <div className="bg-white p-8 rounded-[32px] mt-8">
      {/* TOP SECTION: Title & Main Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex-1">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <ChartBar size={22} />
            </div>
            {t("PLO Achievement")}
          </h2>
          <p className="text-sm text-slate-400 mt-1.5 font-medium leading-relaxed">
            {t(
              "Analyze student performance across all Program Learning Outcomes",
            )}
          </p>
        </div>

        {/* Unit Switcher (RAW/PERCENT) - ย้ายมาขวาสุดให้ดูเป็น Global Toggle */}
        <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 w-fit">
          {[
            { val: false, label: "RAW", icon: Hash },
            { val: true, label: "PERCENT", icon: Percent },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={() => setIsPercentage(btn.val)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[11px] font-black transition-all duration-300 ${
                isPercentage === btn.val
                  ? "bg-white shadow-sm text-indigo-600"
                  : "text-slate-400 hover:text-slate-500"
              }`}
            >
              <btn.icon size={13} strokeWidth={3} />
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* FILTER SECTION: Line Toggles - แยกออกมาเป็นแถวใหม่เพื่อความสะดวกในการกด */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 pt-6 border-t border-slate-50">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {t("Benchmark Filters")}:
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            {
              key: "highest",
              label: "Max Score",
              color: "#dc2626",
              bg: "bg-red-50",
            },
            {
              key: "mean",
              label: "Average",
              color: "#16a34a",
              bg: "bg-green-50",
            },
            {
              key: "median",
              label: "Median",
              color: "#2563eb",
              bg: "bg-blue-50",
            },
            {
              key: "lowest",
              label: "Min Score",
              color: "#f59e0b",
              bg: "bg-amber-50",
            },
          ].map((item) => {
            const isActive =
              visibleLines[item.key as keyof typeof visibleLines];
            return (
              <button
                key={item.key}
                onClick={() =>
                  toggleLine(item.key as keyof typeof visibleLines)
                }
                className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 border-2 ${
                  isActive
                    ? `${item.bg} border-transparent`
                    : "bg-transparent border-slate-100 text-slate-300 hover:border-slate-200"
                }`}
                style={{ color: isActive ? item.color : undefined }}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-transform ${isActive ? "scale-110" : "scale-100 bg-slate-200"}`}
                  style={{ backgroundColor: isActive ? item.color : undefined }}
                />
                {item.label}
              </button>
            );
          })}
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
              name="Max PLO Score"
              fill="#c65c2a"
              radius={[10, 10, 10, 10]}
              barSize={300}
            >
              {sortedData.map((entry, index) => {
                const opacity = 0.5 + (index / sortedData.length) * 0.6;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill="#d40606"
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

            {/* Average Line */}
            <Line
              hide={!visibleLines.mean} // <--- เพิ่มตรงนี้
              type="monotone"
              dataKey={(entry) => {
                const stat = cumulativeMap[entry.ploCode];
                if (!stat) return null;
                return isPercentage
                  ? stat.percentageStats?.mean
                  : stat.rawStats?.mean;
              }}
              name="Cumulative Average"
              stroke="#16a34a"
              strokeWidth={3}
              dot={{ r: 4, fill: "#16a34a" }}
              strokeDasharray="5 5"
            />

            {/* Highest Line */}
            <Line
              hide={!visibleLines.highest} // <--- เพิ่มตรงนี้
              type="monotone"
              dataKey={(entry) => {
                const stat = cumulativeMap[entry.ploCode];
                if (!stat) return null;
                return isPercentage
                  ? stat.percentageStats?.highest
                  : stat.rawStats?.highest;
              }}
              name="Cumulative Highest"
              stroke="#2b0363"
              strokeWidth={3}
              dot={{ r: 4, fill: "#2b0363" }}
              strokeDasharray="5 5"
            />

            {/* Lowest Line */}
            <Line
              hide={!visibleLines.lowest} // <--- เพิ่มตรงนี้
              type="monotone"
              dataKey={(entry) => {
                const stat = cumulativeMap[entry.ploCode];
                if (!stat) return null;
                return isPercentage
                  ? stat.percentageStats?.lowest
                  : stat.rawStats?.lowest;
              }}
              name="Cumulative Lowest"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 4, fill: "#f59e0b" }}
              strokeDasharray="5 5"
            />

            {/* Median Line */}
            <Line
              hide={!visibleLines.median} // <--- เพิ่มตรงนี้
              type="monotone"
              dataKey={(entry) => {
                const stat = cumulativeMap[entry.ploCode];
                if (!stat) return null;
                return isPercentage
                  ? stat.percentageStats?.median
                  : stat.rawStats?.median;
              }}
              name="Cumulative Median"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, fill: "#2563eb" }}
              strokeDasharray="5 5"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
