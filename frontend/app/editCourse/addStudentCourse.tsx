"use client";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/utils/apiClient";
import { useToast } from "@/components/Toast";
import { Column, Table } from "@/components/Table";
import { useTranslation } from "react-i18next";
import LoadingOverlay from "@/components/LoadingOverlay";
import AlertPopup from "@/components/AlertPopup";
import { useAuth } from "../context/AuthContext";

interface Student {
  id: number;
  student_code: string;
  first_name: string;
  last_name: string;
}

interface StudentCourse {
  id: number;
  student_code: string;
  student_id: number;
  first_name: string;
  last_name: string;
  assignedAt: string;
}

export default function AddStudentCourse({
  masterCourseId,
  programId,
  sectionId,
}: {
  masterCourseId: string | number;
  programId: string | number;
  sectionId: string;
}) {
  const [allProgramStudents, setAllProgramStudents] = useState<Student[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<StudentCourse[]>([]);
  const [studentsInAnySection, setStudentsInAnySection] = useState<
    { id: number }[]
  >([]);
  const [showAlertPopup, setShowAlertPopup] = useState(false);

  // Selection states
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]); // For adding
  const [selectedEnrolledIds, setSelectedEnrolledIds] = useState<number[]>([]); // For deleting

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { showToast, ToastElement } = useToast();
  const { t } = useTranslation("common");
  const { token } = useAuth();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const programRes = await apiClient.get(`/student?programId=${programId}`);
      const sectionRes = await apiClient.get(
        `/studentOnCourse?sectionId=${sectionId}`,
      );
      const courseRes = await apiClient.get(
        `/studentOnCourse?courseId=${masterCourseId}`,
      );

      setAllProgramStudents(programRes.data);
      setEnrolledStudents(sectionRes.data);
      setStudentsInAnySection(courseRes.data);

      // Clear selections on reload
      setSelectedEnrolledIds([]);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  }, [programId, sectionId, masterCourseId]);

  useEffect(() => {
    if (programId && sectionId && masterCourseId) loadData();
  }, [programId, sectionId, masterCourseId, loadData]);

  // Filter Logic
  const availableStudents = allProgramStudents.filter((student) => {
    const isAlreadyInCourse = studentsInAnySection.some(
      (enrolled) => enrolled.id === student.id,
    );
    return !isAlreadyInCourse;
  });

  // --- BULK ADD ---
  const handleAddSelected = async () => {
    if (selectedCandidates.length === 0) return;
    setLoading(true);
    try {
      const response = await apiClient.post("/studentOnCourse/bulk", {
        sectionId: parseInt(sectionId),
        studentIds: selectedCandidates,
      });
      showToast(
        response.data.message || "Students added successfully",
        "success",
      );
      setSelectedCandidates([]);
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast("Failed to add students", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- BULK DELETE ---
  const handleBulkDelete = async () => {
    if (selectedEnrolledIds.length === 0 || !token) return;

    setLoading(true);
    try {
      // Calls the new POST endpoint for bulk delete
      // ✅ วิธีที่ถูกต้องสำหรับ Axios Delete พร้อม Request Body
      await apiClient.delete(`/studentOnCourse/bulk-delete`, {
        data: {
          sectionId: parseInt(sectionId),
          studentIds: selectedEnrolledIds,
        },
        headers: { Authorization: `Bearer ${token}` }, // อย่าลืมใส่ Token หากจำเป็น
      });

      showToast("Students removed successfully", "success");
      await loadData();
    } catch (err) {
      console.error("Failed to remove students", err);
      showToast("Failed to remove students", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- TABLE COLUMNS ---
  const StudentColumns: Column<StudentCourse>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={
            enrolledStudents.length > 0 &&
            selectedEnrolledIds.length === enrolledStudents.length
          }
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedEnrolledIds(enrolledStudents.map((s) => s.student_id));
            } else {
              setSelectedEnrolledIds([]);
            }
          }}
          className="cursor-pointer w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
        />
      ) as unknown as string, // Cast only if your interface strictly requires 'string'
      accessor: "student_id",
      // Fix 2: Adjust signature from (_: any, row: any) to (row: StudentCourse)
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedEnrolledIds.includes(row.student_id)}
          onChange={() => {
            setSelectedEnrolledIds((prev) =>
              prev.includes(row.student_id)
                ? prev.filter((id) => id !== row.student_id)
                : [...prev, row.student_id],
            );
          }}
          className="cursor-pointer w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
        />
      ),
    },
    { header: t("Student ID"), accessor: "student_code" },
    { header: t("First Name"), accessor: "first_name" },
    { header: t("Last Name"), accessor: "last_name" },
  ];

  return (
    <div className="p-4 space-y-6">
      {loading && <LoadingOverlay />}
      <ToastElement />

      {/* Header Actions */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold flex items-center gap-2">
          {t("Students in this Course")}
          <span className="text-sm font-normal text-gray-500">
            ({enrolledStudents.length})
          </span>
        </h2>

        <div className="flex gap-2">
          {selectedEnrolledIds.length > 0 && (
            <button
              onClick={() => setShowAlertPopup(true)}
              className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-lg font-bold transition-colors animate-in fade-in"
            >
              {t("delete")} ({selectedEnrolledIds.length})
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold transition-colors"
          >
            + {t("Enroll Students")}
          </button>
        </div>
      </div>

      <Table columns={StudentColumns} data={enrolledStudents} />

      {/* MODAL POPUP (Same as before, just mapped to selectedCandidates) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Select Students to Add</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white border-b z-10">
                  <tr>
                    <th className="p-2 w-10">
                      <input
                        type="checkbox"
                        checked={
                          availableStudents.length > 0 &&
                          selectedCandidates.length === availableStudents.length
                        }
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedCandidates(
                              availableStudents.map((s) => s.id),
                            );
                          else setSelectedCandidates([]);
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
                          checked={selectedCandidates.includes(s.id)}
                          onChange={() => {
                            setSelectedCandidates((prev) =>
                              prev.includes(s.id)
                                ? prev.filter((id) => id !== s.id)
                                : [...prev, s.id],
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
                  No available students found.
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
                disabled={loading || selectedCandidates.length === 0}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold disabled:bg-gray-300"
              >
                {loading
                  ? "Adding..."
                  : `Add ${selectedCandidates.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT POPUP FOR DELETE CONFIRMATION */}
      {showAlertPopup && (
        <AlertPopup
          isOpen={showAlertPopup}
          type="confirm"
          title={t("Confirm Deletion")}
          message={t(
            "Are you sure you want to delete the selected students from this section?",
          )}
          confirmText={t("Delete")}
          cancelText={t("Cancel")}
          onConfirm={() => {
            setShowAlertPopup(false);
            handleBulkDelete();
          }}
          onCancel={() => setShowAlertPopup(false)}
        />
      )}
    </div>
  );
}
