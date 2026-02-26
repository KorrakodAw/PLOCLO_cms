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
  balanceData?: any[];
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
  balanceData,
  visibleLines,
  getGradeColor,
  xAxisKey,
  maxScoreKey,
  maxScorePosKey,
  minScoreKey,
  allAvgKey,
}: PerformanceTrendChartProps) => {
  // Extract unique grades to show individual grade radars if toggled
  // 1. ดึงเกรดที่มีอยู่จริงจาก balanceData
  const uniqueGrades = useMemo(() => {
    if (!balanceData) return [];
    return balanceData.map((d) => d.grade);
  }, [balanceData]);

  // 2. รวมข้อมูลเพื่อให้ Radar ของเกรดแสดงผลบนแกนเดียวกับภาพรวม
  // เราจะนำค่าเฉลี่ยของแต่ละเกรดไปใส่ใน chartData เพื่อให้ Recharts วาดได้
  const finalChartData = useMemo(() => {
    return chartData.map((point) => {
      const updatedPoint = { ...point };

      uniqueGrades.forEach((grade) => {
        const gradeInfo = balanceData?.find((d) => d.grade === grade);
        // ค้นหาค่าคะแนนจาก ploScores, cloScores หรือ assignmentScores
        const scoreEntry =
          gradeInfo?.ploScores?.find((p: any) => p.label === point[xAxisKey]) ||
          gradeInfo?.cloScores?.find((c: any) => c.label === point[xAxisKey]) ||
          gradeInfo?.assignmentScores?.find(
            (a: any) => a.label === point[xAxisKey],
          );

        if (scoreEntry) {
          updatedPoint[`avg_grade_${grade}`] = scoreEntry.value;
        }
      });

      return updatedPoint;
    });
  }, [chartData, balanceData, uniqueGrades, xAxisKey]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={finalChartData}
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
          formatter={(value: number) => value.toFixed(2)}
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
          (grade) =>
            visibleLines?.[`avg_grade_${grade}`] && (
              <Line
                key={grade}
                name={`Grade ${grade}`}
                dataKey={`avg_grade_${grade}`}
                stroke={getGradeColor?.(grade)}
                fill={getGradeColor?.(grade)}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ),
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
