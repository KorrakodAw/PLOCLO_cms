import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import AddButton from "../../components/AddButton";
import { Table, Column } from "../../components/Table";
import PaginationControlButton from "../../components/PaignateControlButton";
import { getFaculties, Faculty } from "../../utils/facultyApi";
import { getUniversities, University } from "../../utils/universityApi";
import { useToast } from "../../components/Toast";

import { addCourse, getCoursePaginate, Course } from "../../utils/courseApi";
import { useAuth } from "../context/AuthContext";
import { getPrograms, Program } from "../../utils/programApi";

import FormEditPopup from "../../components/EditPopup";
import AlertPopup from "../../components/AlertPopup";
import { apiClient } from "../../utils/apiClient";

// interface ProgramOption {
//   label: string;
//   value: string;
//   program_shortname_en?: string;
// }

interface CourseManagementProps {
  universityId?: string;
  facultyId?: string;
  programId?: string;
  year?: string;
  semester?: string;
  section?: string;
  course?: string;
}

// Define this outside your component or in a types file
interface ExcelCourseRow {
  // Possible keys for Code
  code?: string | number;
  Code?: string | number;
  course_id?: string | number;

  // Possible keys for Thai Name
  nameTh?: string;
  course_name?: string;
  ชื่อไทย?: string;

  // Possible keys for English Name
  nameEn?: string;
  course_engname?: string;
  ชื่ออังกฤษ?: string;
  PLO_engname?: string;

  // Allow other unknown columns from Excel without throwing errors
  [key: string]: unknown;
}

