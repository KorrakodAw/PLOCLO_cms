"use client";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/utils/apiClient";
import { useToast } from "@/components/Toast";
import { Column, Table } from "@/components/Table";
import axios from "axios";
import { useTranslation } from "react-i18next";

interface Student {
  id: number;
  student_code: string;
  first_name: string;
  last_name: string;
}

interface StudentCourse {
  id: number;
  student_code: string;
  student_id: string | number;
  first_name: string;
  last_name: string;
  assignedAt: string;
}

export default function AddStudentCourse({
  courseId,
  programId,
}: {
  courseId: string | number;
  programId: string | number;
}) {
  const sectionId = courseId; // courseId represents a specific course section
  const [allProgramStudents, setAllProgramStudents] = useState<Student[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<StudentCourse[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { showToast, ToastElement } = useToast();
  const { t } = useTranslation("common");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const programRes = await apiClient.get(`/student?programId=${programId}`);
      const enrolledRes = await apiClient.get(
        `/studentOnCourse?sectionId=${sectionId}`
      );
      setAllProgramStudents(programRes.data);
      setEnrolledStudents(enrolledRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch data", err);
      setLoading(false);
    }
  }, [programId, sectionId]);

  useEffect(() => {
    if (programId && sectionId) loadData();
  }, [programId, sectionId, loadData]);

  // Filter: Hide students already in the course from the popup selection
  const availableStudents = allProgramStudents.filter(
    (student) =>
      !enrolledStudents.some((enrolled) => enrolled.student_id === student.id)
  );

  const handleAddSelected = async () => {
    if (selectedStudentIds.length === 0) return;
    setLoading(true);

    try {
      const response = await apiClient.post("/studentOnCourse/bulk", {
        sectionId: parseInt(sectionId),
        studentIds: selectedStudentIds,
      });

      // Success Toast
      showToast(
        response.data.message || "Students added successfully",
        "success"
      );

      setSelectedStudentIds([]);
      setIsModalOpen(false);
      await loadData(); // Refresh your tables
    } catch (err: unknown) {
      setIsModalOpen(false);

      let errorMessage = "Failed to add students";

      // 1. Check if it's an Axios Error
      if (axios.isAxiosError(err)) {
        // 2. TypeScript now knows err.response.data follows ApiErrorResponse
        errorMessage = err.response?.data?.error || errorMessage;
      } else if (err instanceof Error) {
        // 3. Handle standard JavaScript errors
        errorMessage = err.message;
      }

      showToast(errorMessage, "error");
      console.error("Error adding students:", err);
    } finally {
      setLoading(false);
    }
  };

  // Explicitly type the array so TS checks accessors against StudentCourse
  const StudentColumns: Column<Student>[] = [
    {
      header: t("Student ID"),
      accessor: "student_code", // Must exist in StudentCourse
    },
    {
      header: t("First Name"),
      accessor: "first_name",
    },
    {
      header: t("Last Name"),
      accessor: "last_name",
    },
    // {
    //   header: "Enrolled Date",
    //   accessor: "assignedAt",
    //   Cell: ({ value }: { value: string }) => {
    //     return (
    //       <span>{value ? new Date(value).toLocaleDateString() : "-"}</span>
    //     );
    //   },
    // },
  ];

  return (
    <div className="p-4 space-y-6">
      <ToastElement />
      {/* Main UI header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold">{t("Students in this Course")}</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold transition-colors"
        >
          + {t("Enroll Students")}
        </button>
      </div>

      <Table columns={StudentColumns} data={enrolledStudents} />

      {/* MODAL POPUP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Select Students to Add</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white border-b">
                  <tr>
                    <th className="p-2 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedStudentIds.length ===
                            availableStudents.length &&
                          availableStudents.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedStudentIds(
                              availableStudents.map((s) => s.id)
                            );
                          else setSelectedStudentIds([]);
                        }}
                      />
                    </th>
                    <th className="p-2 text-sm font-semibold text-gray-600">
                      ID
                    </th>
                    <th className="p-2 text-sm font-semibold text-gray-600">
                      Name
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {availableStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(s.id)}
                          onChange={() => {
                            setSelectedStudentIds((prev) =>
                              prev.includes(s.id)
                                ? prev.filter((id) => id !== s.id)
                                : [...prev, s.id]
                            );
                          }}
                        />
                      </td>
                      <td className="p-2 text-sm">{s.student_code}</td>
                      <td className="p-2 text-sm">
                        {s.first_name} {s.last_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {availableStudents.length === 0 && (
                <div className="text-center py-10 text-gray-500 italic">
                  All program students are already enrolled.
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelected}
                disabled={loading || selectedStudentIds.length === 0}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold disabled:bg-gray-300"
              >
                {loading
                  ? "Adding..."
                  : `Add ${selectedStudentIds.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
