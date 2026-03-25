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
import { useTranslation } from "react-i18next";

interface PerformanceTrendChartProps {
  chartData: any[];
  balanceData?: any; // เปลี่ยนเป็น any เพื่อรับ GradeSummary object
  visibleLines?: Record<string, boolean>;
  getGradeColor?: (grade: string) => string;
  xAxisKey: string;
  maxScoreKey?: string;
  minScoreKey?: string;
  allAvgKey?: string;
  maxScorePosKey: string;
  midScoreKey?: string;
  individualStudentData?: any;
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
  midScoreKey,
  allAvgKey,
  individualStudentData,
}: PerformanceTrendChartProps) => {
  const { t } = useTranslation("common");

  // 1. เตรียมข้อมูลเกรดและคะแนนเฉลี่ยแต่ละด้าน
  const gradeCountData = useMemo(() => {
    if (!balanceData) return [];
    // กรอง 'total' ออก และ Map ข้อมูลเกรด
    return Object.entries(balanceData)
      .filter(([key]) => key !== "total")
      .map(([grade, info]: [string, any]) => ({
        grade: grade,
        averages: info.categoryAverages || {},
      }));
  }, [balanceData]);

  // 2. รวมข้อมูลคะแนนเกรดเข้าไปใน chartData หลัก
  const finalChartData = useMemo(() => {
    if (!chartData) return [];
    return chartData.map((point) => {
      const updatedPoint = { ...point };
      // ดึงชื่อ CLO เช่น "CLO1"
      const currentLabel = String(point[xAxisKey] || "").replace(/\s+/g, "");

      // วนลูปเอาคะแนนจาก gradeCountData (ที่ส่งมาจาก Props balanceData) มาใส่
      balanceData?.forEach((item: any) => {
        const score = item.averages[currentLabel];
        if (score !== undefined) {
          updatedPoint[`avg_grade_${item.grade}`] = Number(score);
        }
      });
      return updatedPoint;
    });
  }, [chartData, balanceData, xAxisKey]);

  const dataMax = useMemo(() => {
    if (!chartData.length) return 100;
    return Math.max(...chartData.map((d) => d[maxScorePosKey] || 0));
  }, [chartData, maxScorePosKey]);

  const isPercent = dataMax === 100;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={finalChartData} // ใช้ข้อมูลที่รวมเกรดแล้ว
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="5 5"
          vertical={false}
          stroke="#e2e8f0"
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
          itemStyle={{ color: "#0f172a" }}
          formatter={(value: number, name: string) => {
            if (isPercent && name === t("fullScore")) return [null, null];
            return [`${Number(value).toFixed(2)}${isPercent ? "%" : ""}`, name];
          }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={50}
          iconType="circle"
          formatter={(value) => (
            <span
              className="font-medium"
              style={{ color: value === t("fullScore") ? "#000" : undefined }}
            >
              {value}
            </span>
          )}
        />
        {/* Full Score Bar */}
        <Bar
          dataKey={maxScorePosKey}
          name={t("fullScore")}
          fill={isPercent ? "#f1f5f9" : "#93e3f5"}
          radius={[6, 6, 0, 0]}
          barSize={300} // ปรับขนาดให้พอดี ไม่ใหญ่เกินไป
          fillOpacity={isPercent ? 1 : 0.8}
        />

        {/* Statistical Lines */}
        {visibleLines?.maxScore && (
          <Line
            type="monotone"
            dataKey={maxScoreKey}
            name={t("maxScore")}
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
            name={t("minScore")}
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
            name={t("averageScore")}
            stroke="#6366f1"
            strokeWidth={4}
            dot={{ r: 6, fill: "#6366f1" }}
          />
        )}
        {visibleLines?.midScore && (
          <Line
            type="monotone"
            name={t("medianScore")}
            dataKey={midScoreKey}
            stroke="#f59e0b"
            strokeDasharray="3 4 5 2"
            dot={false}
            strokeWidth={2}
          />
        )}

        {/* Dynamic Grade Lines */}
        {balanceData?.map((item: any) => {
          const key = `avg_grade_${item.grade}`;
          if (!visibleLines?.[key]) return null;
          return (
            <Line
              key={item.grade}
              dataKey={key}
              name={`Grade ${item.grade}`}
              stroke={getGradeColor?.(item.grade)}
              connectNulls={true}
              strokeWidth={2.5}
            />
          );
        })}

        {/* Individual Student Line */}
        {individualStudentData && (
          <Line
            type="monotone"
            dataKey={(dataPoint) => {
              const currentLabel = (dataPoint[xAxisKey] || "").replace(
                /\s+/g,
                "",
              );
              const scoresArray =
                individualStudentData.ploScores ||
                individualStudentData.ploPercentages ||
                individualStudentData.cloScores ||
                individualStudentData.cloPercentage ||
                individualStudentData.categoryScores ||
                [];

              const target = scoresArray.find(
                (s: any) =>
                  (s.ploCode || s.cloCode || s.category || "").replace(
                    /\s+/g,
                    "",
                  ) === currentLabel,
              );

              return target
                ? Number(
                    target.ploScore ||
                      target.percentage ||
                      target.cloScore ||
                      target.score,
                  )
                : null;
            }}
            name={`คะแนนของ: ${individualStudentData.student_name || "นักเรียน"}`}
            stroke="#0f172a"
            strokeWidth={4}
            connectNulls={true}
            dot={{ r: 6, fill: "#0f172a", stroke: "#fff", strokeWidth: 2 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
