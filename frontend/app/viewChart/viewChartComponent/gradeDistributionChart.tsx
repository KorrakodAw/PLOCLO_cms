import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface GradeDistributionData {
  grade: string;
  count: number;
}

interface GradeDistributionChartProps {
  data: GradeDistributionData[];
}

// Distinct classic pie chart color scheme
const COLORS = [
  "#3b82f6", // Bright Blue
  "#ef4444", // Red
  "#eab308", // Yellow / Gold
  "#10b981", // Green
  "#f97316", // Orange
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
];

// Custom label renderer to display name and percentage directly on the slices
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: any) => {
  if (percent < 0.03) return null; // Hide labels on tiny slices to avoid overlap

  const RADIAN = Math.PI / 180;
  // Position text halfway between center and edge
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold drop-shadow-md select-none"
    >
      {`${name}: ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const GradeDistributionChart = ({
  data,
}: GradeDistributionChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm italic">
        No grade distribution data available
      </div>
    );
  }

  // Filter out 0 count items
  const chartData = data.filter((item) => item.count > 0);

  return (
    <div className="w-full h-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
            formatter={(value: number, name: string) => [
              `${value} Students`,
              `Grade ${name}`,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="square"
            formatter={(value) => (
              <span className="text-slate-700 text-xs font-semibold mr-1">
                Grade {value}
              </span>
            )}
          />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius="85%"
            dataKey="count"
            nameKey="grade"
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
