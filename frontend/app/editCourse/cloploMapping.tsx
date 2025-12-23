/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import { useToast } from "../../components/Toast";
import { useTranslation } from "next-i18next";

// --- Types ---
interface PLO {
  id: number;
  code: string;
  name_en: string;
  name_th: string;
}

interface CLO {
  id: number;
  code: string;
  name_en: string;
}

export default function CloPloMapping({
  courseId,
  programId,
}: {
  courseId: string;
  programId: string;
}) {
  const { token } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // --- SELECTION STATES ---

  const [plos, setPlos] = useState<PLO[]>([]);
  const [clos, setClos] = useState<CLO[]>([]);
  const [mappingGrid, setMappingGrid] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------------
  // 1. DROPDOWN LOADING LOGIC
  // --------------------------------------------------------

  // --------------------------------------------------------
  // 2. MATRIX DATA FETCHING
  // --------------------------------------------------------

  // A. Fetch PLOs
  useEffect(() => {
    if (!programId || !token) {
      setPlos([]);
      return;
    }
    apiClient
      .get(`/plo?programId=${programId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setPlos(res.data);
      })
      .catch((err) => {
        console.error(err);
        showToast(t("Failed to load PLOs"), "error");
      });
  }, [programId, token, showToast, t]);

  // B. Fetch CLOs AND Existing Mappings
  useEffect(() => {
    if (!courseId || !token) {
      setClos([]);
      setMappingGrid({}); // Reset grid
      return;
    }

    setLoading(true);

    // Fetch both endpoints in parallel
    Promise.all([
      // 1. Get CLOs
      apiClient.get(`/clo?courseId=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      // 2. Get Saved Weights
      apiClient.get(`/mapping/clo-plo/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([cloRes, mappingRes]) => {
        setClos(cloRes.data);

        // Process Mappings into the Grid Dictionary
        const newGrid: Record<string, number> = {};
        const mappings = Array.isArray(mappingRes.data) ? mappingRes.data : [];

        mappings.forEach((m: any) => {
          newGrid[`${m.clo_id}_${m.plo_id}`] = m.weight;
        });

        setMappingGrid(newGrid);
      })
      .catch((err) => {
        console.error("Error loading matrix:", err);
        showToast(t("Failed to load matrix data"), "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [courseId, token, showToast, t]);

  // --------------------------------------------------------
  // 3. VALIDATION & HANDLERS
  // --------------------------------------------------------

  const handleWeightChange = (cloId: number, ploId: number, val: string) => {
    // Allow empty string (user deleting) or valid numbers only
    if (val !== "" && isNaN(Number(val))) return;

    setMappingGrid((prev) => ({
      ...prev,
      // Ensure the value is converted to a number, or 0 if empty
      [`${cloId}_${ploId}`]: val === "" ? 0 : Number(val),
    }));
  };

  // --- NEW: Memoized calculation of total weight for each CLO ---
  const cloTotals = useMemo(() => {
    const totals: Record<number, number> = {};

    // Group all weights by their CLO ID
    Object.keys(mappingGrid).forEach((key) => {
      const [cloIdStr] = key.split("_");
      const cloId = Number(cloIdStr);
      const weight = mappingGrid[key] || 0; // Use 0 if key is empty/undefined

      if (clos.some((c) => c.id === cloId)) {
        totals[cloId] = (totals[cloId] || 0) + weight;
      }
    });

    // Ensure all displayed CLOs have a total, even if 0
    clos.forEach((clo) => {
      if (!(clo.id in totals)) {
        totals[clo.id] = 0;
      }
    });

    return totals;
  }, [mappingGrid, clos]);

  // --- NEW: Overall Validation Check ---
  const isValidationSuccess = useMemo(() => {
    // If no CLOs are loaded, validation passes by default
    if (clos.length === 0) return true;

    // Check if every CLO total is exactly 100
    return Object.values(cloTotals).every(
      (total) => Math.abs(total - 100) < 0.01
    );
  }, [cloTotals, clos]);

  const handleSave = async () => {
    if (!token) return;

    // --- 1. Client-side Validation Check ---
    if (!isValidationSuccess) {
      showToast(t("validation_error_100_percent"), "error");
      return; // STOP here, do not save.
    }
    // --------------------------------------

    setLoading(true);

    // Prepare the payload (only send mappings with a weight > 0)
    const updates = Object.keys(mappingGrid)
      .filter((key) => mappingGrid[key] > 0)
      .map((key) => {
        const [cloId, ploId] = key.split("_");
        return {
          clo_id: Number(cloId),
          plo_id: Number(ploId),
          weight: mappingGrid[key],
        };
      });

    try {
      await apiClient.post(
        "/mapping/clo-plo",
        { updates },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(t("Mapping saved successfully!"), "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || t("Failed to save"), "error");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------
  // 4. UI RENDER
  // --------------------------------------------------------
  return (
    <div className="mt-5 p-5">
      {/* --- MATRIX TABLE --- */}
      <div className="bg-white p-4 shadow-md rounded-lg overflow-x-auto min-h-[300px] border border-gray-200 ">
        <div className="flex flex-col">
          {/* Save Button */}
          {courseId && clos.length > 0 && plos.length > 0 && (
            <button
              onClick={handleSave}
              disabled={loading || !isValidationSuccess} // 💡 DISABLE ON VALIDATION FAIL
              className={`px-6 py-2.5 max-w-[300px] rounded shadow transition disabled:opacity-50 font-medium mb-2.5 self-end
                ${
                  isValidationSuccess
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-500 text-white cursor-not-allowed"
                }`}
            >
              {loading ? t("Loading...") : t("Save Changes")}
            </button>
          )}

          {/* Matrix Content */}
          {courseId && clos.length > 0 && plos.length > 0 && (
            <table className="w-full border-collapse border border-gray-300 text-sm">
              {/* HEADERS: PLOs as Columns + NEW TOTAL COLUMN */}
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-0 left-0 bg-gray-100 z-30 w-[100px] min-w-[70px] h-14 shadow-md">
                    {/* Diagonal Box */}
                    <div className="relative w-full h-full">
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <line
                          x1="0"
                          y1="0"
                          x2="100%"
                          y2="100%"
                          stroke="#d1d5db"
                          strokeWidth="1"
                        />
                      </svg>
                      <div className="absolute top-2 right-3 text-xs font-bold text-gray-600">
                        PLO
                      </div>
                      <div className="absolute bottom-2 left-3 text-xs font-bold text-gray-600">
                        CLO
                      </div>
                    </div>
                  </th>

                  {plos.map((plo) => (
                    <th
                      key={plo.id}
                      className="border p-2 min-w-[70px] text-center bg-gray-50 hover:bg-gray-100 transition-colors"
                      title={lang === "th" ? plo.name_th : plo.name_en}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-800">
                          {plo.code}
                        </span>
                      </div>
                    </th>
                  ))}

                  {/* 💡 NEW: Total Column Header */}
                  <th className="border p-2 min-w-[90px] text-center bg-gray-200 font-extrabold text-gray-800  right-0 z-20 shadow-inner">
                    {t("Total (%)")}
                  </th>
                </tr>
              </thead>

              {/* BODY: CLOs as Rows */}
              <tbody>
                {clos.map((clo) => {
                  const total = cloTotals[clo.id] || 0;
                  const isTotalValid = Math.abs(total - 100) < 0.01;

                  return (
                    <tr
                      key={clo.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        !isTotalValid ? "border-t-2 border-red-400" : ""
                      }`} // 💡 Highlight entire invalid row
                    >
                      {/* CLO Code */}
                      <td
                        className="border p-3 font-bold left-0 bg-white z-10 shadow-sm"
                        title={clo.name_en}
                      >
                        {clo.code}
                      </td>

                      {/* PLO INPUTS */}
                      {plos.map((plo) => {
                        const key = `${clo.id}_${plo.id}`;
                        const weight = mappingGrid[key] || "";
                        const hasValue = Number(weight) > 0;
                        return (
                          <td
                            key={plo.id}
                            className={`border p-1 text-center ${
                              hasValue ? "bg-blue-50/30" : ""
                            }`}
                          >
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className={`w-full h-full text-center py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                hasValue
                                  ? "font-bold text-blue-700"
                                  : "text-gray-400"
                              }`}
                              placeholder="-"
                              value={weight}
                              onChange={(e) =>
                                handleWeightChange(
                                  clo.id,
                                  plo.id,
                                  e.target.value
                                )
                              }
                            />
                          </td>
                        );
                      })}

                      {/* 💡 NEW: Total Column Cell (Validation Status) */}
                      <td
                        className={`border p-3 text-center font-extrabold ${
                          isTotalValid
                            ? "bg-green-100 text-green-700"
                            : "bg-red-200 text-red-800"
                        }`}
                        title={
                          isTotalValid
                            ? "Total is 100%"
                            : `Error: Total is ${total}%. Must be 100%`
                        }
                      >
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* 💡 Validation Summary Row */}
              {!isValidationSuccess && (
                <tfoot>
                  <tr>
                    <td
                      colSpan={plos.length + 2}
                      className="p-2 text-center bg-red-50 text-red-700 font-semibold border-t-4 border-red-400"
                    >
                      ⚠️ {t("please ensure totals are 100 percent")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {/* Empty States */}
          {!loading && courseId && clos.length === 0 && (
            <div className="text-center text-red-400 py-10 bg-red-50 rounded-lg">
              {t("no_clos_found")}
            </div>
          )}
          {!loading && courseId && plos.length === 0 && (
            <div className="text-center text-red-400 py-10 bg-red-50 rounded-lg">
              {t("no_plos_found")}
            </div>
          )}

          {/* Default State */}
          {!courseId && (
            <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-400 font-medium">
                {t("select_course_section")}
              </p>
            </div>
          )}
        </div>
      </div>

      <ToastElement />
    </div>
  );
}
