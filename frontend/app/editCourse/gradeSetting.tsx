"use client";

import { apiClient } from "@/utils/apiClient";
import React, { useState, useEffect, useCallback } from "react";
import { useGlobalToast } from "@/app/context/ToastContext";
import LoadingOverLay from "@/components/LoadingOverlay";
import { Save, AlertCircle, Trash, Trash2 } from "lucide-react";
import AlertPopup from "@/components/AlertPopup";
import { useTranslation } from "react-i18next";

interface GradeLevel {
  id?: number;
  grade: string;
  score: number | string; // 🟢 ปรับเป็น string เพื่อรองรับการพิมพ์จุดทศนิยมใน UI
}

const DEFAULT_GRADES = ["A", "B+", "B", "C+", "C", "D+", "D"];

export default function GradeSetting({
  semesterId, // 🟢 เปลี่ยนจาก masterCourseId เป็น semesterId
}: {
  semesterId: string | number;
}) {
  const { showToast } = useGlobalToast();
  const [loading, setLoading] = useState(false);
  const [gradeSettings, setGradeSettings] = useState<GradeLevel[]>(() =>
    DEFAULT_GRADES.map((grade, index) => ({
      grade: grade,
      score: String(80 - index * 5), // คำนวณ: 80 - (0*5)=80, 80 - (1*5)=75 ...
    })),
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { t } = useTranslation("common");

  const [isDirty, setIsDirty] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 1. Fetch Existing Data
  // 1. Fetch Existing Data
  const fetchGradeSettings = useCallback(async () => {
    if (!semesterId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`grade/settings/${semesterId}`);
      const fetchedData: GradeLevel[] = res.data;

      if (fetchedData && fetchedData.length > 0) {
        // 🟢 กรณีมีข้อมูลใน DB: ให้เซตสถานะเป็น Saved และไม่ Dirty
        const mergedGrades: GradeLevel[] = DEFAULT_GRADES.map((symbol) => {
          const existing = fetchedData.find((g) => g.grade === symbol);
          return {
            grade: symbol,
            score: existing ? String(existing.score) : "",
          };
        });
        setGradeSettings(mergedGrades);
        setIsSaved(true);
        setIsDirty(false);
      } else {
        // 🟢 กรณีเป็นข้อมูล Default (DB เป็นค่าว่าง):
        // ให้ถือว่าเป็น "Unsaved Changes" เพราะข้อมูลบนจอ (80, 75...) ยังไม่ได้เซฟลง DB
        setIsSaved(false);
        setIsDirty(true);
      }
    } catch {
      showToast("Failed to load settings.", "error");
    } finally {
      setLoading(false);
    }
  }, [semesterId, showToast]);

  useEffect(() => {
    fetchGradeSettings();
  }, [fetchGradeSettings]);

  // 2. Handle Input Changes
  const handleScoreChange = (gradeSymbol: string, val: string) => {
    // 🟢 ใช้ Regex ตรวจสอบ: อนุญาตเฉพาะตัวเลขและจุดทศนิยม 1 จุดเท่านั้น
    // และต้องไม่เกิน 100
    const isFloat = /^[0-9]*\.?[0-9]*$/.test(val);
    const numVal = parseFloat(val);

    if (!isFloat || (val !== "" && numVal > 100)) return;

    setIsDirty(true); // 🟢 บอกว่าข้อมูลมีการเปลี่ยนแปลงแล้วนะ
    setIsSaved(false);

    setGradeSettings((prev) =>
      prev.map((item) =>
        item.grade === gradeSymbol
          ? { ...item, score: val } // 🟢 เก็บเป็น string ดิบๆ เลย (เช่น "80.")
          : item,
      ),
    );
  };

  // 3. Save Function with Validation
  const handleSave = async () => {
    // 🟢 Validation: ตรวจสอบการเรียงลำดับคะแนน (A ต้อง > B+ > B ...)
    for (let i = 0; i < gradeSettings.length - 1; i++) {
      const current = gradeSettings[i].score;
      const next = gradeSettings[i + 1].score;

      if (current !== "" && next !== "" && Number(current) <= Number(next)) {
        showToast(
          `Validation Error: ${gradeSettings[i].grade} must be higher than ${gradeSettings[i + 1].grade}`,
          "error",
        );
        return;
      }
    }

    setLoading(true);
    try {
      const validSettings = gradeSettings
        .filter((g) => g.score !== "")
        .map((g) => ({
          grade: g.grade,
          score: Number(g.score),
        }));

      if (validSettings.length === 0) {
        showToast("Please enter at least one score.", "error");
        setLoading(false);
        return;
      }

      // 🟢 ส่ง payload ตามโครงสร้าง Backend ใหม่
      const payload = {
        semesterId: Number(semesterId),
        settings: validSettings,
      };

      await apiClient.post("grade/settings", payload);
      showToast("Grade settings saved successfully!", "success");
      setIsDirty(false); // 🟢 ข้อมูลตรงกับ Server แล้ว
      setIsSaved(true); // 🟢 แสดง Badge สีเขียว
      fetchGradeSettings();
    } catch {
      showToast("Failed to save grade settings.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setLoading(true);
    try {
      // 1. ลบที่ Backend
      await apiClient.delete("grade/settings/bulk", {
        data: { semesterId: Number(semesterId) },
      });

      showToast(t("All grade settings deleted successfully!"), "success");

      // 2. รีเซ็ต UI กลับเป็นค่า Default 80, 75, 70...
      const resetGrades = DEFAULT_GRADES.map((grade) => ({
        grade: grade,
        score: "",
      }));

      setGradeSettings(resetGrades);
      setIsSaved(false);
      setIsDirty(true); // เซตเป็น Dirty เพราะค่า Default ใหม่นี้ยังไม่ได้ถูกบันทึก
    } catch (err) {
      console.error("Delete Error:", err);
      showToast(t("Failed to delete grade settings."), "error");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // คำนวณคะแนนสูงสุดของเกรด F (คะแนนต่ำสุดที่มีในระบบ)
  const fMaxScore = gradeSettings.reduce((min, item) => {
    if (item.score === "" || item.score === null) return min;

    const currentScore = Number(item.score);
    // 🟢 ถ้า min ยังเป็น 0 (ค่าเริ่มต้น) ให้ใช้ค่าปัจจุบันไปก่อน
    // หรือใช้ Infinity เป็นค่าเริ่มต้นแทน
    return min === 0 ? currentScore : Math.min(min, currentScore);
  }, 0);

  return (
    <div className="p-2 max-w-2xl mx-auto space-y-6">
      {loading && <LoadingOverLay />}

      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] gap-6 transition-all duration-300">
        {/* Left Section: Info & Badges */}
        <div className="flex items-start gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {t("Grade Cutoff")}
              </h2>

              {/* Dynamic Status Badges */}
              <div className="flex items-center">
                {!isSaved && isDirty ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-indigo-100 animate-pulse">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    {t("Ready to Setup")}
                  </span>
                ) : isDirty ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-100">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    {t("Pending Save")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-100">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    {t("Saved")}
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic Descriptions */}
            {!isSaved ? (
              <div className="flex items-center gap-2 text-[13px] font-medium text-indigo-500/90 bg-indigo-50/40 px-3 py-1.5 rounded-xl border border-indigo-100/30 w-fit">
                <AlertCircle size={14} className="shrink-0" />
                {t("This is the default score, you can change it as needed.")}
              </div>
            ) : isSaved && !isDirty ? (
              <p className="text-sm text-slate-400 font-medium tracking-wide pl-1">
                {t("Current configuration is synced with server")}
              </p>
            ) : null}
          </div>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button onClick={() => setShowDeleteConfirm(true)}>
            <Trash2
              size={18}
              className="text-rose-500 hover:text-rose-700 transition-colors"
            />
          </button>

          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`flex-[2] lg:flex-none px-10 py-3 font-bold text-[11px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-sm ${
              isDirty
                ? "bg-slate-900 text-white shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-100 active:scale-95"
                : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
            }`}
          >
            <Save size={18} />
            {t("Apply Settings")}
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-10 py-5 text-left text-[16px] font-light text-slate-600 uppercase tracking-[0.2em]">
                {t("Grade Symbol")}
              </th>
              <th className="px-10 py-5 text-left text-[16px] font-light text-slate-600 uppercase tracking-[0.2em]">
                {t("Min Score Requirement")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {gradeSettings.map((item) => (
              <tr
                key={item.grade}
                className="hover:bg-slate-50/80 transition-colors group"
              >
                <td className="px-10 py-5">
                  <span
                    className={`text-lg font-black w-12 h-12 flex items-center justify-center rounded-2xl ${
                      item.grade === "A"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.grade}
                  </span>
                </td>
                <td className="px-10 py-5">
                  <div className="relative flex items-center max-w-[200px]">
                    <span className="absolute left-4 text-slate-400 font-black text-lg">
                      &ge;
                    </span>
                    <input
                      type="text"
                      placeholder="0.00"
                      className={`block w-full pl-10 pr-4 py-3 border-2 rounded-2xl text-lg font-black transition-all outline-none ${
                        item.score !== ""
                          ? "border-blue-100 bg-blue-50/30 text-blue-600 focus:border-blue-500"
                          : "border-slate-100 bg-white text-slate-400 focus:border-slate-300"
                      }`}
                      // 🟢 แสดงค่าเป็น string เสมอเพื่อให้พิมพ์ทศนิยมได้ต่อเนื่อง
                      value={item.score}
                      onChange={(e) => {
                        const val = e.target.value;
                        // 🟢 อนุญาตเฉพาะ ตัวเลข และ จุดทศนิยมหนึ่งจุดเท่านั้น
                        if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                          handleScoreChange(item.grade, val);
                        }
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}

            {/* Read-only Row for F */}
            <tr className="bg-rose-50/30">
              <td className="px-10 py-6">
                <span className="text-lg font-black w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  F
                </span>
              </td>
              <td className="px-10 py-6">
                <div className="flex items-center gap-3 text-rose-400">
                  <AlertCircle size={18} />
                  <span className="text-[16px] font-light uppercase tracking-widest italic">
                    {t("Below")} {fMaxScore > 0 ? fMaxScore : "-"}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
        <AlertCircle className="text-amber-500 shrink-0" size={20} />
        <p className="text-[16px] text-amber-700 font-light leading-relaxed uppercase tracking-wider">
          {t(
            "Warning: Ensure scores are in descending order (A > B+ > B ...). Students who do not meet the D requirement will automatically receive an F",
          )}
        </p>
      </div>

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && (
        <AlertPopup
          title="Confirm Deletion"
          type="confirm"
          isOpen={showDeleteConfirm}
          message="Are you sure you want to delete all grade settings? This action cannot be undone."
          onConfirm={() => {
            handleDeleteAll();
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
