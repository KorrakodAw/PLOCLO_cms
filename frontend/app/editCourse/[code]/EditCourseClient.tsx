"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen,
  Calculator,
  UserPlus,
  Trash2,
  Edit3,
  Copy,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useTranslation } from "react-i18next";
import { Course, getCoursePaginate } from "@/utils/courseApi";
import { apiClient } from "@/utils/apiClient";

import LoadingOverlay from "@/components/LoadingOverlay";
import DropdownSelect from "@/components/DropdownSelect";
import FormEditPopup from "@/components/EditPopup";
import BreadCrumb from "@/components/BreadCrumb";
import AlertPopup from "@/components/AlertPopup";
import { useRouter } from "next/navigation";

// Sub-components
import CLOManagement from "../cloManage";
import AddStudentCourse from "../addStudentCourse";
import CloPloMapping from "../cloploMapping";
import AssignmentMapping from "../assignmentMapping";
import AssignmentCloMapping from "../assignmentCloMapping";
import ScoreMapping from "../scoreMapping";
import GradeSetting from "../gradeSetting";
import ScoreCalculated from "../scoreCalculatedforGrade";
import AssignmentCateWeight from "../assignmentCateWeight";

export default function EditCourseClient({
  courseCode,
}: {
  courseCode: string;
}) {
  const router = useRouter();
  const { isLoggedIn, token } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  const [duplicateCourses, setDuplicateCourses] = useState<Course[]>([]);
  const [formData, setFormData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"setup" | "grading">("setup");
  const [activeTab, setActiveTab] = useState<string>("clo");

  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);

  const loadInitialData = useCallback(async () => {
    if (!token || !courseCode) return;
    setLoading(true);
    try {
      const res = await getCoursePaginate(token, 1, 100, { courseCode });
      const matching = (res.data || []).filter(
        (c: any) => String(c.code) === String(courseCode),
      );

      if (matching.length > 0) {
        setDuplicateCourses(matching);
        const latest = [...matching].sort(
          (a, b) =>
            Number(b.year) - Number(a.year) ||
            Number(b.semester) - Number(a.semester) ||
            Number(a.section) - Number(b.section),
        )[0];

        if (!selectedSectionId) {
          setSelectedTerm(`${latest.year}-${latest.semester}`);
          setSelectedSectionId(String(latest.id));
        }
      } else {
        setError(t("Course data not found."));
      }
    } catch {
      setError(t("Failed to load course data."));
    } finally {
      setLoading(false);
    }
  }, [token, courseCode, t, selectedSectionId]);

  useEffect(() => {
    if (isLoggedIn) loadInitialData();
  }, [isLoggedIn, loadInitialData]);

  useEffect(() => {
    const found = duplicateCourses.find(
      (c) => String(c.id) === selectedSectionId,
    );
    if (found) setFormData(found);
  }, [selectedSectionId, duplicateCourses]);

  const termOptions = useMemo(() => {
    const unique = Array.from(
      new Set(duplicateCourses.map((c: any) => `${c.year}-${c.semester}`)),
    )
      .map((term) => {
        const [y, s] = term.split("-");
        return {
          label: `${t("year")} ${y} / ${t("semester")} ${s}`,
          value: term,
        };
      })
      .sort((a, b) => b.value.localeCompare(a.value));
    return unique;
  }, [duplicateCourses, t]);

  const sectionOptions = useMemo(() => {
    const [y, s] = selectedTerm.split("-");
    return duplicateCourses
      .filter((c: any) => String(c.year) === y && String(c.semester) === s)
      .sort((a: any, b: any) => Number(a.section) - Number(b.section))
      .map((c: any) => ({
        label: `${t("Section")} ${c.section}`,
        value: String(c.id),
      }));
  }, [selectedTerm, duplicateCourses, t]);

  const handleTermChange = (termValue: string) => {
    setSelectedTerm(termValue);
    const [y, s] = termValue.split("-");
    const firstMatch = duplicateCourses.find(
      (c: any) => String(c.year) === y && String(c.semester) === s,
    );
    if (firstMatch) setSelectedSectionId(String(firstMatch.id));
  };

  const handleDuplicateSection = async () => {
    if (!formData || !token) return;
    setLoading(true);
    try {
      const currentSections = sectionOptions.map((o) =>
        Number(o.label.split(" ")[1]),
      );
      const nextNum = Math.max(...currentSections, 0) + 1;
      const res = await apiClient.post(
        "/course",
        { ...formData, section: nextNum },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast(`${t("Duplicated to Section")} ${nextNum}`, "success");
      const refresh = await getCoursePaginate(token, 1, 100, { courseCode });
      setDuplicateCourses(
        refresh.data.filter((c: any) => String(c.code) === String(courseCode)),
      );
      setSelectedSectionId(String(res.data.data.id));
    } catch {
      showToast(t("Failed to duplicate"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!formData || !token) return;
    setLoading(true);
    try {
      await apiClient.delete(`/course/${formData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(t("Section deleted"), "success");
      setShowDeletePopup(false);
      if (duplicateCourses.length === 1) router.push("/editCourse");
      else {
        setSelectedSectionId("");
        loadInitialData();
      }
    } catch {
      showToast(t("Delete failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  if (error)
    return (
      <div className="p-20 text-center font-bold text-rose-500">{error}</div>
    );
  if (!formData) return <LoadingOverlay />;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {loading && <LoadingOverlay />}

      <div className="px-6 py-6 max-w-[1600px] mx-auto">
        <BreadCrumb
          items={[
            { label: t("course management"), href: "/editCourse" },
            {
              label: `${formData.code} - ${lang === "en" ? formData.name : formData.name_th}`,
              href: "#",
            },
          ]}
        />
      </div>

      <div className="px-6 max-w-[1600px] mx-auto space-y-6">
        {/* --- HEADER CARD --- */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 md:p-10 flex flex-col lg:flex-row justify-between items-start gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">
                Course ID: {formData.course_id}
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                {lang === "en" ? formData.name : formData.name_th}
                <span className="text-orange-500 block md:inline md:ml-4 opacity-70">
                  ({formData.code})
                </span>
              </h1>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    router.push(
                      `/editCourse/${courseCode}/instructors?courseId=${formData.course_id}`,
                    )
                  }
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-light text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all border border-blue-100 uppercase tracking-wider"
                >
                  <UserPlus size={16} strokeWidth={2.5} />{" "}
                  {t("Manage Instructors")}
                </button>
                <button
                  onClick={() => setShowEditPopup(true)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-light text-slate-500 bg-slate-50 hover:bg-slate-200 rounded-xl transition-all border border-slate-100 uppercase tracking-wider"
                >
                  <Edit3 size={16} strokeWidth={2.5} /> {t("Settings")}
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 w-full lg:w-auto bg-white p-2 rounded-[2.5rem] ">
              {/* Semester / Year Selector */}
              <div className="flex-1 lg:w-64 p-4 transition-colors rounded-[2rem] group">
                <label className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3 ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  {t("Semester / Year")}
                </label>
                <div className="relative">
                  <DropdownSelect
                    value={selectedTerm}
                    options={termOptions}
                    onChange={(v) => handleTermChange(String(v))}
                    // แนะนำให้เพิ่ม className ใน DropdownSelect เพื่อปรับแต่งขอบให้มนขึ้น
                  />
                </div>
              </div>

              {/* Divider (แสดงเฉพาะบนจอใหญ่) */}
              <div className="hidden md:block w-px h-12 bg-slate-100 self-center" />

              {/* Section Group Selector */}
              <div className="flex-1 lg:w-52 p-4 transition-colors rounded-[2rem] group">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1 group-hover:text-blue-500 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors" />
                  {t("Section Group")}
                </label>
                <div className="relative">
                  <DropdownSelect
                    value={selectedSectionId}
                    options={sectionOptions}
                    onChange={(v) => setSelectedSectionId(String(v))}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="px-10 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end items-center gap-6">
            <button
              onClick={() => setShowDuplicatePopup(true)}
              className="flex items-center gap-2 text-[14px] font-light text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
            >
              <Copy size={14} /> {t("Duplicate Section")}
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <button
              onClick={() => setShowDeletePopup(true)}
              className="flex items-center gap-2 text-[14px] font-light text-slate-400 hover:text-rose-600 uppercase tracking-widest transition-colors"
            >
              <Trash2 size={14} /> {t("Delete This Section")}
            </button>
          </div>
        </div>

        {/* --- NAVIGATION TABS --- */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 sticky top-6 z-[40]">
          <div className="p-1.5 bg-white shadow-xl shadow-slate-200/50 rounded-[1.8rem] border border-slate-200 flex flex-1 xl:flex-none">
            <button
              onClick={() => {
                setViewMode("setup");
                setActiveTab("clo");
              }}
              className={`flex-1 px-8 py-3.5 rounded-[1.4rem] text-[16px] font-light uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${viewMode === "setup" ? "bg-slate-900 text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <BookOpen size={18} strokeWidth={2.5} /> {t("Course Setup")}
            </button>
            <button
              onClick={() => {
                setViewMode("grading");
                setActiveTab("grade-setting");
              }}
              className={`flex-1 px-8 py-3.5 rounded-[1.4rem] text-[16px] font-light uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${viewMode === "grading" ? "bg-emerald-600 text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <Calculator size={18} strokeWidth={2.5} /> {t("Scores & Grading")}
            </button>
          </div>

          <div className="flex-1 overflow-x-auto no-scrollbar p-1.5 bg-slate-100/50 rounded-[1.8rem] border border-slate-200 flex gap-2">
            {(viewMode === "setup"
              ? [
                  { id: "clo", label: t("clo") },
                  { id: "student", label: t("student") },
                  { id: "mapping", label: t("CLO–PLO Mapping") },
                  {
                    id: "assignment-weight",
                    label: t("assessment-category-weights"),
                  },
                  { id: "assignment", label: t("assessment") },
                  {
                    id: "assignment-clo-mapping",
                    label: t("Assessment–CLO Mapping"),
                  },
                ]
              : [
                  { id: "grade-setting", label: t("Grade Setting") },
                  { id: "score-mapping", label: t("Score Mapping") },
                  { id: "score-calculated", label: t("Score Calculated") },
                ]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3.5 rounded-[1.4rem] text-[16px] font-light uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-white text-blue-600 shadow-md scale-105" : "text-slate-400 hover:text-slate-600 hover:bg-white/50"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* --- DYNAMIC CONTENT AREA --- */}
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 md:p-12">
            {/* Master Course Data (ID ระดับวิชา) */}
            {activeTab === "clo" && (
              <CLOManagement courseId={String(formData.course_id)} />
            )}
            {activeTab === "grade-setting" && (
              <GradeSetting semesterId={String(formData.semester_id)} />
            )}
            {activeTab === "mapping" && (
              <CloPloMapping
                masterCourseId={String(formData.course_id)}
                programId={formData.program_id}
              />
            )}

            {/* Semester Config Data (ID ระดับเทอมเรียน) */}
            {activeTab === "assignment" && (
              <AssignmentMapping semesterId={String(formData.semester_id)} />
            )}
            {activeTab === "assignment-weight" && (
              <AssignmentCateWeight semesterId={String(formData.semester_id)} />
            )}
            {activeTab === "assignment-clo-mapping" && (
              <AssignmentCloMapping
                semesterId={String(formData.semester_id)}
                courseId={String(formData.course_id)}
              />
            )}

            {/* Section Specific Data (ID ระดับกลุ่มเรียน) */}
            {activeTab === "student" && (
              <AddStudentCourse
                masterCourseId={String(formData.course_id)}
                programId={formData.program_id}
                sectionId={String(formData.id)}
                semesterId={String(formData.semester_id)}
              />
            )}
            {activeTab === "score-mapping" && (
              <ScoreMapping
                semesterId={String(formData.semester_id)}
                sectionId={String(formData.id)}
              />
            )}
            {activeTab === "score-calculated" && (
              <ScoreCalculated
                semesterId={String(formData.semester_id)}
                sectionId={String(formData.id)}
              />
            )}
          </div>
        </div>
      </div>

      <AlertPopup
        isOpen={showDuplicatePopup}
        type="confirm"
        title={t("Confirm Duplicate")}
        message={t("Create a new section for this semester?")}
        onConfirm={() => {
          setShowDuplicatePopup(false);
          handleDuplicateSection();
        }}
        onCancel={() => setShowDuplicatePopup(false)}
      />
      <AlertPopup
        isOpen={showDeletePopup}
        type="confirm"
        title={t("Confirm Delete")}
        message={`${t("Delete Section")} ${formData.section}?`}
        onConfirm={handleDeleteSection}
        onCancel={() => setShowDeletePopup(false)}
      />
    </div>
  );
}
