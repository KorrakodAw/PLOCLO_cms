/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../../components/Toast";
import { apiClient } from "../../utils/apiClient";
import LoadingOverlay from "@/components/LoadingOverlay";
import { CLO } from "@/utils/cloApi";
import { Info, Calculator } from "lucide-react";

interface Assignment {
  id: number;
  section_id: number;
  name: string;
  max_score: number;
  weight: number;
}

export default function AssignmentCloMapping({
  courseId,
}: {
  courseId: string | number;
}) {
  const { token } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { i18n } = useTranslation("common");
  const lang = i18n.language;
  const [loading, setLoading] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [clos, setClos] = useState<CLO[]>([]);
  const [mappingGrid, setMappingGrid] = useState<Record<string, number>>({});
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const [selectedClo, setSelectedClo] = useState<string | null>(null);

  // 1. Fetch Initial Data
  useEffect(() => {
    if (!courseId || !token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [assignRes, cloRes, mapRes] = await Promise.all([
          apiClient.get(`/assignment?courseId=${courseId}`, {
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
            const assignId = m.assignment_id || m.assignmentId || m.assId;
            const cloId = m.clo_id || m.cloId;
            const weight = m.weight;

            if (assignId && cloId) {
              grid[`${assignId}_${cloId}`] = Number(weight);
            }
          });
        }

        setMappingGrid(grid);
        setChangedKeys(new Set());
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
    if (assignments.length === 0 || clos.length === 0) {
      setSelectedClo(null);
    }
  }, [clos, lang, selectedClo, assignments]);

  // 2. Sort Assignments Logic
  const sortedAssignments = useMemo(() => {
    const sortOrder = ["presentation", "assignment", "midterm", "final"];
    const getSortScore = (name: string) => {
      const lowerName = name.toLowerCase();
      const index = sortOrder.findIndex((keyword) =>
        lowerName.includes(keyword)
      );
      return index === -1 ? 999 : index;
    };
    const romanMap: Record<string, number> = {
      i: 1,
      ii: 2,
      iii: 3,
      iv: 4,
      v: 5,
      vi: 6,
      vii: 7,
      viii: 8,
      ix: 9,
      x: 10,
      xi: 11,
      xii: 12,
    };
    const normalizeName = (name: string) => {
      return name
        .toLowerCase()
        .replace(/\b(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/g, (match) => {
          return romanMap[match].toString();
        });
    };
    return [...assignments].sort((a, b) => {
      const scoreA = getSortScore(a.name);
      const scoreB = getSortScore(b.name);
      if (scoreA !== scoreB) return scoreA - scoreB;
      const normA = normalizeName(a.name);
      const normB = normalizeName(b.name);
      return normA.localeCompare(normB, undefined, { numeric: true });
    });
  }, [assignments]);

  // 3. Weight Summary (Group by keyword)
  const weightSummary = useMemo(() => {
    const summary: Record<string, number> = {
      Assignment: 0,
      Quiz: 0,
      Project: 0,
      Presentation: 0,
      Midterm: 0,
      Final: 0,
      Other: 0,
    };

    assignments.forEach((a) => {
      const name = a.name.toLowerCase();
      const weight = Number(a.weight);
      if (name.includes("quiz")) summary["Quiz"] += weight;
      else if (name.includes("project")) summary["Project"] += weight;
      else if (name.includes("presentation")) summary["Presentation"] += weight;
      else if (name.includes("midterm")) summary["Midterm"] += weight;
      else if (name.includes("final")) summary["Final"] += weight;
      else if (name.includes("assign") || name.includes("work"))
        summary["Assignment"] += weight;
      else summary["Other"] += weight;
    });

    return Object.entries(summary).filter(([, val]) => val > 0);
  }, [assignments]);

  const totalCourseWeight = useMemo(
    () => assignments.reduce((sum, a) => sum + Number(a.weight), 0),
    [assignments]
  );

  // 🟢 4. Calculate CLO Total Weights (Matches the Image Logic)
  // Logic: Sum of (AssignmentWeight * MappingPercentage / 100)
  const cloCourseWeights = useMemo(() => {
    const totals: Record<number, number> = {};
    clos.forEach((clo) => {
      let sum = 0;
      sortedAssignments.forEach((assign) => {
        const mapWeight = mappingGrid[`${assign.id}_${clo.id}`] || 0;
        // Example: 10% weight * 100% mapping = 10 points
        sum += Number(assign.weight) * (mapWeight / 100);
      });
      totals[clo.id] = sum;
    });
    return totals;
  }, [clos, sortedAssignments, mappingGrid]);

  const handleWeightChange = (assignId: number, cloId: number, val: string) => {
    if (val !== "" && isNaN(Number(val))) return;
    const key = `${assignId}_${cloId}`;
    setMappingGrid((prev) => ({
      ...prev,
      [key]: val === "" ? 0 : Number(val),
    }));
    setChangedKeys((prev) => new Set(prev).add(key));
  };

  const handleSave = async () => {
    if (!token) return;
    if (changedKeys.size === 0) {
      showToast("No changes to save.", "success");
      return;
    }
    setLoading(true);
    const updates = Array.from(changedKeys).map((key) => {
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
      setChangedKeys(new Set());
    } catch (err) {
      console.error(err);
      showToast("Failed to save mapping", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 🟢 Weight Breakdown Summary (Top Cards) */}
      {weightSummary.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-gray-800">
            <Calculator size={18} className="text-blue-600" />
            <h3 className="font-bold text-sm uppercase tracking-wide">
              Course Weight Distribution
            </h3>
          </div>

          <div className="flex flex-wrap gap-4">
            {weightSummary.map(([category, weight]) => (
              <div
                key={category}
                className="flex flex-col justify-center items-center p-4 bg-gray-50 rounded-xl border border-gray-100 min-w-[100px]"
              >
                <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">
                  {category}
                </span>
                <span className="text-2xl font-black text-gray-800">
                  {weight.toFixed(0)}%
                </span>
              </div>
            ))}

            <div
              className={`flex flex-col justify-center items-center p-4 rounded-xl border min-w-[100px] ${
                totalCourseWeight === 100
                  ? "bg-green-50 border-green-100"
                  : "bg-red-50 border-red-100"
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase mb-1 ${
                  totalCourseWeight === 100 ? "text-green-600" : "text-red-500"
                }`}
              >
                Total
              </span>
              <span
                className={`text-2xl font-black ${
                  totalCourseWeight === 100 ? "text-green-700" : "text-red-600"
                }`}
              >
                {totalCourseWeight.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden relative min-h-[400px]">
        {loading && <LoadingOverlay />}
        <ToastElement />

        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
            Assignment - CLO Mapping
          </h3>
          <button
            onClick={handleSave}
            disabled={loading || changedKeys.size === 0}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              changedKeys.size === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200"
            }`}
          >
            {loading ? "Saving..." : `Save Changes`}
          </button>
        </div>

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
                  {/* 🟢 No. Index Column */}
                  <th className="p-4 border-b w-12 text-center border-r bg-gray-100">
                    No.
                  </th>

                  <th className="p-4 border-b w-48 sticky left-0 bg-white z-10 shadow-sm border-r">
                    Assignment Name
                  </th>
                  <th className="p-4 border-b w-24 text-center border-r bg-gray-50 text-blue-600">
                    Weight
                  </th>
                  {clos.map((clo) => (
                    <th
                      key={clo.id}
                      className="p-2 border-b text-center min-w-[80px] border-r cursor-pointer hover:bg-blue-100 transition-colors group"
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
                        <div className="h-1 w-1 rounded-full bg-blue-300 group-hover:bg-blue-600"></div>
                      </div>
                    </th>
                  ))}
                  <th className="p-4 border-b text-center w-24">Row Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {/* 🟢 TOTAL CLO WEIGHT Row (At the Top) */}
                <tr className="bg-gray-100 border-b border-gray-300 shadow-sm">
                  <td className="p-4 border-r border-gray-300"></td>
                  <td className="p-4 font-black text-gray-700 sticky left-0 bg-gray-100 flex items-center gap-2 text-xs uppercase tracking-wider">
                    TOTAL CLO WEIGHT
                  </td>
                  <td className="p-4 text-center font-bold text-gray-700 border-r border-gray-300 bg-gray-200">
                    {/* Empty cell for Weight col */}
                  </td>
                  {clos.map((clo) => (
                    <td
                      key={`total-${clo.id}`}
                      className="p-4 text-center border-r border-gray-300 font-black text-gray-800 text-base bg-gray-100"
                    >
                      {/* Calculated like your image (8.7, 15.7, etc.) */}
                      {cloCourseWeights[clo.id]?.toFixed(2)}
                    </td>
                  ))}
                  <td className="bg-gray-100"></td>
                </tr>

                {/* Assignment Rows */}
                {sortedAssignments.map((assign, index) => {
                  const rowTotal = clos.reduce((sum, clo) => {
                    return sum + (mappingGrid[`${assign.id}_${clo.id}`] || 0);
                  }, 0);

                  const isTotalValid = Math.abs(rowTotal - 100) < 0.1;

                  return (
                    <tr
                      key={assign.id}
                      className="group hover:bg-blue-50/30 transition-all"
                    >
                      {/* 🟢 Index Number */}
                      <td className="p-4 text-center font-bold text-gray-400 border-r bg-gray-50/30">
                        {index + 1}
                      </td>

                      <td className="p-4 font-bold text-gray-700 sticky left-0 bg-white group-hover:bg-blue-50/30 border-r shadow-sm">
                        {assign.name}
                      </td>
                      <td className="p-4 text-center font-bold text-blue-600 border-r bg-blue-50/10">
                        {Number(assign.weight).toFixed(0)}
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
                              } ${
                                changedKeys.has(`${assign.id}_${clo.id}`)
                                  ? "bg-yellow-50 ring-2 ring-yellow-200"
                                  : ""
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
                              ? ""
                              : // ? "bg-green-100 text-green-700"
                              rowTotal === 0
                              ? "bg-gray-100 text-gray-400"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {100 - rowTotal}%
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
    </div>
  );
}
