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

export const PerformanceBalanceChart = ({
  chartData,
  summaryData,
  visibleLines,
  getGradeColor,
}: any) => {
  const uniqueGrades = useMemo(
    () =>
      Array.from(new Set(summaryData?.students?.map((s: any) => s.grade)))
        .filter(Boolean)
        .sort(),
    [summaryData],
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey="name"
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
        <Radar
          name="Total Possible"
          dataKey="fullScore"
          stroke="#71ddf5"
          fill="#b3effc"
          fillOpacity={0.3}
          isAnimationActive={false}
        />
        {visibleLines.maxScore && (
          <Radar
            name="Highest Achieved"
            dataKey="maxScore"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.1}
          />
        )}
        {visibleLines.allAvg && (
          <Radar
            name="Class Average"
            dataKey="allAvg"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.2}
          />
        )}
        {uniqueGrades.map(
          (grade: any) =>
            visibleLines[`avg_grade_${grade}`] && (
              <Radar
                key={grade}
                name={`Grade ${grade}`}
                dataKey={`avg_grade_${grade}`}
                stroke={getGradeColor(grade)}
                fill={getGradeColor(grade)}
                fillOpacity={0.4}
                strokeWidth={3}
              />
            ),
        )}
        <Legend verticalAlign="bottom" height={36} />
      </RadarChart>
    </ResponsiveContainer>
  );
};
