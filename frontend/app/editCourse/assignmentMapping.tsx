import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../../components/Toast";
import React, { useEffect, useState } from "react";

import { apiClient } from "../../utils/apiClient";

interface Assignment {
  id: number;
  course_id: number;
  name: string;
  description: string;
  max_score: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

export default function AssignmentMapping({ courseId }: { courseId: string }) {
  const { token } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  // --- SELECTION STATES ---

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [newAssignName, setNewAssignName] = useState("");

  // --------------------------------------------------------
  // 1. DROPDOWN LOADING LOGIC
  // --------------------------------------------------------

  // 1. Fetch Assignments when courseId changes
  useEffect(() => {
    if (!courseId || !token) {
      setAssignments([]);
      return;
    }

    apiClient
      .get(`/assignments?courseId=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAssignments(res.data))
      .catch((err) => console.error(err));
  }, [courseId, token]);

  // 2. Handle Create Function
  const handleAddAssignment = async () => {
    if (!newAssignName) return;

    try {
      await apiClient.post(
        "/assignments",
        {
          course_id: Number(courseId),
          name: newAssignName,
          max_score: 100, // Default or add input for this
          weight: 10, // Default or add input for this
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      showToast("Assignment added!", "success");
      setNewAssignName("");

      // Refresh list
      const res = await apiClient.get(`/assignments?courseId=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
      showToast("Failed to add assignment", "error");
    }
  };

  return (
    <div className="mt-5 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{t("assignment mapping")}</h1>
      </div>

      <hr className="my-3" />

      {courseId && (
        <div className="bg-white p-5 rounded-xl shadow-sm border mt-6">
          <h2 className="text-xl font-bold mb-4">Manage Assignments</h2>

          {/* Input Form */}
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="Assignment Name (e.g. Midterm)"
              value={newAssignName}
              onChange={(e) => setNewAssignName(e.target.value)}
            />
            <button
              onClick={handleAddAssignment}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add
            </button>
          </div>

          {/* List */}
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="border p-3 rounded flex justify-between"
              >
                <span>
                  {a.name} (Max Score: {a.max_score})
                </span>
                <span className="text-gray-500 text-sm">
                  Created: {new Date(a.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ToastElement />
    </div>
  );
}
