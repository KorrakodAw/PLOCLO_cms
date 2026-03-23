/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useTranslation } from "next-i18next";
import LoadingOverlay from "@/components/LoadingOverlay";
import { AlertCircle, AlertTriangle, Save, Search } from "lucide-react";
import AlertPopup from "@/components/AlertPopup";
// --- Types ---
interface PLO {
  id: number;
  code: string;
  name_en: string;
  name_th: string;
  program_id: number;
}

interface CLO {
  id: number;
  code: string;
  name_en: string;
}

// 🟢 FIX: Renamed prop to 'masterCourseId' to avoid confusion with Section ID
export default function CloPloMapping({
  masterCourseId,
  semesterId,
}: {
  masterCourseId: string | number; // This must be the MASTER Course ID (e.g. CS101), NOT Section ID
  semesterId: string | number;
}) {
  const { token } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const [loading, setLoading] = useState(false);

  // --- SELECTION STATES ---
  const [plos, setPlos] = useState<PLO[]>([]);
  const [clos, setClos] = useState<CLO[]>([]);
  const [mappingGrid, setMappingGrid] = useState<Record<number, number>>({});

  const [changedKeys, setChangedKeys] = useState<Set<number>>(new Set());
  const [programs, setPrograms] = useState<any[]>([]);

  // 1. ฟังก์ชันดึง IDs ของหลักสูตรที่ผูกกับเทอมนี้
  const fetchProgramId = async () => {
    try {
      const res = await apiClient.get(
        `/programOnCourse?semester_id=${semesterId}`,
      );
      setPrograms(res.data);
      return Array.isArray(res.data)
        ? res.data.map((item: any) => item.program_id)
        : [];
    } catch {
      showToast(t("Failed to load programs"), "error");
      return [];
    }
  };

  // 2. ฟังก์ชันหลักในการโหลด PLOs ทั้งหมด
  const loadPloData = useCallback(async () => {
    setLoading(true);
    try {
      const currentIds = await fetchProgramId();

      if (currentIds.length === 0) {
        setPlos([]);
        return;
      }

      // ดึง PLOs ของทุกหลักสูตรพร้อมกันใน Request เดียว
      const res = await apiClient.get(
        `/plo?programId=${currentIds.join(",")}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setPlos(res.data);
    } catch (err) {
      console.error("Load PLO Error:", err);
      showToast(t("Failed to load PLO data"), "error");
    } finally {
      setLoading(false);
    }
  }, [semesterId, token, t]);

  useEffect(() => {
    if (token && semesterId) loadPloData();
  }, [loadPloData, token, semesterId]);

  // 3. จัดกลุ่ม PLO ตาม Program ID เพื่อนำไป Loop แสดงผลใน UI
  const groupedPlos = useMemo(() => {
    return programs.reduce((acc: Record<number, any>, prog: any) => {
      const pId = prog.program_id;

      // 🟢 ดึงข้อมูลมาเฉยๆ โดยไม่ต้องสั่ง .sort()
      const associatedPlos = plos.filter((plo) => plo.program_id === pId);

      acc[pId] = {
        info: prog.program || prog,
        plos: associatedPlos, // <--- ลำดับจะเป็นไปตามที่ API ส่งมา
      };
      return acc;
    }, {});
  }, [plos, programs]);

  // B. Fetch CLOs AND Existing Mappings
  useEffect(() => {
    // 1. ตรวจสอบเงื่อนไข: ต้องมีครบถึงจะเริ่มโหลด
    if (!masterCourseId || !semesterId || !token || !programs) {
      setClos([]);
      setMappingGrid({});
      return;
    }

    setLoading(true);

    // 2. เตรียมรายการ program_id (แปลงจาก Array Objects เป็น String "7,8")
    const pIds = Array.isArray(programs)
      ? programs.map((p) => p.program_id).join(",")
      : "";

    Promise.all([
      // ดึง CLO
      apiClient.get(`/clo?courseId=${masterCourseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      // ดึง Mapping (ส่งทั้ง semesterId และ pIds)
      apiClient.get(`/mapping/clo-plo/${masterCourseId}`, {
        params: {
          semesterId: semesterId,
          programId: pIds,
        },
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([cloRes, mappingRes]) => {
        setClos(cloRes.data);

        const newGrid: Record<string, number> = {}; // 🟢 ใช้ string key
        const mappings = Array.isArray(mappingRes.data) ? mappingRes.data : [];

        mappings.forEach((m: any) => {
          // 🟢 สร้าง Key 4 มิติให้ตรงกับ Backend Logic
          // ใช้ semesterId จากตัวแปรภายนอกได้เลย เพราะ API กรองมาให้แล้ว
          const key = `${m.clo_id}_${m.plo_id}_${m.program_id}_${semesterId}`;
          newGrid[key] = Number(m.weight);
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

    // 🟢 เพิ่ม programs เข้าไปใน deps เพื่อให้โหลดใหม่ถ้าหลักสูตรที่เลือกเปลี่ยนไป
  }, [masterCourseId, semesterId, token, programs, showToast, t]);

  // --------------------------------------------------------
  // 3. VALIDATION & HANDLERS
  // --------------------------------------------------------

  // 🟢 เพิ่ม programId เป็น parameter ตัวที่ 3
  const handleWeightChange = (
    cloId: number,
    ploId: number,
    programId: number,
    val: string,
  ) => {
    // 1. อนุญาตให้เป็นค่าว่างได้ (เพื่อการลบ) และต้องเป็นตัวเลขเท่านั้น
    if (val !== "" && isNaN(Number(val))) return;

    // 2. จำกัดไม่ให้เกิน 100 (ถ้าต้องการ)
    if (Number(val) > 100) return;

    // 3. สร้าง Key 4 มิติ (ต้องมั่นใจว่า semesterId มีค่า)
    const key = `${cloId}_${ploId}_${programId}_${semesterId}`;

    setMappingGrid((prev) => ({
      ...prev,
      [key]: val,
    }));

    setChangedKeys((prev) => new Set(prev).add(key));
  };

  // const cloTotals = useMemo(() => {
  //   const totals: Record<number, number> = {};

  //   Object.keys(mappingGrid).forEach((key) => {
  //     const [cloIdStr] = key.split("_");
  //     const cloId = Number(cloIdStr);

  //     // 🟢 FIX: Explicitly cast to Number and handle NaN/undefined
  //     const rawValue = mappingGrid[key];
  //     const weight = Number(rawValue) || 0;

  //     if (clos.some((c) => c.id === cloId)) {
  //       // 🟢 FIX: Use parseFloat or Number to ensure mathematical addition
  //       const currentTotal = totals[cloId] || 0;
  //       totals[cloId] = Number((currentTotal + weight).toFixed(4));
  //     }
  //   });

  //   clos.forEach((clo) => {
  //     if (!(clo.id in totals)) {
  //       totals[clo.id] = 0;
  //     }
  //   });

  //   return totals;
  // }, [mappingGrid, clos]);

  const [activeProgramId, setActiveProgramId] = useState<number | null>(null);

  // เมื่อ plos โหลดมาแล้ว ให้เลือก Program แรกเป็นค่าเริ่มต้นอัตโนมัติ
  useEffect(() => {
    if (plos.length > 0 && !activeProgramId) {
      setActiveProgramId(plos[0].program_id);
    }
  }, [plos, activeProgramId]);

  // กรองเฉพาะ PLO ของหลักสูตรที่เลือกอยู่
  const filteredPlos = useMemo(() => {
    return plos
      .filter((p) => p.program_id === activeProgramId)
      .sort((a, b) =>
        // 🟢 เรียงลำดับแบบ Numeric (PLO1, PLO2, ..., PLO10)
        a.code.localeCompare(b.code, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [plos, activeProgramId]);

  const isValidationSuccess = useMemo(() => {
    if (!activeProgramId || !groupedPlos || !groupedPlos[activeProgramId]) {
      return true;
    }

    const currentProgramPlos = groupedPlos[activeProgramId]?.plos || [];
    if (currentProgramPlos.length === 0) return true;

    return clos.every((clo) => {
      const rowTotal = currentProgramPlos.reduce((sum, plo) => {
        // 🟢 แก้ไขตรงนี้ให้เป็น 4 มิติ
        const key = `${clo.id}_${plo.id}_${activeProgramId}_${semesterId}`;
        return sum + (Number(mappingGrid[key]) || 0);
      }, 0);

      return rowTotal === 0 || Math.abs(rowTotal - 100) < 0.01;
    });
  }, [mappingGrid, activeProgramId, clos, groupedPlos, semesterId]); // 🟢 อย่าลืมใส่ semesterId ใน deps

  const handleSave = async () => {
    if (!token) return;

    if (changedKeys.size === 0) {
      showToast(t("No changes to save"), "success");
      return;
    }

    if (!isValidationSuccess) {
      showToast(t("please ensure all row totals reach 100 percent"), "error");
      return;
    }

    setLoading(true);

    const updates = Array.from(changedKeys).map((key) => {
      const [cloId, ploId, programId, semId] = key.split("_"); // 🟢 ดึง semId ออกมา
      return {
        clo_id: Number(cloId),
        plo_id: Number(ploId),
        program_id: Number(programId),
        semester_id: Number(semId), // 🟢 ส่งไป Backend
        weight: Number(mappingGrid[key]) || 0,
      };
    });

    try {
      await apiClient.post(
        "/mapping/clo-plo",
        { updates }, // 🟢 ส่งแค่ updates ก้อนเดียวพอ
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast(t("Mapping saved successfully!"), "success");
      setChangedKeys(new Set());
    } catch (err: any) {
      console.error("Save Error:", err);
      showToast(
        err.response?.data?.message || t("Failed to save mapping"),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleClearOnlyActive = () => {
    if (!activeProgramId || !filteredPlos.length) return;

    setMappingGrid((prev) => {
      const newGrid = { ...prev };
      const newChangedKeys = new Set(changedKeys);
      let hasCleared = false;

      clos.forEach((clo) => {
        filteredPlos.forEach((plo) => {
          const key = `${clo.id}_${plo.id}_${activeProgramId}_${semesterId}`;

          // 🟢 ตรวจสอบ: ถ้าช่องนี้มีข้อมูล (weight > 0) ให้เคลียร์เป็น 0
          if (Number(prev[key]) > 0) {
            newGrid[key] = 0;
            newChangedKeys.add(key); // แจ้งเตือนว่ามีการเปลี่ยนแปลงเพื่อรอ Save
            hasCleared = true;
          }
        });
      });

      if (!hasCleared) {
        showToast(t("No data to clear in this table"), "info");
        return prev; // ไม่ต้อง Update State ถ้าไม่มีอะไรให้เคลียร์
      }

      setChangedKeys(newChangedKeys);
      showToast(
        t("Cleared active cells (Click Save to update database)"),
        "success",
      );
      return newGrid;
    });
  };

  // --------------------------------------------------------
  // 4. UI RENDER
  // --------------------------------------------------------
  return (
    <div className="mt-8 space-y-6 animate-in fade-in duration-500">
      {loading && <LoadingOverlay />}

      {/* Header & Save Action */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-2 mb-6">
        {/* Left Side: Title & Info */}
        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">
            {t("CLO to PLO Mapping Matrix")}
          </h3>
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
              {t("Distribute weight percentage for each outcome")}
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Clear Button: ปรับให้ดูนุ่มนวลขึ้น ไม่แข่งกับปุ่ม Save */}
          <button
            onClick={() => setShowConfirmClear(true)}
            className="flex-1 lg:flex-none px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border-2 border-slate-100 text-slate-400 hover:border-rose-100 hover:text-rose-500 hover:bg-rose-50/50 active:scale-95"
          >
            <AlertTriangle size={14} className="opacity-70" />
            {t("Clear Current")}
          </button>

          {/* Save Button: ปุ่มหลักที่โดดเด่น */}
          <button
            onClick={handleSave}
            disabled={loading || !isValidationSuccess || changedKeys.size === 0}
            className={`flex-[2] lg:flex-none px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 
        ${
          !isValidationSuccess
            ? "bg-rose-50 text-rose-400 cursor-not-allowed border-2 border-rose-100 shadow-none"
            : changedKeys.size === 0
              ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              : "bg-slate-900 text-white hover:bg-emerald-600 shadow-emerald-200/50 hover:shadow-emerald-500/20"
        }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("Syncing...")}
              </div>
            ) : (
              <>
                <Save size={16} />
                <span>{t("Save Changes")}</span>
                {changedKeys.size > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-lg text-[9px]">
                    {changedKeys.size}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Container */}

      <div className="space-y-6">
        {/* --- 1. Program Selection Tabs --- */}
        {Object.keys(groupedPlos).length > 1 && (
          <div className="flex flex-wrap gap-2 p-2 bg-slate-100/50 rounded-[2rem] border border-slate-200 w-fit">
            {Object.entries(groupedPlos).map(([pId, data]: [string, any]) => (
              <button
                key={pId}
                onClick={() => setActiveProgramId(Number(pId))}
                className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                  activeProgramId === Number(pId)
                    ? "bg-white text-blue-600 shadow-md scale-105"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                }`}
              >
                {/* 🟢 ดึงชื่อจาก data.info แทนการดึงจาก PLO ตัวแรก */}
                {lang === "th"
                  ? data.info?.program_shortname_th ||
                    data.info?.program?.program_shortname_th
                  : data.info?.program_shortname_en ||
                    data.info?.program?.program_shortname_en}

                <span className="ml-2 opacity-50">
                  ({data.info?.program_year || data.info?.program?.program_year}
                  )
                </span>
              </button>
            ))}
          </div>
        )}

        {/* --- 2. The Matrix Table --- */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto custom-scrollbar">
            {masterCourseId && clos.length > 0 && filteredPlos.length > 0 ? (
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    {/* Diagonal Header */}
                    <th className="sticky left-0 top-0 z-50 bg-slate-50 border-b border-r border-slate-200 w-[120px] h-[70px]">
                      <div className="relative w-full h-full">
                        {/* SVG Line เดิมของคุณ */}
                        <div className="absolute top-3 right-4 text-[10px] font-black text-slate-500">
                          PLO
                        </div>
                        <div className="absolute bottom-3 left-4 text-[10px] font-black text-slate-500">
                          CLO
                        </div>
                      </div>
                    </th>

                    {/* PLO Columns - 🟢 ใช้ filteredPlos */}
                    {filteredPlos.map((plo) => (
                      <th
                        key={plo.id}
                        className="sticky top-0 z-40 border-b border-r border-slate-100 p-5 min-w-[100px] bg-slate-50/80 backdrop-blur-sm text-center"
                      >
                        <span className="text-sm font-black text-blue-600 uppercase">
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
                    // 🟢 แก้ไข: คำนวณ Total เฉพาะของ Program ที่เลือกอยู่
                    const currentProgramTotal = filteredPlos.reduce(
                      (sum, plo) => {
                        // แก้ไข: เพิ่ม _${semesterId} เข้าไปให้ครบ 4 มิติตามที่เก็บใน State
                        const key = `${clo.id}_${plo.id}_${activeProgramId}_${semesterId}`;
                        return sum + (Number(mappingGrid[key]) || 0);
                      },
                      0,
                    );

                    const isTotalValid =
                      Math.abs(currentProgramTotal - 100) < 0.01;

                    return (
                      <tr
                        key={clo.id}
                        className="group hover:bg-slate-50/30 transition-colors"
                      >
                        <td className="sticky left-0 z-30 p-5 bg-white group-hover:bg-slate-50 border-r border-slate-100 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] transition-colors">
                          <span className="text-sm font-black text-slate-700">
                            {clo.code}
                          </span>
                        </td>

                        {/* Weight Inputs - 🟢 ใช้ filteredPlos */}
                        {filteredPlos.map((plo) => {
                          const key = `${clo.id}_${plo.id}_${activeProgramId}_${semesterId}`;
                          const weight = mappingGrid[key] ?? "";
                          const hasValue = Number(weight) > 0;
                          const isChanged = changedKeys.has(key);

                          return (
                            <td
                              key={plo.id}
                              className={`p-1.5 border-r border-slate-50 text-center ${hasValue ? "bg-blue-50/20" : ""}`}
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
                                    activeProgramId!,
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                          );
                        })}

                        {/* Total Cell */}
                        <td
                          className={`sticky right-0 z-30 p-5 text-center shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] transition-all
                    ${isTotalValid ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                        >
                          <span className="text-sm font-black">
                            {currentProgramTotal}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
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

          {/* Footer Error - 🟢 เช็ค Error เฉพาะโปรแกรมที่เลือกอยู่เพื่อความชัดเจน */}
          {!isValidationSuccess && activeProgramId && (
            <div className="p-4 bg-rose-600 flex items-center justify-center gap-3">
              <AlertTriangle size={18} className="text-white" />
              <span className="text-[11px] font-black text-white uppercase tracking-widest">
                {t(
                  "please ensure row totals reach 100 percent for the current program",
                )}
              </span>
            </div>
          )}
          {showConfirmClear && (
            <AlertPopup
              title={t("Confirm Clear")}
              type="confirm"
              message={t(
                "Are you sure you want to clear the current table? This action cannot be undone.",
              )}
              isOpen={showConfirmClear}
              onConfirm={() => {
                handleClearOnlyActive();
                setShowConfirmClear(false);
              }}
              onCancel={() => setShowConfirmClear(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
