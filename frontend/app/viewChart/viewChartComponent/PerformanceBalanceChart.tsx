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
import { useTranslation } from "react-i18next";

interface PerformanceBalanceChartProps {
  chartData: any[];
  visibleLines?: Record<string, boolean>;
  getGradeColor?: (grade: string) => string;
  xAxisKey: string;
  maxScoreKey?: string;
  minScoreKey?: string;
  allAvgKey?: string;
  maxScorePosKey: string;
  balanceData?: any[]; // ข้อมูลที่ส่งมาจาก gradeCountData ในไฟล์หลัก
  midScoreKey?: string;
  individualStudentData?: any;
}

export const PerformanceBalanceChart = ({
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
}: PerformanceBalanceChartProps) => {
  const { t } = useTranslation("common");

  // 1. ดึงรายการเกรดจาก balanceData (ซึ่งเป็น Array ของ {grade, averages})
  const uniqueGrades = useMemo(() => {
    if (!balanceData || !Array.isArray(balanceData)) return [];
    return balanceData.map((d) => d.grade);
  }, [balanceData]);

  // 2. รวมข้อมูลคะแนนเกรดเข้ากับ chartData เพื่อให้ Radar วาดเส้นได้
  const finalChartData = useMemo(() => {
    if (!chartData || !Array.isArray(chartData)) return [];

    return chartData.map((point) => {
      const updatedPoint = { ...point };
      // ทำความสะอาด Label (เช่น "CLO 1" -> "CLO1") เพื่อให้ตรงกับ Key ใน averages
      const rawLabel = point[xAxisKey] || "";
      const sanitizedLabel =
        typeof rawLabel === "string" ? rawLabel.replace(/\s+/g, "") : rawLabel;

      // วนลูปหาคะแนนของแต่ละเกรดจาก balanceData
      balanceData?.forEach((item) => {
        const score = item.averages?.[sanitizedLabel];
        if (score !== undefined && score !== null) {
          updatedPoint[`avg_grade_${item.grade}`] = Number(score);
        }
      });

      return updatedPoint;
    });
  }, [chartData, balanceData, xAxisKey]);

  const dataMax = useMemo(() => {
    if (!finalChartData.length) return 100;
    return Math.max(...finalChartData.map((d) => d[maxScorePosKey] || 0));
  }, [finalChartData, maxScorePosKey]);

  const isPercent = dataMax === 100;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={finalChartData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey={xAxisKey}
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
          formatter={(value: number, name: string) => {
            if (isPercent && name === t("fullScore")) return [null, null];
            return [`${Number(value).toFixed(2)}${isPercent ? "%" : ""}`, name];
          }}
        />

        {/* Full Score Background */}
        <Radar
          name={t("fullScore")}
          dataKey={maxScorePosKey}
          stroke="#94a3b8"
          fill="#cbd5e1"
          fillOpacity={0.1}
        />

        {/* Statistical Radars */}
        {visibleLines?.maxScore && (
          <Radar
            name={t("maxScore")}
            dataKey={maxScoreKey}
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.05}
          />
        )}
        {visibleLines?.minScore && (
          <Radar
            name={t("minScore")}
            dataKey={minScoreKey}
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.05}
          />
        )}
        {visibleLines?.allAvg && (
          <Radar
            name={t("averageScore")}
            dataKey={allAvgKey}
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.1}
            strokeWidth={3}
          />
        )}
        {visibleLines?.midScore && (
          <Radar
            name={t("medianScore")}
            dataKey={midScoreKey}
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.1}
            strokeWidth={2}
          />
        )}

        {/* 🟢 Grade Radars (เส้นเกรด) */}
        {balanceData?.map((item: any) => {
          const key = `avg_grade_${item.grade}`;
          if (!visibleLines?.[key]) return null;

          const gradeColor = getGradeColor?.(item.grade);

          return (
            <Radar
              key={item.grade}
              dataKey={key}
              name={`Grade ${item.grade}`}
              stroke={gradeColor}
              fill="none"
              connectNulls={true}
              strokeWidth={2.5}
              animationDuration={800}
            />
          );
        })}

        {/* Individual Student Radar */}
        {individualStudentData && (
          <Radar
            dataKey={(dataPoint) => {
              const currentLabel = String(dataPoint[xAxisKey] || "").replace(
                /\s+/g,
                "",
              );
              const allScores = [
                ...(individualStudentData.ploScores || []),
                ...(individualStudentData.ploPercentages || []),
                ...(individualStudentData.cloScores || []),
                ...(individualStudentData.cloPercentages || []),
                ...(individualStudentData.categoryScores || []),
                ...(individualStudentData.categoryPercentages || []),
              ];

              const target = allScores.find(
                (item) =>
                  String(
                    item.ploCode || item.cloCode || item.category || "",
                  ).replace(/\s+/g, "") === currentLabel,
              );

              return target
                ? Number(
                    target.ploScore ||
                      target.percentage ||
                      target.realScore ||
                      target.cloScore,
                  )
                : null;
            }}
            name={`คะแนนของ: ${individualStudentData.student_name || individualStudentData.Name || "นักเรียน"}`}
            stroke="#0f172a"
            fill="#0f172a"
            fillOpacity={0.3}
            strokeWidth={4}
          />
        )}

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
      </RadarChart>
    </ResponsiveContainer>
  );
};
