import React, { useMemo } from "react";
import {
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  ResponsiveContainer,
} from "recharts";

interface PerformanceTrendChartProps {
  chartData: any[];
  visibleLines?: Record<string, boolean>;
  getGradeColor?: (grade: string) => string;
  xAxisKey: string;
  maxScoreKey?: string;
  minScoreKey?: string;
  allAvgKey?: string;
  maxScorePosKey: string;
}

export const PerformanceTrendChart = ({
  chartData,
  visibleLines,
  getGradeColor,
  xAxisKey,
  maxScoreKey,
  maxScorePosKey,
  minScoreKey,
  allAvgKey,
}: PerformanceTrendChartProps) => {
  const uniqueGrades = useMemo(() => {
    if (chartData.length === 0) return [];

    // 1. Get all keys from the first data object (e.g., "cloCode", "avg_grade_A", etc.)
    const keys = Object.keys(chartData[0]);

    // 2. Filter for keys that start with 'avg_grade_' and extract the grade name
    return keys
      .filter((key) => key.startsWith("avg_grade_"))
      .map((key) => key.replace("avg_grade_", ""))
      .sort(); // Sorts them as A, B, C, F
  }, [chartData]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={chartData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f1f5f9"
        />
        <XAxis
          dataKey={xAxisKey}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#64748b" }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#64748b" }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          }}
          cursor={{ fill: "#f8fafc" }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={40}
          iconType="circle"
        />
        <Bar
          dataKey={maxScorePosKey}
          name="Max Possible"
          fill="#93e3f5"
          radius={[6, 6, 0, 0]}
          barSize={300}
        />
        {visibleLines?.maxScore && (
          <Line
            type="monotone"
            dataKey={maxScoreKey}
            stroke="#22c55e"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={2}
          />
        )}
        {visibleLines?.minScore && (
          <Line
            type="monotone"
            dataKey={minScoreKey}
            stroke="#ef4444"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={2}
          />
        )}
        {visibleLines?.allAvg && (
          <Line
            type="monotone"
            dataKey={allAvgKey}
            stroke="#6366f1"
            strokeWidth={4}
            dot={{ r: 6, fill: "#6366f1" }}
          />
        )}
        {uniqueGrades.map(
          (grade: any) =>
            visibleLines?.[`avg_grade_${grade}`] && (
              <Line
                key={grade}
                type="monotone"
                dataKey={`avg_grade_${grade}`}
                name={`Grade ${grade}`}
                stroke={getGradeColor ? getGradeColor(grade) : undefined}
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            ),
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
