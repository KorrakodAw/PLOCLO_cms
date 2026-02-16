"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../../components/Toast";
import { apiClient } from "../../utils/apiClient";
import LoadingOverlay from "@/components/LoadingOverlay";
import FormEditPopup from "@/components/EditPopup";
import AlertPopup from "@/components/AlertPopup";
import DropdownSelect from "@/components/DropdownSelect";

interface Assignment {
  id: number;
  section_id: number;
  name: string;
  category: string;
  description: string;
  maxScore: number;
  weight: number;
  createdAt: string;
  updated_at: string;
}

export default function AssignmentMapping({
  courseId,
}: {
  courseId: string | number;
}) {
  const { token } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [newAssignName, setNewAssignName] = useState("");
  const [newAssignCategory, setNewAssignCategory] = useState<string | number>(
    "",
  );
  const [newAssignWeight, setNewAssignWeight] = useState<string>("");
  const [newAssignMaxScore, setNewAssignMaxScore] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editFormData, setEditFormData] = useState<Assignment | null>(null);

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<number | null>(
    null,
  );
  const [showDeleteAllPopup, setShowDeleteAllPopup] = useState(false);

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

  const handleAddAssignment = async () => {
    if (!newAssignName.trim() || Number(newAssignWeight) <= 0) {
      showToast("Please provide a name and a valid weight", "error");
      return;
    }

    if (
      assignments.some(
        (a) =>
          a.name.trim().toLowerCase() === newAssignName.trim().toLowerCase(),
      )
    ) {
      showToast("An assignment with this name already exists.", "error");
      return;
    }

    if (!newAssignCategory) {
      showToast("Please select a category", "error");
      return;
    }

    try {
      setLoading(true);
      await apiClient.post(
        "/assignment",
        {
          course_id: Number(courseId),
          name: newAssignName.trim(),
          maxScore: Number(newAssignMaxScore),
          category: newAssignCategory,
          weight: Number(newAssignWeight),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast("Assignment added!", "success");
      setNewAssignName("");
      setNewAssignWeight("");
      setNewAssignMaxScore("");
      fetchAssignments();
    } catch {
      showToast("Failed to add assignment", "error");
    } finally {
      setLoading(false);
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
          maxScore: Number(editFormData.maxScore),
          weight: Number(editFormData.weight),
          description: editFormData.description,
        },
        { headers: { Authorization: `Bearer ${token}` } },
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
    } catch {
      showToast("Failed to delete assignment", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllAssignments = async () => {
    try {
      setLoading(true);
      await Promise.all(
        assignments.map((a) =>
          apiClient.delete(`/assignment/${a.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      );
      showToast("All assignments deleted!", "success");
      fetchAssignments();
      setShowDeleteAllPopup(false);
    } catch {
      showToast("Failed to delete all assignments", "error");
    } finally {
      setLoading(false);
    }
  };

  // 4. Corrected Summary Logic
  const summary = useMemo(() => {
    const getW = (k: string) =>
      assignments
        .filter((a) => a.category === k)
        .reduce((s, a) => s + Number(a.weight || 0), 0);
    const total = assignments.reduce((s, a) => s + Number(a.weight || 0), 0);
    return {
      pres: getW("presentation"),
      ass: getW("assignment"),
      qz: getW("quiz"),
      prjt: getW("project"),
      mid: getW("midtermExam"),
      fin: getW("finalExam"),
      total,
    };
  }, [assignments]);

  // 5. Corrected Filtering Logic (Filtering by category string)
  const filteredData = useMemo(() => {
    const data =
      activeFilter === "all"
        ? assignments
        : assignments.filter((a) => a.category === activeFilter);

    const sortOrder: Record<string, number> = {
      presentation: 0,
      assignment: 1,
      midtermExam: 2,
      finalExam: 3,
    };
    return [...data].sort(
      (a, b) => (sortOrder[a.category] || 99) - (sortOrder[b.category] || 99),
    );
  }, [assignments, activeFilter]);

  const assignmentOptions = [
    { value: "quiz", label: t("Quiz") },
    { value: "presentation", label: t("Presentation") },
    { value: "midtermExam", label: t("Midterm") },
    { value: "finalExam", label: t("Final") },
    { value: "assignment", label: t("Assignments") },
    { value: "project", label: t("Project") },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8">
      {loading && <LoadingOverlay />}
      <ToastElement />

      {/* DYNAMIC DASHBOARD SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {Object.entries(summary)
          .filter(([key, value]) => key !== "total" && Number(value) > 0)
          .map(([key, value]) => {
            const labels: Record<string, string> = {
              pres: t("Presentation"),
              ass: t("Assignments"),
              qz: t("Quiz"),
              prjt: t("Project"),
              mid: t("Midterm"),
              fin: t("Final"),
            };
            return (
              <div
                key={key}
                className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm flex flex-col justify-center h-20 hover:border-indigo-300 transition-all"
              >
                <p className="text-[9px] font-bold uppercase tracking-tight text-slate-400 mb-1 truncate">
                  {labels[key] || key}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-slate-800">
                    {Number(value).toFixed(1)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    %
                  </span>
                </div>
              </div>
            );
          })}

        <div
          className={`p-3 rounded-xl shadow-sm flex flex-col justify-center h-20 border transition-all ${summary.total > 100.001 ? "bg-red-50 border-red-200" : "bg-slate-900 border-slate-900"}`}
        >
          <p
            className={`text-[9px] font-bold uppercase tracking-tight mb-1 ${summary.total > 100.001 ? "text-red-500" : "text-slate-400"}`}
          >
            {t("Total Weight")}
          </p>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-lg font-bold ${summary.total > 100.001 ? "text-red-700" : "text-emerald-400"}`}
            >
              {summary.total.toFixed(1)}
            </span>
            <span
              className={`text-[10px] font-medium ${summary.total > 100.001 ? "text-red-400" : "text-slate-500"}`}
            >
              %
            </span>
          </div>
        </div>
      </div>

      {/* CREATE FORM */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-600 rounded-full"></span>Create
          Assignment
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddAssignment();
          }}
          className="flex flex-col md:flex-row gap-4 items-end w-full"
        >
          <div className="md:w-1/4 ">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
              Category
            </label>
            <DropdownSelect
              options={assignmentOptions}
              value={newAssignCategory}
              onChange={(v) => setNewAssignCategory(v)}
            />
          </div>
          <div className="w-full md:flex-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
              Name
            </label>
            <input
              type="text"
              placeholder="e.g., Quiz 1, Final Exam, Project Proposal"
              className="w-full border border-gray-200 p-3 rounded-2xl outline-none"
              value={newAssignName}
              onChange={(e) => setNewAssignName(e.target.value)}
            />
          </div>
          <div className="w-full md:w-24 shrink-0">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
              Weight (%)
            </label>
            <input
              type="text"
              placeholder="e.g., 20"
              className="w-full border border-gray-200 p-3 rounded-2xl text-center"
              value={newAssignWeight}
              onChange={(e) =>
                /^\d*\.?\d*$/.test(e.target.value) &&
                setNewAssignWeight(e.target.value)
              }
            />
          </div>
          <div className="w-full md:w-24 shrink-0">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
              Max Score
            </label>
            <input
              type="text"
              placeholder="e.g., 100"
              className="w-full border border-gray-200 p-3 rounded-2xl text-center"
              value={newAssignMaxScore}
              onChange={(e) =>
                /^\d*\.?\d*$/.test(e.target.value) &&
                setNewAssignMaxScore(e.target.value)
              }
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-6 bg-blue-600 text-white font-black py-3 rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100 shrink-0 h-[50px]"
          >
            + Add
          </button>
        </form>
      </div>

      {/* TABLE SECTION WITH DYNAMIC CATEGORY FILTER */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/30">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
              Assignment List
            </h3>
            {assignments.length > 0 && (
              <button
                onClick={() => setShowDeleteAllPopup(true)}
                className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase tracking-wide border border-red-200 px-3 py-1 rounded-full"
              >
                Delete All
              </button>
            )}
          </div>

          {/* DYNAMIC FILTERS: Only show buttons for categories that exist */}
          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeFilter === "all" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"}`}
            >
              {t("all")}
            </button>
            {Object.entries(summary)
              .filter(([key, val]) => key !== "total" && Number(val) > 0)
              .map(([key]) => {
                const map: Record<string, string> = {
                  pres: "presentation",
                  ass: "assignment",
                  qz: "quiz",
                  prjt: "project",
                  mid: "midtermExam",
                  fin: "finalExam",
                };
                const filterValue = map[key];
                return (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(filterValue)}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeFilter === filterValue ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"}`}
                  >
                    {(key)}
                  </button>
                );
              })}
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
                filteredData.map((a, index) => (
                  <tr
                    key={a.id}
                    className="group hover:bg-blue-50/30 transition-all"
                  >
                    <td className="p-5 text-center text-gray-400 font-bold text-xs">
                      {index + 1}
                    </td>
                    <td className="p-5 font-bold text-gray-700">{a.name}</td>
                    <td className="p-5 text-center text-gray-500">
                      {Number(a.maxScore).toFixed(0)}
                    </td>
                    <td className="p-5 text-center">
                      <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-2xl text-[10px] font-black">
                        {Number(a.weight).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-5 text-center text-gray-400 text-[10px]">
                      {new Date(a.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-5 text-right flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditFormData(a);
                          setShowEditPopup(true);
                        }}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setAssignmentToDelete(a.id);
                          setShowDeletePopup(true);
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="p-20 text-center text-gray-300 italic font-bold"
                  >
                    {t("No results found")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUPS */}
      {editFormData && showEditPopup && (
        <FormEditPopup
          title="Edit Assignment"
          data={editFormData}
          fields={[
            { label: "Name", key: "name", type: "text" },
            { label: "Max Score", key: "maxScore", type: "number" },
            { label: "Weight", key: "weight", type: "number" },
          ]}
          onSave={handleSaveEdit}
          onChange={(update) => setEditFormData(update)}
          onClose={() => setShowEditPopup(false)}
        />
      )}
      <AlertPopup
        title={t("Delete")}
        type="confirm"
        message={t("Are you sure you want to delete this assignment?")}
        isOpen={showDeletePopup}
        onCancel={() => setShowDeletePopup(false)}
        onConfirm={() => handleDeleteAssignment(assignmentToDelete)}
      />
      <AlertPopup
        title={t("Delete All")}
        type="confirm"
        message={t("Delete ALL assignments? Action cannot be undone.")}
        isOpen={showDeleteAllPopup}
        onCancel={() => setShowDeleteAllPopup(false)}
        onConfirm={handleDeleteAllAssignments}
        confirmText="Delete All"
      />
    </div>
  );
}
