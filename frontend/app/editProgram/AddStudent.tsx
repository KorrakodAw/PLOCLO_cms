/* eslint-disable @typescript-eslint/no-explicit-any */
import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { addStudent, getStudentsPaginated } from "../../utils/studentApi";

import { Column, Table } from "../../components/Table";
import PaginationControlButton from "../../components/PaignateControlButton";
import { getFaculties } from "../../utils/facultyApi";
import { getUniversities } from "../../utils/universityApi";
import { getPrograms } from "../../utils/programApi";
import { useToast } from "../../components/Toast";

interface AddStudentProps {
  universityId?: string;
  facultyId?: string;
  programId?: string;
  year?: string;
}

interface Student {
  id: number;
  student_id: string;
  name: string;
  first_name: string;
  last_name: string;
  program_shortname_en: string;
  program_shortname_th: string;
}

export default function AddStudent({
  universityId,
  facultyId,
  programId,
  year,
}: AddStudentProps) {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn, initialized } = useAuth();

  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [programOptions, setProgramOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [facultyOptions, setFacultyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [universityOptions, setUniversityOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [yearOptions, setYearOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [, setLoadingStudent] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const { showToast, ToastElement } = useToast();

  // Fetch universities
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const fetchUniversities = async () => {
      try {
        const data = await getUniversities(token);
        setUniversityOptions([
          { label: t("please select a university"), value: "" },
          ...data.map((u: any) => ({ label: u.name, value: String(u.id) })),
        ]);
      } catch {
        showToast("Failed to fetch universities", "error");
      }
    };
    fetchUniversities();
  }, [isLoggedIn, token, t, showToast]);

  // Fetch faculties for selected university
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedUniversity) {
      setFacultyOptions([{ label: t("please select a faculty"), value: "" }]);
      return;
    }
    const fetchFaculties = async () => {
      try {
        const data = await getFaculties(token);
        setFacultyOptions([
          { label: t("please select a faculty"), value: "" },
          ...data
            .filter((f: any) => String(f.university_id) === selectedUniversity)
            .map((f: any) => ({ label: f.name, value: String(f.id) })),
        ]);
      } catch {
        showToast("Failed to fetch faculties", "error");
      }
    };
    fetchFaculties();
  }, [isLoggedIn, token, t, selectedUniversity, showToast]);

  useEffect(() => {
    if (!isLoggedIn || !token || !selectedFaculty) {
      setYearOptions([{ label: t("please select a year"), value: "" }]);
      return;
    }

    getPrograms(token, selectedFaculty)
      .then((data) => {
        // Explicitly tell TypeScript that these are numbers
        const years = Array.from(
          new Set<number>(
            data.map((p: any) => Number(p.program_year)) // ensure numeric
          )
        ).sort((a, b) => b - a); // optional: sort descending

        setYearOptions([
          { label: t("please select a year"), value: "" },
          ...years.map((y) => {
            const label = lang === "en" ? String(y - 543) : String(y);
            return { label, value: String(y) }; // display converted label, keep real value
          }),
        ]);
      })
      .catch(() => showToast("Failed to fetch years", "error"));
  }, [isLoggedIn, token, selectedFaculty, t, lang, showToast]);

  // 🧩 Load all programs
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedFaculty || !selectedYear) {
      setProgramOptions([{ label: t("please select a program"), value: "" }]);
      return;
    }

    // Fetch programs for the selected faculty
    getPrograms(token, selectedFaculty)
      .then((data) => {
        // Filter programs by the selected year
        const programs = data.filter(
          (p: any) => String(p.program_year) === selectedYear
        );

        if (programs.length === 0) {
          setProgramOptions([{ label: t("no programs available"), value: "" }]);
        } else {
          setProgramOptions([
            { label: t("please select a program"), value: "" },
            ...programs.map((p: any) => ({
              label: p.program_name_en,
              value: String(p.id),
            })),
          ]);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          showToast("Failed to fetch programs by year", "error");
        } else {
          showToast(
            "Unexpected error occurred while fetching programs",
            "error"
          );
        }
      });
  }, [isLoggedIn, token, selectedFaculty, selectedYear, t, showToast]);

  // 🧩 Load paginated student list
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    setLoadingStudent(true);
    const filters: Record<string, string | undefined> = {};

    if (universityId) filters.universityId = universityId;
    if (facultyId) filters.facultyId = facultyId;
    if (programId) filters.programId = programId;
    if (year) filters.year = year;

    getStudentsPaginated(token, page, 10, filters)
      .then((res) => {
        const data = Array.isArray(res) ? res : res.data || [];
        const total = res.total || data.length || 1;
        setStudents(data);
        setTotalPages(Math.ceil(total / limit));
      })
      .catch((err) => {
        showToast("API student error: " + err.message, "error");
      })
      .finally(() => setLoadingStudent(false));
  }, [
    isLoggedIn,
    token,
    page,
    limit,
    universityId,
    facultyId,
    programId,
    year,
    showToast,
  ]);

  // 🧩 Add from Excel
  const handleAddStudentExcel = async (rows: any[]) => {
    if (!initialized) return alert("Auth not initialized.");
    if (!isLoggedIn || !token) return alert("Please log in again.");
    if (!selectedProgram) return alert("Please select a program first.");

    let successCount = 0;
    let failCount = 0;
    const errorDetails: string[] = [];

    // Inject selectedProgram as program_id for every row
    const rowsWithProgram = rows.map((row) => ({
      ...row,
      program_id: selectedProgram,
      year_of_admission: Number(row.year_of_admission ?? row.year),
    }));

    for (const [i, row] of rowsWithProgram.entries()) {
      const student_id = row.student_id;
      const first_name = row.first_name;
      const last_name = row.last_name;
      const program_id = row.program_id;

      // ✅ Validate
      if (!student_id || !first_name || !last_name || !program_id) {
        failCount++;
        errorDetails.push(`Row ${i + 1}: missing required fields`);
        continue;
      }

      const payload = {
        student_id: String(student_id),
        first_name: String(first_name),
        last_name: String(last_name),
        program_id,
      };

      try {
        await addStudent(payload, token);
        successCount++;
        window.location.reload();
      } catch (err: any) {
        failCount++;
        errorDetails.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    showToast(
      `Excel upload completed: ${successCount} succeeded, ${failCount} failed.`,
      failCount > 0 ? "error" : "success"
    );
    if (failCount > 0) {
      showToast(
        `Some rows failed to add:\n${errorDetails.join("\n")}`,
        "error"
      );
    }
  };

  const studentColumns: Column<Student>[] = [
    { header: t("student id"), accessor: "student_id" },
    {
      header: "full name",
      accessor: "name",
      render: (value, row) => `${row.first_name} ${row.last_name}`,
    },
    {
      header: t("program"),
      accessor: lang === "en" ? "program_shortname_en" : "program_shortname_th",
      render: (v) => v || "-",
    },
  ];

  // 🧩 Add single student manually
  const handleAddStudent = async (data: Record<string, unknown>) => {
    if (!initialized) return;
    if (!isLoggedIn || !token)
      return alert("You are logged out or token expired. Please log in again.");
    if (!selectedProgram) return alert("Please select a program.");

    // Map form fields to backend payload
    const payload = {
      student_id: String(data.code), // code → student_id
      first_name: String(data.nameEn), // nameEn → first_name
      last_name: String(data.nameTh), // nameTh → last_name
      program_id: selectedProgram,
    };

    try {
      await addStudent(payload, token);
      showToast("Student added successfully!", "success");
      // Update students table
      getStudentsPaginated(token, page, limit).then((res) =>
        setStudents(res.data)
      );
    } catch (err: any) {
      showToast("Failed to add student: " + err.message, "error");
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
          showAbbreviationInputs={false}
          programOptions={programOptions}
          universityOptions={universityOptions}
          facultyOptions={facultyOptions}
          yearOptions={yearOptions}
          selectedProgram={selectedProgram}
          selectedUniversity={selectedUniversity}
          selectedFaculty={selectedFaculty}
          selectedYear={selectedYear}
          onUniversityChange={(e) => setSelectedUniversity(e.target.value)}
          onFacultyChange={(e) => setSelectedFaculty(e.target.value)}
          onProgramChange={(e) => setSelectedProgram(e.target.value)}
          onYearChange={(e) => {
            const selectedYear = e.target.value;
            setSelectedYear(selectedYear);
          }}
          onSubmit={handleAddStudent}
          onSubmitExcel={handleAddStudentExcel}
        />
      </div>

      <hr className="my-3" />

      <div className="mt-4">
        <Table<any> columns={studentColumns} data={students} />

        {/* Simple Pagination */}
        <PaginationControlButton
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <ToastElement />
      </div>
    </div>
  );
}
