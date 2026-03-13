import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { addStudent } from "../../utils/studentApi";

import { Column, Table } from "../../components/Table";

import { useToast } from "../../components/Toast";

import FormEditPopup from "../../components/EditPopup";
import AlertPopup from "../../components/AlertPopup";
import { apiClient } from "../../utils/apiClient";

import LoadingOverlay from "../../components/LoadingOverlay";

interface AddStudentProps {
  programId?: string | number;
}

interface Student {
  student_id: number | string;
  id: number;
  student_code: string | number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  program_shortname_en: string;
  program_shortname_th: string;
  year_of_admission?: number;
  year?: number;
}

export default function AddStudent({ programId }: AddStudentProps) {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn, initialized } = useAuth();

  const [loadingStudent, setLoadingStudent] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [page, setPage] = useState(1);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const { showToast, ToastElement } = useToast();

  const fetchStudents = async () => {
    // 1. Guard Clause: Don't fetch if crucial data is missing
    if (!initialized || !isLoggedIn || !token || !programId) {
      // Optional: console.log("Waiting for programId or auth...");
      return;
    }

    try {
      setLoadingStudent(true);

      // 2. Use 'params' object for cleaner query strings
      const res = await apiClient.get("/student", {
        headers: { Authorization: `Bearer ${token}` },
        params: { programId: programId },
      });

      // 3. Robust Data Extraction (Fixes the "No Data" issue)
      // Checks if the response IS the array, or if the array is nested inside .data
      let studentData: Student[] = [];

      if (Array.isArray(res.data)) {
        studentData = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        studentData = res.data.data;
      }

      setStudents(studentData);
    } catch (error) {
      console.error("Error fetching students:", error);
      showToast(t("Failed to load student data."), "error");
    } finally {
      setLoadingStudent(false);
    }
  };

  const studentColumns: Column<Student>[] = [
    { header: "student code", accessor: "student_code" },
    {
      header: "full name",
      accessor: "first_name",
      render: (row) => `${row.first_name} ${row.last_name}`,
    },
    // {
    //   header: t("program"),
    //   accessor: lang === "en" ? "program_shortname_en" : "program_shortname_th",
    //   render: (v) => v || "-",
    // },
    {
      header: t("email"),
      accessor: "email",
    },
    {
      header: t("actions"),
      accessor: "id",
      actions: [
        {
          label: t("edit"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row: Student) => {
            setSelectedStudent(row);
            setShowEditPopup(true);
          },
        },
        {
          label: t("delete"),
          color: "red",
          hoverColor: "red",
          onClick: (row: Student) => {
            setStudentToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  const saveEdit = async () => {
    if (!selectedStudent || !token) return;

    try {
      await apiClient.patch(
        `/student/${selectedStudent.id}`,
        {
          student_code: selectedStudent.student_code,
          first_name: selectedStudent.first_name,
          last_name: selectedStudent.last_name,
          email: selectedStudent.email,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast("Student updated successfully!", "success");
      setShowEditPopup(false);
      fetchStudents();
    } catch (err) {
      if (err instanceof Error) {
        showToast("Failed to update student: " + err.message, "error");
      } else if (typeof err === "string") {
        showToast("Failed to update student: " + err, "error");
      } else {
        showToast(
          "Failed to update student: An unknown error occurred",
          "error",
        );
      }
    }
  };

  const confirmDelete = async () => {
    if (!studentToDelete || !token) return;

    try {
      await apiClient.delete(`/student/${studentToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Student deleted successfully!", "success");
      setShowDeletePopup(false);
      setStudentToDelete(null);
      fetchStudents();
    } catch (err) {
      if (err instanceof Error) {
        showToast("Failed to delete student: " + err.message, "error");
      } else if (typeof err === "string") {
        showToast("Failed to delete student: " + err, "error");
      } else {
        showToast(
          "Failed to delete student: An unknown error occurred",
          "error",
        );
      }
    }
  };

  // 🧩 Add single student manually
  const handleAddStudent = async (data: Record<string, unknown>) => {
    if (!initialized || !programId) return;
    if (!isLoggedIn || !token)
      return showToast("Please log in again.", "error");
    if (!programId) return showToast("Please select a program.", "error");

    // Map form fields to backend payload
    // 1. Logic to split "FirstName LastName"
    const fullName = String(data.nameEn || "").trim();
    const nameParts = fullName.split(" "); // Split by space

    const firstName = nameParts[0] || ""; // Take the first chunk
    const lastName = nameParts.slice(1).join(" ") || ""; // Join the rest as Last Name

    // 2. Construct the Payload
    const payload = {
      student_code: String(data.code),
      first_name: firstName, // Derived from nameEn
      last_name: lastName, // Derived from nameEn
      email: String(data.nameTh), // Using nameTh as Email
      program_id: programId,
    };

    try {
      await addStudent(payload, token);

      fetchStudents();
      showToast("Student added successfully!", "success");
      setPage(1); // Reset to first page to see new entries
    } catch (err) {
      if (err instanceof Error) {
        showToast("Failed to add student: " + err.message, "error");
      } else if (typeof err === "string") {
        showToast("Failed to add student: " + err, "error");
      } else {
        showToast("Failed to add student: An unknown error occurred", "error");
      }
    }
  };

  // 🧩 Add from Excel
  // 🧩 Add from Excel
  const handleAddStudentExcel = async (rows: Student[]) => {
    if (!initialized) return alert("Auth not initialized.");
    if (!isLoggedIn || !token) return alert("Please log in again.");
    if (!programId) return alert("Please select a program first.");

    // 1. Start Loading UI (Prevents interaction while processing)
    setLoadingStudent(true);

    let successCount = 0;
    let failCount = 0;
    const errorDetails: string[] = [];

    const rowsWithProgram = rows.map((row) => ({
      ...row,
      program_id: programId,
      year_of_admission: Number(row.year_of_admission ?? row.year),
    }));

    // 2. Process all rows
    for (const [i, row] of rowsWithProgram.entries()) {
      const student_code = row.student_id || row.student_code;
      const first_name = row.first_name;
      const last_name = row.last_name;
      const email = row.email || "";
      const program_id = row.program_id || programId;

      if (!student_code || !first_name || !last_name || !program_id) {
        failCount++;
        errorDetails.push(`Row ${i + 1}: missing required fields`);
        continue;
      }

      const payload = {
        student_code: String(student_code),
        first_name: String(first_name),
        last_name: String(last_name),
        email: String(email) || "",
        program_id: programId,
      };

      try {
        await addStudent(payload, token);
        successCount++;
        // ❌ REMOVED fetchStudents() from here to stop blinking
      } catch (err) {
        failCount++;
        if (err instanceof Error) {
          errorDetails.push(`Row ${i + 1}: ${err.message}`);
        } else {
          errorDetails.push(`Row ${i + 1}: An unknown error occurred`);
        }
      }
    }

    // 3. Update UI ONCE after loop finishes
    await fetchStudents();
    setPage(1);
    setLoadingStudent(false); // Stop loading

    showToast(
      `Excel upload completed: ${successCount} succeeded, ${failCount} failed.`,
      failCount > 0 ? "error" : "success",
    );

    if (failCount > 0) {
      showToast(
        `Some rows failed to add:\n${errorDetails.join("\n")}`,
        "error",
      );
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [isLoggedIn, token, page, programId]);

  return (
    <div className="p-5 md:p-8 min-h-screen">
      {loadingStudent && <LoadingOverlay />}
      <ToastElement />
      <div className="mb-6 flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-extrabold text-gray-800">
          {t("student management")}
        </h1>

        <AddButton
          buttonText={t("create new student")}
          placeholderText={{
            code: t("student id"),
            nameEn: "full name",
            nameTh: t("email"),
          }}
          submitButtonText={{
            insert: t("insert student"),
            upload: t("upload student (excel)"),
          }}
          showAbbreviationInputs={false}
          onSubmit={handleAddStudent}
          onSubmitExcel={handleAddStudentExcel}
        />
      </div>

      <div className="bg-white p-4 rounded-lg shadow-xl">
        <Table<Student> columns={studentColumns} data={students} />
        <div className="pt-4 flex justify-end">
          {/* <PaginationControlButton
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          /> */}
        </div>
      </div>

      {selectedStudent && showEditPopup && (
        <FormEditPopup
          title={t("edit student")}
          data={selectedStudent}
          fields={[
            { label: "student id", key: "student_code", type: "number" },
            { label: "first name", key: "first_name", type: "text" },
            { label: "last name", key: "last_name", type: "text" },
            { label: "email", key: "email", type: "text" },
          ]}
          onChange={(update) => {
            setSelectedStudent(update);
          }}
          onClose={() => setShowEditPopup(false)}
          onSave={saveEdit}
        />
      )}

      <AlertPopup
        title={t("delete student")}
        type="confirm"
        message={t("are you sure you want to delete this student?")}
        isOpen={showDeletePopup}
        onCancel={() => {
          setShowDeletePopup(false);
          setStudentToDelete(null);
        }}
        onConfirm={confirmDelete}
      />
      {/* Simple Pagination */}
    </div>
  );
}
