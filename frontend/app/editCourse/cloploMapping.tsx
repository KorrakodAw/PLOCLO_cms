/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useTranslation } from "next-i18next";
import LoadingOverlay from "@/components/LoadingOverlay";
import { AlertCircle, AlertTriangle, Save, Search } from "lucide-react";

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

// 🟢 FIX: Renamed prop to 'masterCourseId' to avoid confusion with Section ID
export default function CloPloMapping({
  masterCourseId,
  programId,
}: {
  masterCourseId: string | number; // This must be the MASTER Course ID (e.g. CS101), NOT Section ID
  programId: string | number;
}) {
  const { token } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const [loading, setLoading] = useState(false);

  // --- SELECTION STATES ---
  const [plos, setPlos] = useState<PLO[]>([]);
  const [clos, setClos] = useState<CLO[]>([]);
  const [mappingGrid, setMappingGrid] = useState<Record<string, number>>({});

  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());

  // --------------------------------------------------------
  // 1. DATA FETCHING
  // --------------------------------------------------------

  // A. Fetch PLOs
  useEffect(() => {
    if (!programId || !token) {
      setPlos([]);
      return;
    }
    setLoading(true);
    apiClient
      .get(`/plo?programId=${programId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setPlos(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        console.error(err);
        showToast(t("Failed to load PLOs"), "error");
      });
  }, [programId, token, showToast, t]);

  // B. Fetch CLOs AND Existing Mappings
  useEffect(() => {
    // 🟢 FIX: Check for masterCourseId
    if (!masterCourseId || !token) {
      setClos([]);
      setMappingGrid({});
      return;
    }

    setLoading(true);

    Promise.all([
      // 🟢 FIX: Use masterCourseId for fetching
      apiClient.get(`/clo?courseId=${masterCourseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiClient.get(`/mapping/clo-plo/${masterCourseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([cloRes, mappingRes]) => {
        setClos(cloRes.data);

        const newGrid: Record<string, number> = {};
        const mappings = Array.isArray(mappingRes.data) ? mappingRes.data : [];

        mappings.forEach((m: any) => {
          newGrid[`${m.clo_id}_${m.plo_id}`] = m.weight;
        });

        setMappingGrid(newGrid);
        setChangedKeys(new Set());
      })
      .catch((err) => {
        console.error("Error loading matrix:", err);
        showToast(t("Failed to load matrix data"), "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [masterCourseId, token, showToast, t]); // 🟢 Depend on masterCourseId

  // --------------------------------------------------------
  // 3. VALIDATION & HANDLERS
  // --------------------------------------------------------

  const handleWeightChange = (cloId: number, ploId: number, val: string) => {
    if (val !== "" && isNaN(Number(val))) return;

    const key = `${cloId}_${ploId}`;

    setMappingGrid((prev) => ({
      ...prev,
      [key]: val === "" ? 0 : Number(val),
    }));

    setChangedKeys((prev) => new Set(prev).add(key));
  };

  const cloTotals = useMemo(() => {
    const totals: Record<number, number> = {};

    Object.keys(mappingGrid).forEach((key) => {
      const [cloIdStr] = key.split("_");
      const cloId = Number(cloIdStr);

      // 🟢 FIX: Explicitly cast to Number and handle NaN/undefined
      const rawValue = mappingGrid[key];
      const weight = Number(rawValue) || 0;

      if (clos.some((c) => c.id === cloId)) {
        // 🟢 FIX: Use parseFloat or Number to ensure mathematical addition
        const currentTotal = totals[cloId] || 0;
        totals[cloId] = Number((currentTotal + weight).toFixed(4));
      }
    });

    clos.forEach((clo) => {
      if (!(clo.id in totals)) {
        totals[clo.id] = 0;
      }
    });

    return totals;
  }, [mappingGrid, clos]);

  const isValidationSuccess = useMemo(() => {
    if (clos.length === 0) return true;
    return Object.values(cloTotals).every(
      (total) => Math.abs(total - 100) < 0.01,
    );
  }, [cloTotals, clos]);

  const handleSave = async () => {
    if (!token) return;

    if (changedKeys.size === 0) {
      showToast(t("No changes to save"), "success");
      return;
    }

    if (!isValidationSuccess) {
      showToast(t("validation_error_100_percent"), "error");
      return;
    }

    setLoading(true);

    const updates = Array.from(changedKeys).map((key) => {
      const [cloId, ploId] = key.split("_");
      return {
        clo_id: Number(cloId),
        plo_id: Number(ploId),
        weight: mappingGrid[key] || 0,
      };
    });

    try {
      await apiClient.post(
        "/mapping/clo-plo",
        { updates },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast(t("Mapping saved successfully!"), "success");
      setChangedKeys(new Set());
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
    <div className="mt-8 space-y-6 animate-in fade-in duration-500">
      {loading && <LoadingOverlay />}

      {/* Header & Save Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">
            {t("CLO to PLO Mapping Matrix")}
          </h3>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Distribute weight percentage for each outcome
          </p>
        </div>

        {masterCourseId && clos.length > 0 && plos.length > 0 && (
          <button
            onClick={handleSave}
            disabled={loading || !isValidationSuccess || changedKeys.size === 0}
            className={`px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl active:scale-95 
            ${
              !isValidationSuccess
                ? "bg-rose-100 text-rose-500 cursor-not-allowed opacity-70"
                : changedKeys.size === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 text-white hover:bg-emerald-600 shadow-slate-200"
            }`}
          >
            {loading ? (
              t("Syncing...")
            ) : (
              <>
                <Save size={16} />
                {t("Save Changes")} ({changedKeys.size})
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Content Container */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto custom-scrollbar">
          {masterCourseId && clos.length > 0 && plos.length > 0 ? (
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {/* Diagonal Header Cell */}
                  <th className="sticky left-0 top-0 z-50 bg-slate-50 border-b border-r border-slate-200 w-[120px] h-[70px]">
                    <div className="relative w-full h-full group">
                      <svg
                        className="absolute inset-0 w-full h-full"
                        preserveAspectRatio="none"
                      >
                        <line
                          x1="0"
                          y1="0"
                          x2="100%"
                          y2="100%"
                          stroke="#e2e8f0"
                          strokeWidth="1.5"
                        />
                      </svg>
                      <div className="absolute top-3 right-4 text-[10px] font-black text-slate-500 tracking-tighter">
                        PLO
                      </div>
                      <div className="absolute bottom-3 left-4 text-[10px] font-black text-slate-500 tracking-tighter">
                        CLO
                      </div>
                    </div>
                  </th>

                  {/* PLO Columns */}
                  {plos.map((plo) => (
                    <th
                      key={plo.id}
                      className="sticky top-0 z-40 border-b border-r border-slate-100 p-5 min-w-[90px] bg-slate-50/80 backdrop-blur-sm text-center transition-colors group"
                      title={lang === "th" ? plo.name_th : plo.name_en}
                    >
                      <span className="text-sm font-black text-blue-600 group-hover:text-blue-800 transition-colors">
                        {plo.code}
                      </span>
                    </th>
                  ))}

                  {/* Total Column Header */}
                  <th className="sticky top-0 right-0 z-40 border-b border-slate-200 p-5 min-w-[110px] bg-slate-100 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                    {t("Weight (%)")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {clos.map((clo) => {
                  const total = cloTotals[clo.id] || 0;
                  const isTotalValid = Math.abs(total - 100) < 0.01;

                  return (
                    <tr key={clo.id} className="group transition-colors">
                      {/* CLO Code Cell (Sticky Left) */}
                      <td
                        className="sticky left-0 z-30 p-5 bg-white group-hover:bg-slate-50 border-r border-slate-100 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] transition-colors"
                        title={clo.name_en}
                      >
                        <span className="text-sm font-black text-slate-700">
                          {clo.code}
                        </span>
                      </td>

                      {/* Weight Inputs */}
                      {plos.map((plo) => {
                        const key = `${clo.id}_${plo.id}`;
                        const weight = mappingGrid[key] || "";
                        const hasValue = Number(weight) > 0;
                        const isChanged = changedKeys.has(key);

                        return (
                          <td
                            key={plo.id}
                            className={`p-1.5 border-r border-slate-50 text-center transition-all ${
                              hasValue
                                ? "bg-blue-50/20"
                                : "group-hover:bg-slate-50/50"
                            }`}
                          >
                            <input
                              type="text"
                              className={`w-full h-12 text-center text-lg font-black transition-all outline-none rounded-xl 
                              ${hasValue ? "text-blue-600" : "text-slate-200 focus:text-slate-600"}
                              ${isChanged ? "bg-amber-50 ring-2 ring-amber-200 text-amber-600" : "bg-transparent focus:bg-white focus:ring-4 focus:ring-slate-100"}
                            `}
                              placeholder="0"
                              value={
                                weight !== "" ? Number(weight).toString() : ""
                              }
                              onChange={(e) =>
                                handleWeightChange(
                                  clo.id,
                                  plo.id,
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                        );
                      })}

                      {/* Total Row Cell (Sticky Right) */}
                      <td
                        className={`sticky right-0 z-30 p-5 text-center shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] transition-all
                        ${
                          isTotalValid
                            ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-600 group-hover:bg-rose-100"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-black">
                            {parseFloat(total.toString())}%
                          </span>
                          {!isTotalValid && (
                            <div className="w-1 h-1 rounded-full bg-rose-400 animate-ping" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* Empty States - Enhanced */
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              {!masterCourseId ? (
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                    <Search className="text-slate-300" size={32} />
                  </div>
                  <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em]">
                    {t("select_course_section")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-rose-400">
                  <AlertCircle size={48} className="mx-auto opacity-50" />
                  <p className="font-black uppercase text-[11px] tracking-widest">
                    {clos.length === 0
                      ? t("no_clos_found")
                      : t("no_plos_found")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Footer for Errors */}
        {!isValidationSuccess && masterCourseId && clos.length > 0 && (
          <div className="p-4 bg-rose-600 flex items-center justify-center gap-3 animate-bounce-subtle">
            <AlertTriangle size={18} className="text-white" />
            <span className="text-[11px] font-black text-white uppercase tracking-widest">
              {t("please ensure all row totals reach 100 percent")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
