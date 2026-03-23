"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { apiClient } from "@/utils/apiClient";
import { useGlobalToast } from "@/app/context/ToastContext";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useAuth } from "../context/AuthContext";
import { PerformanceBalanceChart } from "./viewChartComponent/PerformanceBalanceChart";
import { PerformanceTrendChart } from "./viewChartComponent/PerformanceTrendChart";
import { GradeDistributionChart } from "./viewChartComponent/gradeDistributionChart";
import { ToggleButton } from "./viewChartComponent/ToggleButton";
import StudentPerformanceTable from "./viewChartComponent/StudentDataTable";
import CloStatsDashboard from "./CourseStats/CloStatsDashboard";
import PloStatsDashboard from "./CourseStats/PloStatsDashboard";
import AssignmentStatsDashboard from "./CourseStats/AssignmentStatsDashboard";

interface CourseStatsDashboardProps {
  CsemesterId: any;
  year: any;
  semester: any;
  courseId: any;
  program_id: any;
}

export default function CourseStatsDashboard({
  CsemesterId,
  year,
  semester,
  courseId,
  program_id,
}: CourseStatsDashboardProps) {
  const { user } = useAuth();
  const { showToast } = useGlobalToast();
  const [loading, setLoading] = useState(false);

  const [CloState, setCloState] = useState(true);
  const [PloState, setPloState] = useState(false);
  const [AssignmentState, setAssignmentState] = useState(false);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Course Stats Dashboard</h2>
      <button
        onClick={() => {
          setCloState((prev) => !prev);
          setPloState(false);
          setAssignmentState(false);
        }}
        className={`px-4 py-2 rounded ${
          CloState ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
        }`}
      >
        CLO Stats
      </button>
      <button
        onClick={() => {
          setPloState((prev) => !prev);
          setCloState(false);
          setAssignmentState(false);
        }}
        className={`ml-4 px-4 py-2 rounded ${
          PloState ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
        }`}
      >
        PLO Stats
      </button>
      <button
        onClick={() => {
          setAssignmentState((prev) => !prev);
          setCloState(false);
          setPloState(false);
        }}
        className={`ml-4 px-4 py-2 rounded ${
          AssignmentState
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-700"
        }`}
      >
        Assignment Stats
      </button>

      {CloState && <CloStatsDashboard CsemesterId={CsemesterId} program_id={program_id} />}
      {PloState && (
        <PloStatsDashboard CsemesterId={CsemesterId} courseId={courseId} program_id={program_id} />
      )}
      {AssignmentState && (
        <AssignmentStatsDashboard CsemesterId={CsemesterId} program_id={program_id} />
      )}
    </div>
  );
}
