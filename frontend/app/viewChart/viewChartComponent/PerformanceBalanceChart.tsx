import React, { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface PerformanceBalanceChartProps {
  chartData: any[];
  summaryData: { students: { grade: string }[] };
  visibleLines?: Record<string, boolean>;
  getGradeColor?: (grade: string) => string;
  xAxisKey: string; // e.g., "cloCode"
  maxScoreKey?: string; // e.g., "max"
  minScoreKey?: string; // e.g., "min"
  allAvgKey?: string; // e.g., "mean"
  maxScorePosKey: string; // e.g., "maxCloScore"
}

export const PerformanceBalanceChart = ({
  chartData,
  summaryData,
  visibleLines,
  getGradeColor,
  xAxisKey,
  maxScoreKey,
  maxScorePosKey,
  minScoreKey,
  allAvgKey,
}: PerformanceBalanceChartProps) => {
  // Extract unique grades to show individual grade radars if toggled
  const uniqueGrades = useMemo(
    () =>
      Array.from(
        new Set(summaryData?.students?.map((s: { grade: string }) => s.grade)),
      )
        .filter(Boolean)
        .sort(),
    [summaryData],
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey={xAxisKey} // This will now correctly use "cloCode" or "ploCode"
          tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, "auto"]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          }}
        />

        {/* Background Radar: Total Possible Score */}
        <Radar
          name="Total Possible"
          dataKey={maxScorePosKey}
          stroke="#94a3b8"
          fill="#cbd5e1"
          fillOpacity={0.1}
          isAnimationActive={false}
        />

        {/* Dynamic Radars based on Visibility */}
        {visibleLines?.maxScore && maxScoreKey && (
          <Radar
            name="Highest Achieved"
            dataKey={maxScoreKey} // Maps to "max"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.1}
          />
        )}

        {visibleLines?.minScore && minScoreKey && (
          <Radar
            name="Lowest Achieved"
            dataKey={minScoreKey} // Maps to "min"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.1}
          />
        )}

        {visibleLines?.allAvg && allAvgKey && (
          <Radar
            name="Class Average"
            dataKey={allAvgKey} // Maps to "mean"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        )}

        {/* Individual Grade Radars */}
        {uniqueGrades.map(
          (grade: any) =>
            visibleLines?.[`avg_grade_${grade}`] && (
              <Radar
                key={grade}
                name={`Grade ${grade}`}
                dataKey={`avg_grade_${grade}`}
                stroke={getGradeColor?.(grade)}
                fill={getGradeColor?.(grade)}
                fillOpacity={0.4}
                strokeWidth={2}
              />
            ),
        )}

        <Legend verticalAlign="bottom" height={36} iconType="circle" />
      </RadarChart>
    </ResponsiveContainer>
  );
};