export default function CourseManagement({
  universityId,
  facultyId,
  programId,
  year,
  semester,
  section,
}: CourseManagementProps) {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn, initialized } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [, setLoadingCourse] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const { showToast, ToastElement } = useToast();

  const [yearOptions, setYearOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [programOptions, setProgramOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [universityOptions, setUniversityOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [facultyOptions, setFacultyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [semesterOptions] = useState([
    { label: "Please select a semester", value: "" },
    { label: "semester 1", value: "1" },
    { label: "semester 2", value: "2" },
    { label: "summer", value: "3" },
  ]);
  const [sectionOptions] = useState([
    { label: "Please select a section", value: "" },
    { label: "section 1", value: "1" },
    { label: "section 2", value: "2" },
    { label: "section 3", value: "3" },
  ]);

  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);

  // Fetch university options
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const fetchUniversities = async () => {
      try {
        const data = await getUniversities(token);
        setUniversityOptions([
          { label: t("please select a university"), value: "" },
          ...data.map((u: University) => ({
            label: u.name,
            value: String(u.id),
          })),
        ]);
      } catch {
        showToast("API university error", "error");
      }
    };
    fetchUniversities();
  }, [isLoggedIn, token, t, , showToast]);

  //fetch Faculties
  // // Fetch faculties for selected university (use parent universityId)
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedUniversity) {
      setProgramOptions([{ label: t("please select a program"), value: "" }]);
      setYearOptions([{ label: t("please select a year"), value: "" }]);
      setFacultyOptions([{ label: t("please select a faculty"), value: "" }]);
      setSelectedProgram("");
      setSelectedFaculty("");
      setSelectedSection("");
      setSelectedYear("");
      setSelectedSemester("");
      return;
    }
    const fetchFaculties = async () => {
      try {
        const data = await getFaculties(token, selectedUniversity);
        setFacultyOptions([
          { label: t("please select a faculty"), value: "" },
          ...data
            .filter(
              (f: Faculty) => String(f.university_id) === selectedUniversity
            )
            .map((f: Faculty) => ({ label: f.name, value: String(f.id) })),
        ]);
      } catch {
        showToast("API faculty error", "error");
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
            data.map((p: Program) => Number(p.program_year)) // ensure numeric
          )
        ).sort((a, b) => b - a); // optional: sort descending

        if (years.length === 0) {
          setYearOptions([{ label: t("no years available"), value: "" }]);
          return;
        } else {
          setYearOptions([
            { label: t("please select a year"), value: "" },
            ...years.map((y) => {
              const label = lang === "en" ? String(y - 543) : String(y);
              return { label, value: String(y) }; // display converted label, keep real value
            }),
          ]);
        }
      })
      .catch((err) => showToast("API program error: " + err.message, "error"));
  }, [isLoggedIn, token, selectedFaculty, t, lang, showToast]);

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
          (p: Program) => String(p.program_year) === selectedYear
        );

        if (programs.length === 0) {
          setProgramOptions([{ label: t("no programs available"), value: "" }]);
        } else {
          setProgramOptions([
            { label: t("please select a program"), value: "" },
            ...programs.map((p: Program) => ({
              label: p.program_shortname_en,
              value: String(p.id),
            })),
          ]);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          showToast("API program error: " + err.message, "error");
        } else {
          showToast("API program error: unknown error", "error");
        }
      });
  }, [isLoggedIn, token, selectedFaculty, selectedYear, t, showToast]);

  const handleAddCourse = async (data: Record<string, unknown>) => {
    if (!token) return;
    if (!selectedProgram) {
      showToast("Please select the program from the filter above.", "error");
      return;
    }
    if (!selectedSemester || !selectedSection) {
      showToast(
        "Please complete the selection from the filter above.",
        "error"
      );
      return;
    }
    try {
      await addCourse(
        {
          code: String(data.code),
          name: String(data.nameEn),
          name_th: String(data.nameTh),
          program_id: String(selectedProgram),
          section: String(selectedSection),
          semester: String(selectedSemester),
        },
        token
      );
      fetchCourses();
      setPage(1);
      showToast(t("Course added successfully!"), "success");
    } catch {
      showToast(t("Failed to add course"), "error");
    }
  };

  const handleAddCourseExcel = async (rows: ExcelCourseRow[]) => {
    // 1. Guard Clauses
    if (!initialized) {
      showToast("Auth context not initialized.", "error");
      return;
    }
    if (!isLoggedIn || !token) {
      showToast(
        "You are logged out or token expired. Please log in again.",
        "error"
      );
      return;
    }
    if (!selectedSemester || !selectedSection) {
      showToast("Please complete the selection from the filter.", "error");
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errorDetails: string[] = [];

    // 2. Loop through rows
    for (const [i, row] of rows.entries()) {
      const missingFields: string[] = [];

      // Safe access using the Interface keys
      const code = row.code || row.Code || row.course_id;
      const nameTh = row.nameTh || row.course_name || row["ชื่อไทย"];
      const nameEn =
        row.nameEn ||
        row.course_engname ||
        row["ชื่ออังกฤษ"] ||
        row.PLO_engname;

      // Validation
      if (!code) missingFields.push("code");
      if (!nameTh) missingFields.push("nameTh");
      if (!nameEn) missingFields.push("nameEn");

      if (missingFields.length > 0) {
        failCount++;
        errorDetails.push(`Row ${i + 1}: missing ${missingFields.join(", ")}`);
        continue; // Skip to next row
      }

      // Prepare Payload (Ensure values are strings)
      const payload = {
        code: String(code),
        name_th: String(nameTh),
        name: String(nameEn),
        program_id: selectedProgram,
        semester: selectedSemester,
        section: selectedSection,
      };

      // 3. API Call
      try {
        await addCourse(payload, token);
        successCount++;
        // REMOVED: window.location.reload() from here.
        // Reloading inside the loop would stop the process after 1 item.
      } catch (err: unknown) {
        failCount++;

        let backendMsg = "Unknown error";

        // Safe Error Handling (Replacing 'any' logic)
        if (err instanceof Error) {
          backendMsg = err.message;
        } else if (typeof err === "string") {
          backendMsg = err;
        } else {
          // If your API throws a promise or custom object, handle it safely
          try {
            backendMsg = JSON.stringify(err);
          } catch {
            backendMsg = "Non-serializable error";
          }
        }

        errorDetails.push(`Row ${i + 1}: backend error - ${backendMsg}`);
        console.error(`Error adding row ${i + 1}:`, err);
      }
    }

    // 4. Final Summary & State Update
    let summary = `เพิ่มข้อมูลจาก Excel สำเร็จ: ${successCount} รายการ\nล้มเหลว: ${failCount} รายการ`;

    if (errorDetails.length > 0) {
      summary += `\n\nรายละเอียดข้อผิดพลาด:\n` + errorDetails.join("\n");
    }

    showToast(summary, failCount > 0 ? "error" : "success");

    // Refresh Data
    try {
      // Only refresh/reload if at least one item succeeded
      if (successCount > 0) {
        fetchCourses();
        setPage(1);
        setSelectedProgram("");
        // Ideally call your fetch function here instead of reloading the page
        // await fetchCourses();

        // If you must reload the page, do it here at the VERY END:
      }
    } catch {
      showToast("Failed to refresh list after upload.", "error");
    }
  };

  // Optional: render program name instead of ID
  // const programIdToShortName = (id: string | number) => {
  //   const found = programOptions.find((p) => p.value === String(id));
  //   return found?.label || id;
  // };

  const courseColumns: Column<Course>[] = [
    { header: t("course id"), accessor: "code" },
    lang === "en"
      ? { header: "Name", accessor: "name" }
      : { header: "ชื่อหลักสูตร", accessor: "name_th" },
    { header: "section", accessor: "section" },
    {
      header: "Actions",
      accessor: "id",
      actions: [
        {
          label: t("edit"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row: Course) => {
            setSelectedCourse(row);
            setShowEditPopup(true);
          },
        },
        {
          label: t("delete"),
          color: "red",
          hoverColor: "red",
          onClick: (row: Course) => {
            setCourseToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];
  const fetchCourses = async () => {
    if (!isLoggedIn || !token) return;
    setLoadingCourse(true);
    const filters: Record<string, string> = {};

    if (universityId) filters.universityId = universityId;
    if (facultyId) filters.facultyId = facultyId;
    if (programId) filters.programId = programId;
    if (year) filters.year = year;
    if (semester) filters.semester = semester;
    if (section) filters.section = section;

    try {
      const res = await getCoursePaginate(token, page, 10, filters);
      const data = Array.isArray(res) ? res : res.data || [];
      const total = res.total || 1;
      setCourses(data);
      setTotalPages(Math.ceil(total / limit));
    } catch (err: unknown) {
      showToast(
        "API course error: " +
          (err instanceof Error ? err.message : String(err)),
        "error"
      );
    } finally {
      setLoadingCourse(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [
    isLoggedIn,
    token,
    page,
    universityId,
    facultyId,
    programId,
    year,
    semester,
    section,
  ]);

  const saveEdit = async () => {
    if (!selectedCourse || !token) return;

    try {
      await apiClient.patch(`/course/${selectedCourse.id}`, selectedCourse, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(t("Course updated successfully!"), "success");
      fetchCourses();
    } catch {
      showToast(t("Failed to update course"), "error");
    } finally {
      setShowEditPopup(false);
      setSelectedCourse(null);
    }
  };

  const confirmDelete = async () => {
    if (!courseToDelete || !token) return;

    try {
      await apiClient.delete(`/course/${courseToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(t("Course deleted successfully!"), "success");
      fetchCourses();
    } catch {
      showToast(t("Failed to delete course"), "error");
    } finally {
      setShowDeletePopup(false);
      setCourseToDelete(null);
    }
  };

  return (
    <div className="mt-5 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{t("course management")}</h1>
        <AddButton
          buttonText={t("create new course")}
          placeholderText={{
            code: "Course Id",
            nameEn: "Course Name (EN)",
            nameTh: "Course Name (TH)",
          }}
          submitButtonText={{
            insert: "Insert Course",
            upload: "Upload Course (Excel)",
          }}
          showAbbreviationInputs={false}
          programOptions={programOptions}
          universityOptions={universityOptions}
          facultyOptions={facultyOptions}
          yearOptions={yearOptions}
          semesterOptions={semesterOptions}
          sectionOptions={sectionOptions}
          selectedProgram={selectedProgram}
          selectedFaculty={selectedFaculty}
          selectedUniversity={selectedUniversity}
          selectedYear={selectedYear}
          selectedSemester={selectedSemester}
          selectedSection={selectedSection}
          onProgramChange={(e) => setSelectedProgram(e.target.value)}
          onFacultyChange={(e) => setSelectedFaculty(e.target.value)}
          onUniversityChange={(e) => setSelectedUniversity(e.target.value)}
          onYearChange={(e) => {
            const selectedYear = e.target.value;
            setSelectedYear(selectedYear);
          }}
          onSemesterChange={(e) => {
            const selectedSemester = e.target.value;
            setSelectedSemester(selectedSemester);
          }}
          onSectionChange={(e) => {
            const selectedSection = e.target.value;
            setSelectedSection(selectedSection);
          }}
          onSubmit={handleAddCourse}
          onSubmitExcel={handleAddCourseExcel}
        />
      </div>

      <hr className="my-3" />

      <Table<Course> columns={courseColumns} data={courses} />

      {selectedCourse && showEditPopup && (
        <FormEditPopup
          title="Edit Course"
          data={selectedCourse}
          fields={[
            { label: "Course ID", key: "code", type: "text" },
            {
              label: lang === "en" ? "Course Name" : "ชื่อหลักสูตร",
              key: lang === "en" ? "name" : "name_th",
              type: "text",
            },
            {
              label: "Section",
              key: "section",
              type: "select",
              options: ["1", "2", "3"],
            },
          ]}
          onChange={(update) => {
            setSelectedCourse(update);
          }}
          onClose={() => {
            setShowEditPopup(false);
            setSelectedCourse(null);
          }}
          onSave={saveEdit}
        />
      )}

      <AlertPopup
        title="Delete Course"
        type="confirm"
        message={`Are you sure you want to delete the course ${courseToDelete?.code}?`}
        isOpen={showDeletePopup}
        onCancel={() => {
          setShowDeletePopup(false);
          setCourseToDelete(null);
        }}
        onConfirm={confirmDelete}
      />

      <PaginationControlButton
        page={page}
        totalPages={totalPages} // ✅ FIXED
        onPageChange={setPage}
      />

      <ToastElement />
    </div>
  );
}
