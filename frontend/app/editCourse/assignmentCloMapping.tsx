/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../../components/Toast";
import { apiClient } from "../../utils/apiClient";
import LoadingOverlay from "@/components/LoadingOverlay";
import { CLO } from "@/utils/cloApi";
import { Info } from "lucide-react";

interface Assignment {
  id: number;
  course_id: number;
  name: string;
  max_score: number;
  weight: number;
}

export default function AssignmentCloMapping({
  courseId,
}: {
  courseId: string;
}) {
  const { token } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { i18n } = useTranslation("common");
  const lang = i18n.language;
  const [loading, setLoading] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [clos, setClos] = useState<CLO[]>([]);
  const [mappingGrid, setMappingGrid] = useState<Record<string, number>>({});

  // 🟢 NEW: State to track hovered CLO description
  const [selectedClo, setSelectedClo] = useState<string | null>(null);

  // 1. Fetch Initial Data
  useEffect(() => {
    if (!courseId || !token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [assignRes, cloRes, mapRes] = await Promise.all([
          apiClient.get(`/assignments?courseId=${courseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiClient.get(`/clo?courseId=${courseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiClient.get(`/mapping/assignment-clo/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setAssignments(assignRes.data);
        setClos(cloRes.data);

        const grid: Record<string, number> = {};
        const mappings = mapRes.data.mappings || mapRes.data;
        if (Array.isArray(mappings)) {
          mappings.forEach((m: any) => {
            grid[`${m.assignment_id}_${m.clo_id}`] = m.weight;
          });
        }
        setMappingGrid(grid);
      } catch (err) {
        console.error(err);
        showToast("Failed to load mapping data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, token, showToast]);

  useEffect(() => {
    if (clos.length > 0 && !selectedClo) {
      const firstClo = clos[0];
      setSelectedClo(
        `${firstClo.code} : ${
          lang === "th" ? firstClo.name_th || firstClo.name : firstClo.name
        }`
      );
    }
  }, [clos, lang, selectedClo]);

  // Sort assignments
  const sortedAssignments = useMemo(() => {
    const sortOrder = ["presentation", "assignment", "midterm", "final"];

    const getSortScore = (name: string) => {
      const lowerName = name.toLowerCase();
      const index = sortOrder.findIndex((keyword) =>
        lowerName.includes(keyword)
      );
      return index === -1 ? 999 : index;
    };

    return [...assignments].sort((a, b) => {
      const scoreA = getSortScore(a.name);
      const scoreB = getSortScore(b.name);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [assignments]);

  // 2. Handle Input Change
  const handleWeightChange = (assignId: number, cloId: number, val: string) => {
    if (val !== "" && isNaN(Number(val))) return;
    setMappingGrid((prev) => ({
      ...prev,
      [`${assignId}_${cloId}`]: val === "" ? 0 : Number(val),
    }));
  };

  // 3. Save Mapping
  const handleSave = async () => {
    if (!token) return;
    setLoading(true);

    const updates = Object.keys(mappingGrid).map((key) => {
      const [assignId, cloId] = key.split("_");
      return {
        assignment_id: Number(assignId),
        clo_id: Number(cloId),
        weight: mappingGrid[key],
      };
    });

    try {
      await apiClient.post(
        "/mapping/assignment-clo",
        { updates },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Mapping saved successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to save mapping", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden mt-8">
      {loading && <LoadingOverlay />}
      <ToastElement />
      <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
          Assignment - CLO Mapping
        </h3>
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Mapping"}
        </button>
      </div>

      {/* 🟢 NEW: Info Bar for Hovered CLO */}
      <div className="bg-blue-50/50 px-6 py-3 border-b border-blue-100 min-h-[48px] flex items-center transition-all">
        {selectedClo ? (
          <div className="flex items-center gap-2 animate-fadeIn">
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Info size={12} strokeWidth={3} />
              INFO
            </span>
            <span className="text-sm text-blue-900 font-medium">
              {selectedClo}
            </span>
          </div>
        ) : (
          <span className="text-xs text-blue-300 italic font-medium">
            Hover over or click a CLO code to see its full description
          </span>
        )}
      </div>

      <div className="overflow-x-auto p-4">
        {sortedAssignments.length > 0 && clos.length > 0 ? (
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50/50 text-gray-500 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="p-4 border-b w-48 sticky left-0 bg-white z-10 shadow-sm border-r">
                  Assignment Name
                </th>
                <th className="p-4 border-b w-24 text-center border-r">
                  Weight
                </th>
                {clos.map((clo) => (
                  <th
                    key={clo.id}
                    className="p-2 border-b text-center min-w-[80px] border-r cursor-pointer hover:bg-blue-100 transition-colors group"
                    // 🟢 NEW: Event handlers for hover/click
                    // onMouseEnter={() =>
                    //   setSelectedClo(
                    //     `${clo.code} : ${
                    //       lang === "th" ? clo.name_th || clo.name : clo.name
                    //     }`
                    //   )
                    // }
                    onClick={() =>
                      setSelectedClo(
                        `${clo.code} : ${
                          lang === "th" ? clo.name_th || clo.name : clo.name
                        }`
                      )
                    }
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-blue-600 font-bold group-hover:text-blue-800">
                        {clo.code}
                      </span>
                      {/* Optional: Small indicator that it's interactive */}
                      <div className="h-1 w-1 rounded-full bg-blue-300 group-hover:bg-blue-600"></div>
                    </div>
                  </th>
                ))}
                <th className="p-4 border-b text-center w-24">Total %</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {sortedAssignments.map((assign) => {
                const rowTotal = clos.reduce((sum, clo) => {
                  return sum + (mappingGrid[`${assign.id}_${clo.id}`] || 0);
                }, 0);

                const isTotalValid = Math.abs(rowTotal - 100) < 0.1;

                return (
                  <tr
                    key={assign.id}
                    className="group hover:bg-blue-50/30 transition-all"
                  >
                    <td className="p-4 font-bold text-gray-700 sticky left-0 bg-white group-hover:bg-blue-50/30 border-r shadow-sm">
                      {assign.name}
                    </td>
                    <td className="p-4 text-center font-bold text-gray-500 border-r bg-gray-50/20">
                      {Number(assign.weight).toFixed(2)}%
                    </td>
                    {clos.map((clo) => {
                      const weight =
                        mappingGrid[`${assign.id}_${clo.id}`] || "";
                      const hasValue = Number(weight) > 0;
                      return (
                        <td
                          key={clo.id}
                          className={`p-1 border-r text-center ${
                            hasValue ? "bg-blue-50/50" : ""
                          }`}
                        >
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className={`w-full h-full text-center py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-transparent ${
                              hasValue
                                ? "font-bold text-blue-700"
                                : "text-gray-400"
                            }`}
                            placeholder="-"
                            value={weight}
                            onChange={(e) =>
                              handleWeightChange(
                                assign.id,
                                clo.id,
                                e.target.value
                              )
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black ${
                          isTotalValid
                            ? "bg-green-100 text-green-700"
                            : rowTotal === 0
                            ? "bg-gray-100 text-gray-400"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {rowTotal.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-gray-400 italic">
            Please ensure you have both Assignments and CLOs created for this
            course.
          </div>
        )}
      </div>
    </div>
  );
}
