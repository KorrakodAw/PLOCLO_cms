import { Student } from "@/utils/studentApi";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "@/utils/apiClient";
import { useToast } from "@/components/Toast";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Save } from "lucide-react";

interface Assignment {
  id: number;
  section_id: number;
  name: string;
  maxScore: number;
  weight: number;
}

interface StudentScore {
  student_id: number;
  section_id: number;
  assignment_id: number;
  score: number;
}

export default function ScoreMapping({
  masterCourseId,
  sectionId
}: {
  masterCourseId: string | number;
  sectionId?: string | number;
}) {
  const { token } = useAuth();
  const { showToast, ToastElement } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [scoreGrid, setScoreGrid] = useState<
    Record<string, number | undefined>
  >({});

  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentRes, assignRes, scoreRes] = await Promise.all([
          apiClient.get(`/studentOnCourse?sectionId=${sectionId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiClient.get(`/assignment?courseId=${masterCourseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiClient.get(`/score?sectionId=${sectionId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setStudents(studentRes.data);
        setAssignments(assignRes.data);

        const grid: Record<string, number> = {};
        if (Array.isArray(scoreRes.data)) {
          scoreRes.data.forEach((s: StudentScore) => {
            grid[`${s.student_id}_${s.assignment_id}`] = s.score;
          });
        }
        setScoreGrid(grid);
        setChangedKeys(new Set());
      } catch (err) {
        console.error(err);
        showToast("Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [masterCourseId, sectionId, token]);

  const sortedAssignments = useMemo(() => {
    const data = assignments;
    const sortOrder = ["presentation", "assignment", "midterm", "final"];

    const getSortScore = (name: string) => {
      const lowerName = name.toLowerCase();
      const index = sortOrder.findIndex((keyword) =>
        lowerName.includes(keyword)
      );
      return index === -1 ? 999 : index;
    };

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

    const normalizeName = (name: string) => {
      return name
        .toLowerCase()
        .replace(/\b(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/g, (match) => {
          return romanMap[match].toString();
        });
    };

    return [...data].sort((a, b) => {
      const scoreA = getSortScore(a.name);
      const scoreB = getSortScore(b.name);
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      const normA = normalizeName(a.name);
      const normB = normalizeName(b.name);
      return normA.localeCompare(normB, undefined, { numeric: true });
    });
  }, [assignments]);

  const handleScoreChange = (
    studentId: number,
    assignId: number,
    val: string,
    maxScore: number
  ) => {
    // 🟢 FIX: Define the key here (combining studentId and assignId)
    const key = `${studentId}_${assignId}`;

    if (val !== "" && isNaN(Number(val))) return;

    if (val !== "" && Number(val) > maxScore) {
      showToast(`Score cannot exceed ${Number(maxScore).toFixed(2)}`, "error");
      return;
    }

    setScoreGrid((prev) => ({
      ...prev,
      [key]: val === "" ? undefined : Number(val),
    }));

    setChangedKeys((prev) => new Set(prev).add(key));
  };

  const handleSave = async () => {
    if (!token) return;

    if (changedKeys.size === 0) {
      showToast("No changes to save", "success");
      return;
    }

    setLoading(true);

    const updates = Array.from(changedKeys)
      .map((key) => {
        const val = scoreGrid[key];
        if (val !== undefined) {
          const [studentId, assignId] = key.split("_");
          return {
            student_id: Number(studentId),
            assignment_id: Number(assignId),
            course_id: Number(masterCourseId),
            score: val,
          };
        }
        return null;
      })
      .filter(Boolean);

    try {
      await apiClient.post(
        "/score",
        { updates },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      showToast("Scores saved successfully", "success");
      setChangedKeys(new Set());
    } catch (err) {
      console.error(err);
      showToast("Failed to save scores", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden mt-8 relative min-h-[400px]">
      {loading && <LoadingOverlay />}
      <ToastElement />

      <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
          Student Scores
        </h3>
        <button
          onClick={handleSave}
          disabled={loading || changedKeys.size === 0}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            changedKeys.size === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
          }`}
        >
          <Save size={16} />
          Save Scores
        </button>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-black tracking-widest">
            <tr>
              {/* FIX 1: Sticky Header 
                  - Added 'bg-white' (Solid color, not transparent)
                  - Increased 'z-30' (Highest priority to stay on top)
              */}
              <th className="p-4 border-b w-64 sticky left-0 bg-white z-30 shadow-md border-r">
                Student
              </th>
              {sortedAssignments.map((assign, index) => (
                <th
                  key={assign.id}
                  className="p-2 border-b text-center min-w-[100px] border-r bg-gray-50"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{index + 1}</span>
                    <span className="text-[9px] text-red-400">
                      Max: {Number(assign.maxScore).toFixed(2)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {students.length > 0 ? (
              students.map((student, index) => {
                const studentId =
                  (student as any).student_id || (student as any).id || 0;

                const rowKey = `row-${studentId}-${index}`;

                return (
                  <tr
                    key={rowKey}
                    className="group hover:bg-blue-50/30 transition-all"
                  >
                    {/* FIX 2: Sticky Body Cell 
                        - Added 'bg-white' (Solid background is crucial!)
                        - Added 'z-20' (Higher than scrolling cells)
                        - Added 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' (Optional: nice shadow on the right edge)
                    */}
                    <td className="p-4 font-bold text-gray-700 sticky left-0 bg-white border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-20">
                      <div className="flex flex-col w-[200px]">
                        <span>
                          {student.first_name} {student.last_name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {student.student_code}
                        </span>
                      </div>
                    </td>

                    {sortedAssignments.map((assign) => {
                      const key = `${studentId}_${assign.id}`;
                      const rawScore = scoreGrid[key];
                      const hasValue = rawScore !== undefined;
                      const inputValue = hasValue ? rawScore : "";
                      const isChanged = changedKeys.has(key);

                      return (
                        <td
                          key={assign.id}
                          className={`p-1 border-r text-center ${
                            isChanged ? "bg-yellow-50" : ""
                          }`}
                        >
                          <input
                            type="number"
                            min="0"
                            max={assign.maxScore}
                            className={`w-full h-full text-center py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent font-medium 
                            ${hasValue ? "text-blue-700" : "text-gray-400"}
                            ${
                              isChanged
                                ? "ring-2 ring-yellow-200 bg-yellow-50"
                                : ""
                            }
                            `}
                            placeholder="-"
                            value={inputValue}
                            onChange={(e) =>
                              handleScoreChange(
                                studentId,
                                assign.id,
                                e.target.value,
                                assign.maxScore
                              )
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={sortedAssignments.length + 1}
                  className="p-10 text-center text-gray-400 italic"
                >
                  No students found in this course.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
