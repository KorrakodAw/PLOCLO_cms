"use client";

import React, { useEffect, useState} from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../../components/Toast";
import { apiClient } from "../../utils/apiClient";
import LoadingOverlay from "@/components/LoadingOverlay";
import FormEditPopup from "@/components/EditPopup";
import AlertPopup from "@/components/AlertPopup";
import DropdownSelect from "@/components/DropdownSelect";
import {
  Calculator,
  RefreshCcw,
  Trash2,
  Edit3,
  Plus,
  Info,
} from "lucide-react";

interface Assignment {
  id: number;
  name: string;
  category: string;
  maxScore: number;
  weight: number;
  createdAt: string;
}

interface CategoryWeight {
  category: string;
  maxWeight: number;
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
  const [categoryConfigs, setCategoryConfigs] = useState<CategoryWeight[]>([]);

  // Input States
  const [newAssignName, setNewAssignName] = useState("");
  const [newAssignCategory, setNewAssignCategory] = useState<string | number>(
    "",
  );
  const [newAssignMaxScore, setNewAssignMaxScore] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editFormData, setEditFormData] = useState<Assignment | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<number | null>(
    null,
  );

  // 1. Fetch ทั้งรายการงาน และ การตั้งค่าเพดานคะแนน (Category Weights)
  const fetchData = async () => {
    if (!courseId || !token) return;
    setLoading(true);
    try {
      const [assignRes, configRes] = await Promise.all([
        apiClient.get(`/assignment?courseId=${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get("/assignment/categoriesWeights", {
          params: { courseId },
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setAssignments(assignRes.data);
      setCategoryConfigs(configRes.data);
    } catch {
      showToast("Failed to fetch data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId, token]);

  // 2. 🧮 ฟังก์ชันหลักในการคำนวณ Weight ใหม่ทั้งหมด (Auto-split logic)
  const handleRecalculateWeights = async () => {
    if (assignments.length === 0 || categoryConfigs.length === 0) return;
    setLoading(true);
    try {
      // คำนวณน้ำหนักใหม่สำหรับทุกงานในเครื่องก่อนส่งไป Server
      const updatedList = assignments.map((assign) => {
        const config = categoryConfigs.find(
          (c) => c.category === assign.category,
        );
        if (!config) return { id: assign.id, weight: 0 };

        // คะแนนเต็มรวมของหมวดหมู่นี้
        const totalMaxInCat = assignments
          .filter((a) => a.category === assign.category)
          .reduce((sum, a) => sum + Number(a.maxScore), 0);

        // สูตร: (คะแนนงานนี้ / คะแนนรวมหมวด) * น้ำหนักเพดานหมวด
        const newWeight =
          totalMaxInCat > 0
            ? (Number(assign.maxScore) / totalMaxInCat) *
              Number(config.maxWeight)
            : 0;

        return { id: assign.id, weight: Number(newWeight.toFixed(2)) };
      });

      // สั่ง Update ทีละรายการ (หรือใช้ Bulk Patch ถ้า API รองรับ)
      await Promise.all(
        updatedList.map((item) =>
          apiClient.patch(
            `/assignment/${item.id}`,
            { weight: item.weight },
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
        ),
      );

      showToast("Weights auto-distributed by score proportion!", "success");
      fetchData(); // รีโหลดข้อมูลล่าสุด
    } catch {
      showToast("Failed to recalculate weights", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!newAssignName.trim() || !newAssignCategory || !newAssignMaxScore) {
      showToast("Please complete all fields", "error");
      return;
    }

    // ตรวจสอบว่าหมวดนี้มีการตั้งค่า Max Weight ไว้หรือยัง
    const hasConfig = categoryConfigs.some(
      (c) => c.category === newAssignCategory,
    );
    if (!hasConfig) {
      showToast("Please set weight limit for this category first!", "error");
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
          weight: 0, // ส่ง 0 ไปก่อน แล้วค่อยสั่ง Recalculate
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // setNewAssignName("");
      // setNewAssignMaxScore("");
      await handleRecalculateWeights(); // 🟢 คำนวณกระจายน้ำหนักใหม่ทันที
    } catch {
      showToast("Failed to add assignment", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;
    try {
      setLoading(true);
      await apiClient.patch(
        `/assignment/${editFormData.id}`,
        {
          name: editFormData.name,
          maxScore: Number(editFormData.maxScore),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setShowEditPopup(false);
      await handleRecalculateWeights(); // 🟢 คำนวณใหม่หากมีการแก้ Max Score
    } catch {
      showToast("Update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number | null) => {
    if (!id) return;
    try {
      setLoading(true);
      await apiClient.delete(`/assignment/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowDeletePopup(false);
      await handleRecalculateWeights(); 
      fetchData();
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredData = assignments.filter(
    (a) => activeFilter === "all" || a.category === activeFilter,
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 font-kanit">
      <ToastElement />
      {loading && <LoadingOverlay />}

      {/* 1. Dashboard Header */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl shadow-slate-200">
        <div className="flex items-center gap-5">
          <div className="bg-blue-500 p-4 rounded-3xl shadow-lg shadow-blue-500/20">
            <Calculator className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase leading-none">
              Auto-Weight <span className="text-blue-400">Mapping</span>
            </h1>
            <p className="text-slate-400 text-xs mt-2 font-medium">
              Weights are calculated proportionally based on Max Scores within
              each category.
            </p>
          </div>
        </div>
        <button
          onClick={handleRecalculateWeights}
          className="group flex items-center gap-3 bg-white/10 hover:bg-blue-600 px-8 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all active:scale-95 border border-white/10"
        >
          <RefreshCcw
            size={16}
            className="group-hover:rotate-180 transition-transform duration-500"
          />{" "}
          RE-DISTRIBUTE WEIGHTS
        </button>
      </div>

      {/* 2. Create Form Section */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddAssignment();
          }}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="md:w-1/4">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">
              Category
            </label>
            <DropdownSelect
              options={categoryConfigs.map((c) => ({
                value: c.category,
                label: t(
                  c.category.charAt(0).toUpperCase() + c.category.slice(1),
                ),
              }))}
              value={newAssignCategory}
              onChange={setNewAssignCategory}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">
              Assignment Name
            </label>
            <input
              type="text"
              className="w-full h-[42px] border border-slate-200 px-4 rounded-xl outline-none focus:border-blue-400 transition-all font-medium"
              value={newAssignName}
              onChange={(e) => setNewAssignName(e.target.value)}
              placeholder="e.g. Lab 1, Project Phase 1"
            />
          </div>
          <div className="w-full md:w-32">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 text-center tracking-widest">
              Max Score
            </label>
            <input
              type="number"
              className="w-full h-[42px] border border-slate-200 rounded-xl text-center font-bold text-slate-700"
              value={newAssignMaxScore}
              onChange={(e) => setNewAssignMaxScore(e.target.value)}
              placeholder="100"
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-10 bg-blue-600 text-white font-black h-[42px] rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            + {t("add")}
          </button>
        </form>
      </div>

      {/* 3. Table & List Section */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
              Assignment Repository
            </h3>
            <div className="flex bg-slate-200/50 p-1 rounded-xl">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-1 rounded-lg text-[10px] font-black transition-all ${activeFilter === "all" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"}`}
              >
                ALL
              </button>
              {categoryConfigs.map((c) => (
                <button
                  key={c.category}
                  onClick={() => setActiveFilter(c.category)}
                  className={`px-4 py-1 rounded-lg text-[10px] font-black transition-all ${activeFilter === c.category ? "bg-white shadow-sm text-blue-600" : "text-slate-400"}`}
                >
                  {c.category.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full">
            <Info size={14} strokeWidth={3} />
            <span className="text-[9px] font-black uppercase">
              Weights sum to category limit
            </span>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="text-[10px] font-black uppercase text-slate-400 tracking-tighter bg-slate-50/30">
            <tr>
              <th className="p-5 text-center w-16">#</th>
              <th className="p-5">Task Details</th>
              <th className="p-5 text-center">Base Score</th>
              <th className="p-5 text-center">Calculated Weight</th>
              <th className="p-5 text-right px-10">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredData.length > 0 ? (
              filteredData.map((a, idx) => (
                <tr
                  key={a.id}
                  className="group hover:bg-blue-50/20 transition-all"
                >
                  <td className="p-5 text-center text-slate-300 font-bold text-xs">
                    {idx + 1}
                  </td>
                  <td className="p-5">
                    <div className="font-bold text-slate-700">{a.name}</div>
                    <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-0.5">
                      {a.category}
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <span className="font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                      {a.maxScore}
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-sm font-black text-slate-800">
                        {a.weight}%
                      </span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(a.weight / 20) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-right px-10">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditFormData(a);
                          setShowEditPopup(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setAssignmentToDelete(a.id);
                          setShowDeletePopup(true);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="p-20 text-center text-slate-300 font-medium italic"
                >
                  No assignments found for this criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Popups */}
      {showEditPopup && editFormData && (
        <FormEditPopup
          title="Adjust Assignment"
          data={editFormData}
          fields={[
            { label: "Task Name", key: "name", type: "text" },
            {
              label: "Max Score (Affects Weight)",
              key: "maxScore",
              type: "number",
            },
          ]}
          onSave={handleSaveEdit}
          onChange={setEditFormData}
          onClose={() => setShowEditPopup(false)}
        />
      )}

      <AlertPopup
        isOpen={showDeletePopup}
        type="confirm"
        title="Remove Task"
        message="This will delete the assignment and redistribute weights in this category."
        onConfirm={() => handleDelete(assignmentToDelete)}
        onCancel={() => setShowDeletePopup(false)}
      />
    </div>
  );
}
