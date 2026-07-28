"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  FaChartLine,
  FaChartBar,
  FaTasks,
  FaGraduationCap,
} from "react-icons/fa";
import { apiClient } from "@/utils/apiClient";
import { useAuth } from "../context/AuthContext";

// Dashboard Components
import CloStatsDashboard from "./CourseStats/CloStatsDashboard";
import PloStatsDashboard from "./CourseStats/PloStatsDashboard";
import AssignmentStatsDashboard from "./CourseStats/AssignmentStatsDashboard";
import { GradeDistributionChart } from "./viewChartComponent/gradeDistributionChart";
import { DashboardLoading } from "./CourseStats/courseComponents/DashboardLoading";

interface CourseStatsDashboardProps {
  CsemesterId: string;
  courseId: string;
  program_id: string;
}

export default function CourseStatsDashboard({
  CsemesterId,
  courseId,
  program_id,
}: CourseStatsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"clo" | "plo" | "assignment">(
    "clo",
  );
  const { token } = useAuth();
  const [gradeCountData, setGradeCountData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // 🟢 Logic สำหรับเรียงลำดับเกรดให้ถูกต้อง (A -> F)
  const gradeOrder = ["A", "B+", "B", "C+", "C", "D+", "D", "F", "W", "S", "U"];

  const fetchGradeData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/calculation/realScoreAndGrade/gradSummary`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { CsemesterId },
        },
      );
      setGradeCountData(res.data);
    } catch (error) {
      console.error("Error fetching grade data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🟢 ใช้ useMemo เพื่อป้องกันการคำนวณใหม่โดยไม่จำเป็น และเรียงลำดับข้อมูล
  const formattedGradeData = useMemo(() => {
    if (!gradeCountData) return [];
    return Object.entries(gradeCountData)
      .map(([grade, details]: any) => ({
        grade: grade,
        count: details.count,
      }))
      .sort(
        (a, b) => gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade),
      );
  }, [gradeCountData]);

  useEffect(() => {
    fetchGradeData();
  }, [CsemesterId, token]);

  if (loading) {
    return <DashboardLoading />;
  }

  return (
    <div className="p-6 min-h-screen space-y-8 align-middle flex flex-col items-center">
      {/* 🏷️ Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white text-xl">
              <FaGraduationCap />
            </div>
            Course Stats Dashboard
          </h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Academic Performance Summary & Learning Outcomes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 📊 Grade Distribution Card (Overview) */}
        <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              Grade trends
            </h3>
          </div>
          <div className="h-87.5 w-full max-w-375">
            {formattedGradeData.length > 0 ? (
              <GradeDistributionChart data={formattedGradeData} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                No grade data available for this semester.
              </div>
            )}
          </div>
        </div>

        {/* 📑 Main Content Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* Segmented Control */}
          <div className="flex justify-center">
            <div className="inline-flex p-1.5 bg-slate-200/50 backdrop-blur-md rounded-2xl border border-slate-200">
              {[
                { id: "clo", label: "CLO Stats", icon: <FaChartLine /> },
                { id: "plo", label: "PLO Stats", icon: <FaChartBar /> },
                {
                  id: "assignment",
                  label: "Assignment Stats",
                  icon: <FaTasks />,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                  }}
                  className={`
                    flex items-center gap-2.5 px-8 py-3 text-sm font-bold rounded-xl transition-all duration-300
                    ${
                      activeTab === tab.id
                        ? "bg-white text-blue-600 shadow-lg shadow-blue-900/5 ring-1 ring-black/5"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                    }
                  `}
                >
                  <span
                    className={`text-base ${activeTab === tab.id ? "text-blue-500" : "text-slate-400"}`}
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 min-h-150">
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
              {activeTab === "clo" && (
                <CloStatsDashboard
                  CsemesterId={CsemesterId}
                  program_id={program_id}
                />
              )}
              {activeTab === "plo" && (
                <PloStatsDashboard
                  CsemesterId={CsemesterId}
                  courseId={courseId}
                  program_id={program_id}
                  onLoadingChange={(isLoading) => setLoading(isLoading)}
                />
              )}
              {activeTab === "assignment" && (
                <AssignmentStatsDashboard
                  CsemesterId={CsemesterId}
                  program_id={program_id}
                  onLoadingChange={(isLoading) => setLoading(isLoading)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
