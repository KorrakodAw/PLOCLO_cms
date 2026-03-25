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
  balanceData?: any[];
  visibleLines?: Record<string, boolean>;
  getGradeColor?: (grade: string) => string;
  xAxisKey: string;
  maxScoreKey?: string;
  minScoreKey?: string;
  allAvgKey?: string;
  maxScorePosKey: string;
  midScoreKey?: string;
  individualStudentData?: any[];
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
  // Extract unique grades to show individual grade radars if toggled
  const { t } = useTranslation("common");
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

  const dataMax = useMemo(() => {
    if (!finalChartData.length) return 100;
    return Math.max(...finalChartData.map((d) => d[maxScorePosKey] || 0));
  }, [finalChartData, maxScorePosKey]);

  const isPercent = dataMax === 100;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={finalChartData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="5 5"
          vertical={false}
          stroke="#e2e8f0"
          // strokeOpacity={0.9}
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
            // 🟢 ถ้าเป็นโหมด Percent และชื่อคือ Full Score ให้ซ่อน (return null)
            if (isPercent && name === t("fullScore")) {
              return [null, null];
            }

            // ข้อมูลปกติที่ต้องการแสดง
            return [`${value.toFixed(2)}${isPercent ? "%" : ""}`, name];
          }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={50}
          iconType="circle"
          formatter={(value) => {
            // 🟢 ถ้าชื่อตรงกับ "Full Score" (หรือค่าที่ t("fullScore") คืนมา) ให้เป็นสีดำ
            // ถ้าไม่ใช่ ให้ปล่อยเป็นสีปกติของ Recharts
            const isFullScore = value === t("fullScore");

            return (
              <span
                className={
                  isFullScore ? "text-black font-medium" : "font-medium"
                }
                style={{ color: isFullScore ? "#000000" : undefined }}
              >
                {value}
              </span>
            );
          }}
        />
        <Bar
          dataKey={maxScorePosKey}
          name={t("fullScore")}
          fill={isPercent ? "#f1f5f9" : "#93e3f5"}
          radius={[6, 6, 0, 0]}
          barSize={isPercent ? 300 : 300}
          fillOpacity={isPercent ? 1 : 0.8}
        />
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
        {individualStudentData && (
          <Line
            type="monotone"
            // 🛠️ Refactor: ใช้ Helper Function เพื่อความสะอาด
            dataKey={(dataPoint) => {
              const currentLabel = dataPoint[xAxisKey];

              // 1. รวมทุก Array ที่อาจจะมีข้อมูลเข้าด้วยกัน (Flat search)
              // ใช้ Optional Chaining (?.) เพื่อป้องกัน Error กรณี Property ไม่มีอยู่จริง
              const allScores = [
                ...(individualStudentData.ploScores || []),
                ...(individualStudentData.ploPercentages || []),
                ...(individualStudentData.cloScores || []),
                ...(individualStudentData.cloPercentages || []),
                ...(individualStudentData.categoryScores || []),
                ...(individualStudentData.categoryPercentages || []),
              ];

              // 2. ค้นหาข้อมูลที่ตรงกับ Label บนแกน X
              const target = allScores.find(
                (item) =>
                  item.ploCode === currentLabel ||
                  item.plo_name === currentLabel ||
                  item.cloCode === currentLabel ||
                  item.category === currentLabel,
              );

              if (!target) return null;

              // 3. ดึงค่าตัวเลขตัวแรกที่เจอ (Priority Mapping)
              const val =
                target.ploScore ??
                target.percentage ??
                target.score ??
                target.cloScore ??
                target.realScore ??
                target.realScorePercentages;

              return val !== undefined ? Number(val) : null;
            }}
            // --- Configuration ---
            name={`คะแนนของ: ${individualStudentData.student_name || individualStudentData.Name || "นักเรียนคนนี้"}`}
            stroke="#0f172a"
            strokeWidth={4}
            strokeLinecap="round"
            connectNulls // เชื่อมเส้นกรณีข้อมูลขาดช่วง
            // --- Styles (Slate Dark Theme) ---
            dot={{
              r: 6,
              fill: "#0f172a",
              stroke: "#fff",
              strokeWidth: 2.5,
            }}
            activeDot={{
              r: 8,
              fill: "#1e293b",
              strokeWidth: 0,
            }}
            style={{
              filter: "drop-shadow(0px 3px 4px rgba(15, 23, 42, 0.2))",
            }}
            // --- Animation ---
            animationDuration={1000}
            animationEasing="ease-in-out"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
