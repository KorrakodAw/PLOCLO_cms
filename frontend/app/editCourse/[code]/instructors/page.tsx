"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Trash2,
  UserPlus,
  Users,
  Mail,
  ShieldCheck,
  Search,
} from "lucide-react";
import { apiClient } from "@/utils/apiClient";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useAuth } from "@/app/context/AuthContext";
import LoadingOverlay from "@/components/LoadingOverlay";
import BreadCrumb from "@/components/BreadCrumb";
import AlertPopup from "@/components/AlertPopup";

interface Instructor {
  id: number;
  full_thai_name: string;
  full_eng_name: string;
  email: string;
  phoneNum?: string;
}

interface CourseData {
  name: string;
  name_th: string;
  code: string;
}

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function CourseInstructorsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const courseCode = resolvedParams?.code ?? "";
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") ?? "";

  const { token } = useAuth();
  const { t, i18n } = useTranslation("common");
  const { showToast } = useGlobalToast();
  const lang = i18n.language;

  const [loading, setLoading] = useState(true);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [currentInstructors, setCurrentInstructors] = useState<Instructor[]>(
    [],
  );
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);

  const [instructorToDelete, setInstructorToDelete] = useState<number | null>(
    null,
  );
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const fetchData = async () => {
    if (!token || !courseId) return;
    try {
      setLoading(true);

      // 1. ดึงข้อมูลวิชา และ อาจารย์ที่สอนวิชานี้อยู่แล้ว
      const [courseRes, currentRes] = await Promise.all([
        apiClient.get(`/course/ById/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/instructorOnCourse/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const courseInfo = courseRes.data;
      setCourseData(courseInfo);
      setCurrentInstructors(currentRes.data || []);

      // 2. ดึงข้อมูล Program เพื่อหา Faculty ID
      const facultyId = courseInfo?.faculty_id;
      // สร้างตัวแปร Local ไว้เก็บค่าเพื่อใช้ต่อทันที

      // 3. ตรวจสอบและดึงรายชื่ออาจารย์ "ทั้งหมด" ในคณะ
      // ใช้ facultyId แทนการใช้ State (facultyUsingId)
      if (facultyId) {
        const allInstRes = await apiClient.get(
          `/instructor?facultyId=${facultyId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setAllInstructors(allInstRes.data || []);
      } else {
        console.warn(
          "Could not find Faculty ID associated with this course program",
        );
        setAllInstructors([]);
      }
    } catch (error) {
      console.error("Data Fetch Error:", error);
      showToast(t("Failed to load data"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId, token]);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) return;

    try {
      const res = await apiClient.post("/instructorOnCourse/on-course/bulk", {
        courseId,
        instructorIds: selectedIds,
      });

      showToast(
        `Assigned ${res.data.count} instructors successfully`,
        "success",
      );
      fetchData(); // Refresh รายชื่ออาจารย์ที่ได้รับมอบหมายแล้ว
      setSelectedIds([]); // Clear selection
    } catch {
      showToast("Failed to assign instructors", "error");
    }
  };

  const [searchStaff, setSearchStaff] = useState(""); // 🟢 State สำหรับค้นหาใน UI

  const filteredAllInstructors = useMemo(() => {
    // 1. กรองคนที่เป็นอาจารย์ในวิชานี้อยู่แล้วออก
    const notAssigned = allInstructors.filter(
      (all) => !currentInstructors.some((curr) => curr.id === all.id),
    );

    // 2. กรองตามคำค้นหา (ชื่อไทย, ชื่ออังกฤษ หรือ Email)
    if (!searchStaff) return notAssigned;

    const searchLower = searchStaff.toLowerCase();
    return notAssigned.filter(
      (inst) =>
        inst.full_thai_name?.toLowerCase().includes(searchLower) ||
        inst.full_eng_name?.toLowerCase().includes(searchLower) ||
        inst.email?.toLowerCase().includes(searchLower),
    );
  }, [allInstructors, currentInstructors, searchStaff]);

  // ฟังก์ชันจัดการ Checkbox
  const toggleInstructor = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // const handleAddInstructor = async () => {
  //   if (!selectedInstructorToAdd || !token || !courseId) return;
  //   try {
  //     setLoading(true);
  //     await apiClient.post(
  //       `/instructorOnCourse`,
  //       { courseId, instructorId: Number(selectedInstructorToAdd) },
  //       { headers: { Authorization: `Bearer ${token}` } },
  //     );
  //     showToast(t("Added successfully"), "success");
  //     setSelectedInstructorToAdd("");
  //     fetchData();
  //   } catch {
  //     showToast(t("Failed to add"), "error");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleRemoveInstructor = async () => {
    if (!instructorToDelete || !token || !courseId) return;
    try {
      setLoading(true);
      await apiClient.delete(
        `/instructorOnCourse/${courseId}/${instructorToDelete}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast(t("Removed successfully"), "success");
      setShowDeletePopup(false);
      setInstructorToDelete(null);
      fetchData();
    } catch {
      showToast(t("Failed to remove"), "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !courseData) return <LoadingOverlay />;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* 1. Breadcrumb Bar */}
      <div className="px-8 py-5">
        <BreadCrumb
          items={[
            { label: t("manage courses"), href: "/editCourse" },
            {
              label:
                (lang === "en" ? courseData?.name : courseData?.name_th) ||
                courseCode,
              href: `/editCourse/${courseCode}`,
            },
            { label: t("Instructors") },
          ]}
        />
      </div>

      {/* 2. Main Container */}
      <main className="px-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Course Info & Assigned List */}
        <div className="lg:col-span-3 space-y-6">
          {/* Course Header Card */}
          <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {lang === "en" ? courseData?.name : courseData?.name_th}
              </h1>
              <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs uppercase tracking-wider border border-gray-200">
                  {courseCode}
                </span>
              </p>
            </div>
          </div>

          {/* Sidebar: Assign Instructor */}
          <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600">
                <UserPlus size={20} />
                <h2 className="font-bold uppercase tracking-tight text-sm">
                  {t("Select Staff")}
                </h2>
              </div>
              <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                {selectedIds.length} {t("Selected")}
              </span>
            </div>

            {/* 🟢 Search Bar ใน UI */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder={t("Search name or email...")}
                value={searchStaff}
                onChange={(e) => setSearchStaff(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* 🟢 รายการอาจารย์แบบ Fixed Height */}
            <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-lg p-1 space-y-1 bg-gray-50/30 custom-scrollbar">
              {filteredAllInstructors.length > 0 ? (
                filteredAllInstructors.map((inst) => (
                  <label
                    key={inst.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                      selectedIds.includes(inst.id)
                        ? "bg-blue-50 border-blue-200 shadow-sm"
                        : "bg-white border-transparent hover:border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.includes(inst.id)}
                      onChange={() => toggleInstructor(inst.id)}
                    />
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-gray-700 truncate">
                        {lang === "th"
                          ? inst.full_thai_name
                          : inst.full_eng_name}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {inst.email}
                      </p>
                    </div>
                  </label>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs text-gray-400 italic">
                    {t("No staff found")}
                  </p>
                </div>
              )}
            </div>

            {/* ปุ่ม Confirm */}
            <button
              onClick={handleBulkAssign}
              disabled={selectedIds.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-lg font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              {t("Confirm Assignment")}
            </button>
          </div>

          {/* Assigned Instructors List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1 text-gray-600">
              <Users size={20} />
              <h2 className="font-bold uppercase tracking-tight text-sm">
                {t("Assigned Instructors")} ({currentInstructors.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentInstructors.map((inst) => (
                <div
                  key={inst.id}
                  className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm flex justify-between items-center hover:border-blue-300 transition-colors group"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0 border border-blue-100 uppercase">
                      {inst.full_eng_name?.charAt(0) || "T"}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-gray-800 truncate">
                        {lang === "th"
                          ? inst.full_thai_name
                          : inst.full_eng_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate">{inst.email}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setInstructorToDelete(inst.id);
                      setShowDeletePopup(true);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {currentInstructors.length === 0 && (
                <div className="col-span-full py-16 bg-white border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
                  <Users size={40} className="mb-2 opacity-20" />
                  <p className="text-sm">
                    {t("No instructors assigned to this course yet")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Action Sidebar */}
      </main>

      {/* Removal Confirmation */}
      <AlertPopup
        title={t("Confirm Removal")}
        type="confirm"
        message={t(
          "Are you sure you want to remove this instructor from the course?",
        )}
        isOpen={showDeletePopup}
        onConfirm={handleRemoveInstructor}
        onCancel={() => {
          setShowDeletePopup(false);
          setInstructorToDelete(null);
        }}
      />
    </div>
  );
}
