import { apiClient } from "@/utils/apiClient";
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useToast } from "../../components/Toast";
import LoadingOverLay from "@/components/LoadingOverlay";

// 1. FIX: Interface must match Backend (Score is Int, not Array)
interface GradeLevel {
  id?: number; // Optional because new items won't have an ID yet
  grade: string;
  score: number; // Single number (Minimum score)
  color?: string;
}

export default function GradeSetting({ courseId }: { courseId: string }) {
  const { showToast, ToastElement } = useToast();
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Keep inputs as strings to handle empty states better
  const [newGrade, setNewGrade] = useState<string>("");
  const [newScoreRange, setNewScoreRange] = useState<string>("");

  // 2. Fetch Data
  async function fetchGradeSettings() {
    setLoading(true);
    try {
      // FIX: Ensure URL matches backend route
      const res = await apiClient.get(`grade/settings/${courseId}`);
      // Backend returns array of { id, grade, score (int) }
      setGrades(res.data);
    } catch (error) {
      console.error("Error fetching grade settings:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (courseId) fetchGradeSettings();
  }, [courseId]);

  // 3. FIX: Post Function
  const addNewGradeSetting = async () => {
    // Basic Validation
    if (!newGrade || !newScoreRange) {
      alert("Please fill in both Grade and Score.");
      return;
    }

    try {
      setLoading(true);
      // Prepare valid integers
      const parsedScore = parseFloat(newScoreRange.toString());
      const parsedCourseId = parseInt(courseId.toString());

      const newItem: GradeLevel = {
        grade: newGrade,
        score: parsedScore,
      };

      // Combine existing grades + new item for "Replace All" logic
      const allSettings = [
        ...grades.map((g) => ({ grade: g.grade, score: g.score })),
        newItem,
      ];

      const payload = {
        courseId: parsedCourseId,
        settings: allSettings,
      };

      // FIX: URL must be "/grade/settings" (Not /add)
      const res = await apiClient.post("grade/settings/add", payload);

      console.log("Success:", res.data);

      // Update UI
      if (res.data.createdSettings) {
        setGrades(res.data.createdSettings);
      } else {
        fetchGradeSettings(); // Fallback
      }

      // Reset Form
      setNewGrade("");
      setNewScoreRange("");
      setShowAddForm(false);
      showToast("Grade settings updated successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to save grade setting.", "error");
    }
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-lg max-w-2xl mx-auto">
      {loading && <LoadingOverLay />}
      <ToastElement />
      {/* <h2 className="text-xl font-bold mb-4 text-gray-800">
        Grade Settings for Course: {courseId}
      </h2> */}

      <button
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => setShowAddForm(true)}
      >
        Add / Edit Grade Settings
      </button>

      {showAddForm && (
        <div className="mb-4 p-4 border border-gray-300 rounded relative bg-gray-50">
          <button
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowAddForm(false)}
          >
            <X size={20} />
          </button>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Grade Symbol
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                placeholder="e.g., A, B+, C"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Minimum Score
              </label>
              <input
                type="number"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={newScoreRange}
                onChange={(e) => setNewScoreRange(e.target.value)}
                placeholder="e.g. 80"
              />
            </div>

            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={addNewGradeSetting}
            >
              Save Grade Settings
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade Symbol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min Score Requirement
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Sort grades by score descending for better display */}
            {grades
              .sort((a, b) => b.score - a.score)
              .map((grade, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-bold text-gray-900">
                      {grade.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    &ge; {grade.score}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500 text-right">
        * Grades are assigned if score is greater than or equal to the minimum.
      </div>
    </div>
  );
}
