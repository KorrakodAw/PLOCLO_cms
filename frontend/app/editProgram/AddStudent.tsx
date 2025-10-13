/* eslint-disable @typescript-eslint/no-explicit-any */
import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { addStudent, getStudentsPaginated } from "../../utils/studentApi";
import { apiClient } from "../../utils/apiClient";
import { Table } from "../../components/Table";
import PaginationControlButton from "../../components/PaignateControlButton";

export default function AddStudent() {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn, initialized } = useAuth();

  const [selectedProgram, setSelectedProgram] = useState("");
  const [programOptions, setProgramOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [, setLoadingStudent] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // 🧩 Load all programs
  useEffect(() => {
    if (!isLoggedIn || !token) return;

    const fetchPrograms = async () => {
      try {
        const res = await apiClient("/api/program", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setProgramOptions([
          { label: "กรุณาเลือกโปรแกรม", value: "" },
          ...data.map((p: any) => ({
            label: `${p.program_name_th || p.program_name_en} (${
              p.program_year
            })`,
            value: String(p.id),
          })),
        ]);
      } catch (err) {
        console.error("Failed to fetch programs:", err);
      }
    };

    fetchPrograms();
  }, [isLoggedIn, token]);

  // 🧩 Load paginated student list
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    setLoadingStudent(true);
    getStudentsPaginated(token, page, limit)
      .then((res) => {
        setStudents(res.data);
        setTotalPages(Math.ceil((res.total || 1) / limit));
      })
      .catch((err) => {
        alert(err.message || "Failed to fetch students");
      })
      .finally(() => setLoadingStudent(false));
  }, [isLoggedIn, token, page, limit]);

  // 🧩 Add from Excel
  const handleAddStudentExcel = async (rows: any[]) => {
    if (!initialized) return alert("Auth not initialized.");
    if (!isLoggedIn || !token) return alert("Please log in again.");
    if (!selectedProgram) return alert("Please select a program first.");

    let successCount = 0;
    let failCount = 0;
    const errorDetails: string[] = [];

    for (const [i, row] of rows.entries()) {
      const student_id = row.code || row.student_id;
      const first_name = row.nameEn || row.first_name;
      const last_name = row.nameTh || row.last_name;
      const email = row.email || row.abbrTh;
      const year_of_admission = Number(row.year || row.abbrEn);

      // ✅ Validate
      if (
        !student_id ||
        !first_name ||
        !last_name ||
        !email ||
        !year_of_admission
      ) {
        failCount++;
        errorDetails.push(`Row ${i + 1}: missing required fields`);
        continue;
      }

      const payload = {
        student_id: String(student_id),
        first_name: String(first_name),
        last_name: String(last_name),
        email: String(email),
        year_of_admission,
        program_id: selectedProgram,
      };

      try {
        await addStudent(payload, token);
        successCount++;
      } catch (err: any) {
        failCount++;
        errorDetails.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    alert(
      `✅ Completed ${rows.length} rows:\n- Success: ${successCount}\n- Failed: ${failCount}`
    );

    if (failCount > 0) {
      console.error("❌ Import errors:", errorDetails);
      alert("Some rows failed. Check console for details.");
    }
  };

  // 🧩 Add single student manually
  const handleAddStudent = async (data: Record<string, unknown>) => {
    if (!initialized) return;
    if (!isLoggedIn || !token)
      return alert("You are logged out or token expired. Please log in again.");
    if (!selectedProgram) return alert("Please select a program.");

    const payload = {
      student_id: String(data.code),
      first_name: String(data.nameEn),
      last_name: String(data.nameTh),
      email: String(data.abbrTh),
      year_of_admission: Number(data.abbrEn),
      program_id: selectedProgram,
    };

    try {
      await addStudent(payload, token);
      alert("✅ Student added successfully.");
      // Optionally reload students
      getStudentsPaginated(token, page, limit).then((res) =>
        setStudents(res.data)
      );
    } catch (err: any) {
      alert("❌ Failed to add student: " + err.message);
    }
  };

  return (
    <div className="mt-5 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{t("student management")}</h1>

        <AddButton
          buttonText={t("create new student")}
          placeholderText={{
            code: "Student Code",
            nameEn: "First Name",
            nameTh: "Last Name",
            abbrEn: "Year of Admission",
            abbrTh: "Email",
          }}
          submitButtonText={{
            insert: "Insert Student",
            upload: "Upload Student (Excel)",
          }}
          showYearInput={false}
          programOptions={programOptions}
          selectedProgram={selectedProgram}
          onProgramChange={(e) => setSelectedProgram(e.target.value)}
          onSubmit={handleAddStudent}
          onSubmitExcel={handleAddStudentExcel}
        />
      </div>

      <hr className="my-3" />

      <div className="mt-4">
        <Table
          columns={[
            { header: t("student id"), accessor: "student_id" },
            { header: t("first name"), accessor: "first_name" },
            { header: t("last name"), accessor: "last_name" },
            { header: t("email"), accessor: "email" },
            {
              header: t("year of admission"),
              accessor: "year_of_admission",
              render: (value) => (lang === "en" ? value - 543 : `${value} `),
            },
            {
              header: t("program"),
              accessor:
                lang === "en" ? "program_shortname_en" : "program_shortname_th",
              render: (v) => v || "-",
            },
          ]}
          data={students}
        />

        {/* Simple Pagination */}
        <PaginationControlButton
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          t={t}
        />
      </div>
    </div>
  );
}
