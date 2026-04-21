import { NoData } from "./components/NoData";
import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/utils/apiClient";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "next-i18next";

import { StudentTable } from "./components/StudentTable";
import { PloAchievementChart } from "./components/PloAchievementChart";
import { PloBreakdownChart } from "./components/PloBreakdownChart";
import { MousePointerClick, User } from "lucide-react";
import { toPng } from "html-to-image";
import { FaCamera } from "react-icons/fa";

export default function ShowGraphStudent({ programId }: { programId: string }) {
  const { user, token } = useAuth();
  const graphRef = useRef<HTMLDivElement>(null);
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const [studentProgramData, setStudentProgramData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const isStudent = user?.role === "student";
  const [studentId, setStudentId] = useState<string | null>(null);

  const fetchStudentData = async () => {
    if (!isStudent || !token) return;

    try {
      const res = await apiClient.get(`/student/email/${user.email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const studentData = res.data;
      setStudentId(studentData.id);
    } catch (err) {
      console.error("Error fetching student data:", err);
      showToast("Error fetching student data", "error");
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [token, user, showToast]);

  useEffect(() => {
    if (!programId) return;
    apiClient
      .get(`/student`, {
        params: {
          programId,
        },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setStudentProgramData(res.data?.[0]);
      })
      .catch(() => {
        showToast("Error fetching student growth data", "error");
      });
  }, [programId, token, showToast]);

  const students = studentProgramData?.students || [];
  const [graphData, setGraphData] = useState([] as any);

  const handleStudentClick = (studentId: string) => {
    setLoading(true);
    const fetchStudentGraphData = async () => {
      try {
        const res = await apiClient.get(
          `/calculation/clo-plo/studentCumulative/all`,
          {
            params: { studentId },
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setGraphData(res.data);
      } catch (error) {
        console.error("Error fetching graph data for student:", error);
        showToast("Failed to load student graph data", "error");
      }
    };
    fetchStudentGraphData();
  };

  useEffect(() => {
    if (isStudent && studentId) {
      handleStudentClick(studentId);
    }
  }, [studentId, isStudent]);

  useEffect(() => {
    setLoading(false);
  }, [graphData]);

  const handleCaptureGraph = async () => {
    if (!graphRef.current) return;

    try {
      // 🟢 เพิ่มการรอเล็กน้อยเพื่อให้ DOM นิ่ง
      await new Promise((resolve) => setTimeout(resolve, 500));

      const dataUrl = await toPng(graphRef.current, {
        cacheBust: true,
        // 🟢 บังคับขนาดที่แน่นอนตอน capture เพื่อช่วย ResponsiveContainer
        width: graphRef.current.offsetWidth,
        height: graphRef.current.offsetHeight,
        style: {
          visibility: "visible",
        },
      });

      const link = document.createElement("a");
      link.download = `performance-chart-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Capture Error:", err);
    } finally {
      setLoading(false);
      showToast("Graph image captured!", "success");
    }
  };

  const detailedStats = graphData?.ploDetailedStats || [];
  
  if (!programId) {
    return <NoData />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* 🟢 Header section: Title & Subtitle */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {t("Growth Analytics")}
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          {t("Monitor and evaluate student performance across PLOs")}
        </p>
      </div>

      <div className="space-y-8">
        {loading ? (
          /* 🟢 Loading State */
          <div className="w-full h-[450px] flex flex-col items-center justify-center bg-white rounded-[40px] border border-slate-100 shadow-sm">
            <div className="relative flex items-center justify-center">
              <div className="absolute animate-ping h-12 w-12 rounded-full bg-indigo-400 opacity-20"></div>
              <div className="relative animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
            <p className="mt-6 text-slate-500 font-bold tracking-wide animate-pulse uppercase text-[11px]">
              {t("Generating PLO Analysis...")}
            </p>
          </div>
        ) : graphData ? (
          /* 🟢 Show Analytics when graphData exists */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-6 py-5 bg-indigo-50/50 border border-indigo-100 rounded-[32px] transition-all hover:bg-indigo-50/80">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-xl shadow-indigo-200 shrink-0">
                  <User size={28} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[16px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                    {t("Currently Viewing")}
                  </span>
                  <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-tight">
                      {graphData?.studentName}
                    </h2>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-400 tabular-nums tracking-tight">
                      {graphData?.studentCode}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 lg:ml-auto">
                <button
                  onClick={handleCaptureGraph}
                  className="group flex items-center gap-3 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] tracking-widest font-black rounded-2xl shadow-lg shadow-indigo-200/50 transition-all duration-300 active:scale-95"
                >
                  <FaCamera className="text-sm group-hover:-rotate-12 transition-transform duration-300" />
                  <span className="uppercase font-light text-[14px]">
                    {t("Save Analytics Image")}
                  </span>
                </button>
              </div>
            </div>

            <div
              ref={graphRef}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mt-8"
            >
              {/* Chart Card 1 */}
              <div className="flex flex-col bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1 min-h-[350px] w-full">
                  <PloAchievementChart data={detailedStats} />
                </div>
              </div>

              {/* Chart Card 2 */}
              <div className="flex flex-col bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1 min-h-[350px] w-full">
                  <PloBreakdownChart data={detailedStats} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 🟢 Empty State: เมื่อยังไม่ได้เลือกนิสิต */
          <div className="w-full h-[400px] flex flex-col items-center justify-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200 transition-all">
            <div className="w-20 h-20 bg-white rounded-[30px] flex items-center justify-center text-slate-300 shadow-sm border border-slate-100 mb-6">
              <MousePointerClick size={32} className="animate-bounce" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                No Student Selected
              </h3>
              <p className="text-sm text-slate-400 font-medium max-w-[280px] mx-auto leading-relaxed">
                Please select a student from the table below to generate their
                PLO achievement analysis.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 🟢 Program & Directory Section */}
      {!isStudent && (
        <div className="pt-10 border-t border-slate-100 space-y-6">
          {/* Program Info Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[32px] p-8 shadow-2xl shadow-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]" />
                  <span className="text-[10px] font-black tracking-[0.2em] text-indigo-400 uppercase">
                    Current Program
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
                    {lang === "th"
                      ? studentProgramData?.programShortNameTh
                      : studentProgramData?.programShortNameEn}
                  </h1>
                  <div className="px-4 py-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
                    <span className="text-xs font-black text-indigo-300 uppercase mr-2 opacity-70">
                      Class
                    </span>
                    <span className="text-lg font-black text-white">
                      {studentProgramData?.programYear}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 self-start lg:self-center bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute opacity-75" />
                  <div className="relative w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Database Status
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    {students.length} Enrolled Students
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Student Table Section */}
          <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            <StudentTable
              students={students}
              onSelectStudent={handleStudentClick}
            />
          </div>

          {/* Footer System Info */}
          <div className="flex items-center justify-center gap-6 py-4 opacity-30">
            <div className="h-px flex-1 bg-slate-300" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">
              Academic Intelligence System
            </span>
            <div className="h-px flex-1 bg-slate-300" />
          </div>
        </div>
      )}
    </div>
  );
}
