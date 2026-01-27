import React from 'react';
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
} from 'recharts';

interface PerformanceTrendChartProps {
  chartData: any[];
  summaryData: any;
  visibleLines: Record<string, boolean>;
  getGradeColor: (grade: string) => string;
}

export const PerformanceTrendChart = ({
  chartData,
  summaryData,
  visibleLines,
  getGradeColor,
}: PerformanceTrendChartProps) => {
  // Extract unique grades for mapping
  const uniqueGrades = React.useMemo(() => {
    return Array.from(
      new Set(summaryData?.students?.map((s: any) => s.grade))
    ) as string[];
  }, [summaryData]);

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
          dataKey="name"
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
          dataKey="fullScore"
          name="Max Possible"
          fill="#93e3f5"
          radius={[6, 6, 0, 0]}
          barSize={300} // Adjusted from 400 for better visibility
        />

        {/* Global Reference Lines */}
        {visibleLines.maxScore && (
          <Line
            type="monotone"
            dataKey="maxScore"
            name="Highest"
            stroke="#22c55e"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={2}
          />
        )}
        {visibleLines.minScore && (
          <Line
            type="monotone"
            dataKey="minScore"
            name="Lowest"
            stroke="#ef4444"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={2}
          />
        )}
        {visibleLines.allAvg && (
          <Line
            type="monotone"
            dataKey="allAvg"
            name="Class Avg"
            stroke="#6366f1"
            strokeWidth={4}
            dot={{ r: 6, fill: "#6366f1" }}
          />
        )}

        {/* Dynamic Grade Lines */}
        {uniqueGrades.map((grade) =>
          visibleLines[`avg_grade_${grade}`] && (
            <Line
              key={grade}
              type="monotone"
              dataKey={`avg_grade_${grade}`}
              name={`Grade ${grade}`}
              stroke={getGradeColor(grade)}
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          )
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};