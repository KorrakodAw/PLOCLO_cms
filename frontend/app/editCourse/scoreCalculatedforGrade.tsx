import { useEffect, useState, useMemo } from "react";
import React from "react";
import { apiClient } from "@/utils/apiClient";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useToast } from "@/components/Toast";
import { Calculator } from "lucide-react";

// --- Interfaces ---
interface Student {
  id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  student_code: string;
}

interface Assignment {
  id: number;
  name: string;
  category: string;
  max_score: number;
  weight: number;
}

interface StudentScore {
  student_id: number;
  assignment_id: number;
  score: number;
}

interface GradeSetting {
  id: number;
  grade: string;
  score: number; // Minimum score required
}

// Result structure for display
interface StudentResult {
  student: Student;
  categoryScores: Record<string, number>;
  totalScore: number;
  grade: string; // 🟢 NEW: Grade property
}

export default function ScoreCalculated({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(true);
  const { ToastElement, showToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [gradeSettings, setGradeSettings] = useState<GradeSetting[]>([]);

  // 1. Fetch Data
  useEffect(() => {
    if (!courseId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentRes, assignRes, scoreRes, gradeRes] = await Promise.all([
          apiClient.get(`/studentOnCourse?courseId=${courseId}`),
          apiClient.get(`/assignment?courseId=${courseId}`),
          apiClient.get(`/score?courseId=${courseId}`),
          apiClient.get(`/grade/settings/${courseId}`),
        ]);

        setStudents(studentRes.data);
        setAssignments(assignRes.data);
        setScores(scoreRes.data);
        // Ensure grades are sorted High -> Low (e.g., A first, then B)
        setGradeSettings(
          (gradeRes.data as GradeSetting[]).sort((a, b) => b.score - a.score)
        );
      } catch (err) {
        console.error(err);
        showToast("Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, showToast]);

  // 2. Process & Calculate Scores + Map Grades
  const processedData: StudentResult[] = useMemo(() => {
    if (!students.length || !assignments.length) return [];

    const assignMap = new Map<number, Assignment>();
    assignments.forEach((a) => assignMap.set(a.id, a));

    const scoreMap = new Map<string, number>();
    scores.forEach((s) =>
      scoreMap.set(`${s.student_id}_${s.assignment_id}`, s.score)
    );

    return students.map((student) => {
      const categoryScores: Record<string, number> = {};
      let totalScore = 0;

      const sId = student.student_id || student.id;

      assignments.forEach((assign) => {
        const rawScore = scoreMap.get(`${sId}_${assign.id}`) || 0;
        const calculatedScore = (rawScore / assign.max_score) * assign.weight;

        if (!categoryScores[assign.category]) {
          categoryScores[assign.category] = 0;
        }

        categoryScores[assign.category] += calculatedScore;
        totalScore += calculatedScore;
      });

      // 🟢 GRADE MAPPING LOGIC
      // Find the first grade where totalScore >= minScore
      // Since gradeSettings is sorted desc, the first match is the best grade
      const assignedGrade =
        gradeSettings.find((g) => totalScore >= g.score)?.grade || "F";

      return {
        student,
        categoryScores,
        totalScore,
        grade: assignedGrade,
      };
    });
  }, [students, assignments, scores, gradeSettings]);

  // 3. Determine active categories
  const activeCategories = useMemo(() => {
    const categories = [
      "assignment",
      "quiz",
      "project",
      "presentation",
      "midtermExam",
      "finalExam",
    ];
    return categories.filter((cat) =>
      assignments.some((a) => a.category === cat)
    );
  }, [assignments]);

  const formatCategory = (cat: string) => {
    const map: Record<string, string> = {
      assignment: "Assignment",
      quiz: "Quiz",
      project: "Project",
      presentation: "Presentation",
      midtermExam: "Midterm",
      finalExam: "Final",
    };
    return map[cat] || cat;
  };

  // Helper for grade colors
  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "bg-green-100 text-green-700";
    if (grade.startsWith("B")) return "bg-blue-100 text-blue-700";
    if (grade.startsWith("C")) return "bg-yellow-100 text-yellow-700";
    if (grade.startsWith("D")) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden mt-8 relative min-h-[400px]">
      {loading && <LoadingOverlay />}
      <ToastElement />

      <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <div className="flex items-center gap-2">
          <Calculator className="text-blue-600" size={20} />
          <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
            Calculated Scores & Grades
          </h3>
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-black tracking-widest">
            <tr>
              <th className="p-4 border-b w-64 sticky left-0 bg-white z-30 shadow-md border-r">
                Student
              </th>
              {activeCategories.map((cat) => (
                <th
                  key={cat}
                  className="p-4 border-b text-center min-w-[100px] border-r"
                >
                  {formatCategory(cat)}
                </th>
              ))}
              <th className="p-4 border-b text-center min-w-[80px] bg-blue-50 text-blue-800 border-r border-blue-100">
                Total
              </th>
              <th className="p-4 border-b text-center min-w-[80px] bg-green-50 text-green-800">
                Grade
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {processedData.length > 0 ? (
              processedData.map((data, index) => {
                const { student, categoryScores, totalScore, grade } = data;

                return (
                  <tr
                    key={index}
                    className="group hover:bg-blue-50/30 transition-all"
                  >
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

                    {activeCategories.map((cat) => {
                      const score = categoryScores[cat] || 0;
                      return (
                        <td
                          key={cat}
                          className="p-4 text-center border-r text-gray-600 font-medium"
                        >
                          {score > 0 ? score.toFixed(2) : "-"}
                        </td>
                      );
                    })}

                    <td className="p-4 text-center font-black text-blue-700 bg-blue-50/30 border-r border-blue-100">
                      {totalScore.toFixed(2)}
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black ${getGradeColor(
                          grade
                        )}`}
                      >
                        {grade}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={activeCategories.length + 3}
                  className="p-10 text-center text-gray-400 italic"
                >
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
