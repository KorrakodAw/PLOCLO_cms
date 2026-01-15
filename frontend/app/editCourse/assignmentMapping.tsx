"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../../components/Toast";
import { apiClient } from "../../utils/apiClient";
import LoadingOverlay from "@/components/LoadingOverlay";
import FormEditPopup from "@/components/EditPopup";
import AlertPopup from "@/components/AlertPopup";

interface Assignment {
  id: number;
  course_id: number;
  name: string;
  category: string;
  description: string;
  max_score: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

export default function AssignmentMapping({ courseId }: { courseId: string }) {
  const { token } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [newAssignName, setNewAssignName] = useState("");
  const [newAssignCategory, setNewAssignCategory] = useState("");
  const [newAssignWeight, setNewAssignWeight] = useState<string>("");
  const [newAssignMaxScore, setNewAssignMaxScore] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editFormData, setEditFormData] = useState<Assignment | null>(null);

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<number | null>(
    null
  );

  // 🟢 NEW STATE: For Delete All Confirmation
  const [showDeleteAllPopup, setShowDeleteAllPopup] = useState(false);

  // 1. Fetch Assignments
  const fetchAssignments = async () => {
    if (!courseId || !token) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/assignment?courseId=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch assignments", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [courseId, token]);

  // 2. Handle Create with Duplicate Check
  const handleAddAssignment = async () => {
    if (!newAssignName.trim() || Number(newAssignWeight) <= 0) {
      showToast("Please provide a name and a valid weight", "error");
      return;
    }

    const isDuplicate = assignments.some(
      (a) => a.name.trim().toLowerCase() === newAssignName.trim().toLowerCase()
    );

    if (isDuplicate) {
      showToast("An assignment with this name already exists.", "error");
      return;
    }

    if (!newAssignCategory) {
      showToast("Please select a category", "error");
      return;
    }

    const payload = {
      course_id: Number(courseId),
      name: newAssignName.trim(),
      max_score: Number(newAssignMaxScore),
      category: newAssignCategory, // Check if this is "final" or "finalExam"
      weight: Number(newAssignWeight),
    };

    try {
      setLoading(true);
      await apiClient.post("/assignment", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(payload);

      showToast("Assignment added!", "success");
      // setNewAssignCategory("");
      // setNewAssignName("");
      // setNewAssignWeight("");
      // setNewAssignMaxScore("");
      fetchAssignments();
    } catch {
      showToast("Failed to add assignment", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAssignment = (id: number) => {
    const assignmentToEdit = assignments.find((a) => a.id === id);
    if (assignmentToEdit) {
      const cleanedData = {
        ...assignmentToEdit,
        max_score: parseFloat(Number(assignmentToEdit.max_score).toString()),
        weight: parseFloat(Number(assignmentToEdit.weight).toString()),
      };

      setEditFormData(cleanedData);
      setShowEditPopup(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editFormData || !token) return;

    try {
      setLoading(true);
      await apiClient.patch(
        `/assignment/${editFormData.id}`,
        {
          name: editFormData.name,
          max_score: Number(editFormData.max_score),
          weight: Number(editFormData.weight),
          description: editFormData.description,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      showToast("Assignment updated successfully", "success");
      setShowEditPopup(false);
      fetchAssignments();
    } catch {
      showToast("Failed to update assignment", "error");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Delete Single
  const handleDeleteAssignment = async (targetId: number | null) => {
    if (!targetId) return;

    try {
      setLoading(true);
      await apiClient.delete(`/assignment/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast("Assignment deleted!", "success");

      fetchAssignments();
      setShowDeletePopup(false);
      setAssignmentToDelete(null);
    } catch (err) {
      console.error(err);
      showToast("Failed to delete assignment", "error");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 NEW: Handle Delete All
  const handleDeleteAllAssignments = async () => {
    if (assignments.length === 0) return;

    try {
      setLoading(true);
      // Option A: Backend supports bulk delete (e.g., DELETE /assignments?courseId=123)
      // await apiClient.delete(`/assignments?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } });

      // Option B: Frontend Loop (slower but works without backend changes)
      const deletePromises = assignments.map((a) =>
        apiClient.delete(`/assignment/${a.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      await Promise.all(deletePromises);

      showToast("All assignments deleted!", "success");
      fetchAssignments();
      setShowDeleteAllPopup(false);
    } catch (err) {
      console.error(err);
      showToast("Failed to delete all assignments", "error");
    } finally {
      setLoading(false);
    }
  };

  // 4. Logic for Summary and Filtering
  const summary = useMemo(() => {
    const getW = (k: string) =>
      assignments
        .filter((a) => a.name.toLowerCase().includes(k))
        .reduce((s, a) => s + Number(a.weight), 0);

    const total = assignments.reduce((s, a) => s + Number(a.weight), 0);
    return {
      pres: getW("presentation"),
      mid: getW("midterm"),
      fin: getW("final"),
      total,
    };
  }, [assignments]);

  const filteredData = useMemo(() => {
    let data = assignments;

    // --- 1. Filter Logic ---
    if (activeFilter === "others") {
      data = assignments.filter(
        (a) =>
          !["midterm", "final", "presentation", "assignment"].some((k) =>
            a.name.toLowerCase().includes(k)
          )
      );
    } else if (activeFilter !== "all") {
      data = assignments.filter((a) =>
        a.name.toLowerCase().includes(activeFilter)
      );
    }

    // --- 2. Sorting Helpers ---
    const sortOrder = ["presentation", "assignment", "midterm", "final"];

    const getSortScore = (name: string) => {
      const lowerName = name.toLowerCase();
      const index = sortOrder.findIndex((keyword) =>
        lowerName.includes(keyword)
      );
      return index === -1 ? 999 : index;
    };

    // Mapping for common Roman numerals (up to 12 usually covers exams/parts)
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

    // Helper: Converts "Part-II" -> "part-2" for comparison
    const normalizeName = (name: string) => {
      return (
        name
          .toLowerCase()
          // Regex looks for roman numerals surrounded by word boundaries (\b)
          // This ensures we match " II " or "-II-" but not inside words like "video"
          .replace(/\b(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/g, (match) => {
            return romanMap[match].toString();
          })
      );
    };

    // --- 3. Final Sort Execution ---
    return [...data].sort((a, b) => {
      // Priority 1: Category Sort (Midterm, Final, etc.)
      const scoreA = getSortScore(a.name);
      const scoreB = getSortScore(b.name);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      // Priority 2: Roman Numeral Aware Natural Sort
      const normA = normalizeName(a.name);
      const normB = normalizeName(b.name);

      // localeCompare with numeric: true handles:
      // "Part-1" vs "Part-2" (Converted from I/II)
      // "Problem-1" vs "Problem-10"
      return normA.localeCompare(normB, undefined, { numeric: true });
    });
  }, [assignments, activeFilter]);

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8">
      {loading && <LoadingOverlay />}
      <ToastElement />

      {/* DASHBOARD SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: t("Presentation"),
            val: summary.pres,
            bg: "bg-blue-50",
            text: "text-blue-600",
          },
          {
            label: t("Midterm"),
            val: summary.mid,
            bg: "bg-orange-50",
            text: "text-orange-600",
          },
          {
            label: t("Final"),
            val: summary.fin,
            bg: "bg-purple-50",
            text: "text-purple-600",
          },
          {
            label: t("Assignments"),
            val: summary.total - summary.pres - summary.mid - summary.fin,
            bg: "bg-green-50",
            text: "text-green-600",
          },
          {
            label: t("Total Weight"),
            val: summary.total,
            bg: summary.total > 100.001 ? "bg-red-600" : "bg-gray-900",
            text: summary.total > 100.001 ? "text-white" : "text-green-400",
            isTotal: true,
          },
        ].map((item, i) => (
          <div
            key={i}
            className={`${item.bg} ${item.text} p-5 rounded-3xl shadow-sm flex flex-col justify-between h-28 border border-transparent hover:scale-105 transition-transform`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
              {item.label}
            </p>
            <p className="text-2xl font-black">{item.val.toFixed(1)}%</p>
          </div>
        ))}
      </div>

      {/* CREATE FORM */}

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-600 rounded-full"></span>Create
          Assignment
        </h2>

        {/* 1. Changed div to form and added onSubmit handler */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddAssignment();
          }}
          // CHANGED: Using Flexbox for better control over width ratios
          className="flex flex-col md:flex-row gap-4 items-end w-full"
        >
          {/* 1. Category: Fixed width or percentage */}
          <div className="max-w-[130px] md:w-1/4 ">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
              Category
            </label>
            <div className="relative">
              <select
                value={newAssignCategory}
                onChange={(e) => setNewAssignCategory(e.target.value)}
                className="w-full border border-gray-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 appearance-none bg-white cursor-pointer"
              >
                <option value="">{t("Select Category")}</option>
                <option value="assignment">{t("assignment")}</option>
                <option value="quiz">{t("Quiz")}</option>
                <option value="project">{t("Project")}</option>
                <option value="presentation">{t("Presentation")}</option>
                <option value="midtermExam">{t("Midterm")}</option>
                <option value="finalExam">{t("Final")}</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* 2. Name: flex-1 makes this expand to fill remaining space (Longer) */}
          <div className="w-full md:flex-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
              Name
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100"
              value={newAssignName}
              onChange={(e) => setNewAssignName(e.target.value)}
              placeholder="e.g. Midterm"
            />
          </div>

          {/* 3. Weight: Fixed small width (Closer) */}
          <div className="w-full md:w-24 shrink-0">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
              Weight (%)
            </label>
            <input
              type="text"
              // Removed w-[50px], used w-full of the container instead
              className="w-full border border-gray-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 text-center"
              value={newAssignWeight}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) {
                  setNewAssignWeight(val);
                }
              }}
              placeholder="0.00"
            />
          </div>

          {/* 4. Max Score: Fixed small width (Closer) */}
          <div className="w-full md:w-24 shrink-0">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
              Max Score
            </label>
            <input
              type="text"
              // Removed w-[50px], used w-full of the container instead
              className="w-full border border-gray-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 text-center"
              value={newAssignMaxScore}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) {
                  setNewAssignMaxScore(val);
                }
              }}
              placeholder="0.00"
            />
          </div>

          {/* 5. Button */}
          <button
            type="submit"
            className="w-full md:w-auto px-6 bg-blue-600 text-white font-black py-3 rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100 shrink-0 h-[50px]"
          >
            + Add
          </button>
        </form>
      </div>

      {/* TABLE SECTION WITH FILTER */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/30">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
              Assignment List
            </h3>
            {/* 🟢 NEW: Delete All Button */}
            {assignments.length > 0 && (
              <button
                onClick={() => setShowDeleteAllPopup(true)}
                className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase tracking-wide border border-red-200 px-3 py-1 rounded-full hover:bg-red-50 transition-colors"
              >
                Delete All
              </button>
            )}
          </div>

          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
            {["all", "presentation", "midterm", "final", "assignment"].map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                    activeFilter === f
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-400"
                  }`}
                >
                  {f}
                </button>
              )
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="p-5 text-center w-16">#</th>
                <th className="p-5">Name</th>
                <th className="p-5 text-center">Score</th>
                <th className="p-5 text-center">Weight</th>
                <th className="p-5 text-center">Date</th>
                <th className="p-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length > 0 ? (
                // Added 'index' parameter here
                filteredData.map((a, index) => (
                  <tr
                    key={a.id}
                    className="group hover:bg-blue-50/30 transition-all"
                  >
                    {/* Added Number Column */}
                    <td className="p-5 text-center text-gray-400 font-bold text-xs">
                      {index + 1}
                    </td>

                    <td className="p-5 font-bold text-gray-700">{a.name}</td>
                    <td className="p-5 text-center text-gray-500">
                      {Number(a.max_score).toFixed(0)}
                    </td>
                    <td className="p-5 text-center">
                      <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-2xl text-[10px] font-black">
                        {Number(a.weight).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-5 text-center text-gray-400 text-[10px]">
                      {new Date(a.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-5 text-right">
                      <button
                        onClick={() => handleEditAssignment(a.id)}
                        className="p-2 text-blue-400 hover:text-blue-600 transition-all active:scale-90"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setAssignmentToDelete(a.id);
                          setShowDeletePopup(true);
                        }}
                        className="p-2 text-red-400 hover:text-red-600 transition-all active:scale-90"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6} // Updated colSpan from 5 to 6
                    className="p-20 text-center text-gray-300 italic font-bold"
                  >
                    {t("No results found for ", { activeFilter })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT POPUP */}
      {editFormData && showEditPopup && (
        <FormEditPopup
          title="Edit Assignment"
          data={editFormData}
          fields={[
            { label: "Name", key: "name", type: "text" },
            { label: "Max Score", key: "max_score", type: "number" },
            { label: "Weight", key: "weight", type: "number" },
          ]}
          onSave={handleSaveEdit}
          onChange={(update) => setEditFormData(update)}
          onClose={() => setEditFormData(null)}
        />
      )}

      {/* SINGLE DELETE ALERT POPUP */}
      <AlertPopup
        title={t("Delete")}
        type="confirm"
        message={t("Are you sure you want to delete this assignment?")}
        isOpen={showDeletePopup}
        onCancel={() => {
          setShowDeletePopup(false);
          setAssignmentToDelete(null);
        }}
        onConfirm={() => {
          handleDeleteAssignment(assignmentToDelete);
        }}
      />

      {/* 🟢 DELETE ALL CONFIRMATION POPUP */}
      <AlertPopup
        title={t("Delete All Assignments")}
        type="confirm"
        message={t(
          "Are you absolutely sure? This will delete ALL assignments for this course. This action cannot be undone."
        )}
        isOpen={showDeleteAllPopup}
        onCancel={() => setShowDeleteAllPopup(false)}
        onConfirm={handleDeleteAllAssignments}
        confirmText="Delete All"
      />
    </div>
  );
}
