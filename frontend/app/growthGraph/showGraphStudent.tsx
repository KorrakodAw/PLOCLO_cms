import { NoData } from "./components/NoData";
import { useState, useEffect } from "react";
import { apiClient } from "@/utils/apiClient";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "next-i18next";

import { StudentTable } from "./components/StudentTable";
import { PloAchievementChart } from "./components/PloAchievementChart";
import { PloBreakdownChart } from "./components/PloBreakdownChart";

export default function ShowGraphStudent({ programId }: { programId: string }) {
  const { user, token } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const [studentProgramData, setStudentProgramData] = useState<any>(null);

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
      .catch((err) => {
        showToast("Error fetching student growth data", "error");
      });
  }, [programId, token, showToast]);

  const students = studentProgramData?.students || [];
  const [graphData, setGraphData] = useState(null);

  const handleStudentClick = (studentId: string) => {
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
        console.log("Graph Data for Student:", res.data);
      } catch (error) {
        console.error("Error fetching graph data for student:", error);
        showToast("Failed to load student graph data", "error");
      }
    };
    fetchStudentGraphData();
  };

  const detailedStats = graphData?.ploDetailedStats || [];

  if (!programId) {
    return <NoData />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Growth Graph</h1>
      <p>
        {lang === "th"
          ? studentProgramData?.programNameTh
          : studentProgramData?.programNameEn}
      </p>
      <div className="w-full max-w-375 mx-auto">
        <StudentTable
          students={students}
          onSelectStudent={handleStudentClick}
        />
        <PloAchievementChart data={detailedStats} />
        <PloBreakdownChart data={detailedStats} />
      </div>
    </div>
  );
}
