import { useTranslation } from "react-i18next";
import { Table, Column } from "../../components/Table";
import { useEffect, useState } from "react";
import PaginationControlButton from "../../components/PaignateControlButton";
import AddButton from "../../components/AddButton";

import { addClo, getCLOsPaginate, CLO } from "../../utils/cloApi";
import { getPrograms, Program } from "../../utils/programApi";
import { getUniversities, University } from "../../utils/universityApi";
import { getFaculties, Faculty } from "../../utils/facultyApi";
import { getCourses, Course } from "../../utils/courseApi";
import { useToast } from "../../components/Toast";
import { useAuth } from "../context/AuthContext";

import AlertPopup from "../../components/AlertPopup";
import FormEditPopup from "../../components/EditPopup";
import { apiClient } from "../../utils/apiClient";
import LoadingOverlay from "../../components/LoadingOverlay";

// --- Interfaces ---

interface ExcelCLORow {
  code?: string | number;
  nameEn?: string;
  nameTh?: string;
  clo_name?: string;
  clo_code?: string;
  [key: string]: unknown;
}

interface CLOManagementProps {
  universityId?: string;
  facultyId?: string;
  programId?: string;
  year?: string;
  semester?: string;
  section?: string;
  courseId?: string;
}

export default function CLOManagement({
  universityId,
  facultyId,
  programId,
  year,
  semester,
  section,
  courseId,
}: CLOManagementProps) {
  const { t, i18n } = useTranslation("common");
  const { showToast, ToastElement } = useToast();
  const lang = i18n.language;
  const { isLoggedIn, token } = useAuth();

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Filters
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  // Options
  const [universityOptions, setUniversityOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [facultyOptions, setFacultyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [programOptions, setProgramOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [yearOptions, setYearOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [semesterOptions, setSemesterOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [sectionOptions, setSectionOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [courseOptions, setCourseOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const [courseVariants, setCourseVariants] = useState<Course[]>([]);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);

  // 🟢 This will now store the MASTER Course ID
  const [specificCourseId, setSpecificCourseId] = useState<string>("");

  // Data
  const [clos, setClos] = useState<Array<CLO>>([]);
  const [loading, setLoading] = useState(false);

  const [selectedCLO, setSelectedCLO] = useState<CLO | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [cloToDelete, setCloToDelete] = useState<CLO | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  // --- Filter Logic ---

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
  }, [isLoggedIn, token, t, showToast, selectedUniversity]);

  useEffect(() => {
    if (!isLoggedIn || !token || !selectedUniversity) {
      setFacultyOptions([{ label: t("please select a faculty"), value: "" }]);
      setProgramOptions([{ label: t("please select a program"), value: "" }]);
      setYearOptions([{ label: t("please select a year"), value: "" }]);
      setSectionOptions([{ label: "please select a section", value: "" }]);
      setSemesterOptions([{ label: "please select a semester", value: "" }]);
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
        const filtered = data.filter(
          (f: Faculty) => String(f.university_id) === selectedUniversity
        );
        if (filtered.length === 0) {
          setFacultyOptions([
            { label: t("no faculties available"), value: "" },
          ]);
          return;
        }
        setFacultyOptions([
          { label: t("please select a faculty"), value: "" },
          ...filtered.map((f: Faculty) => ({
            label: f.name,
            value: String(f.id),
          })),
        ]);
      } catch {
        showToast("API faculty error", "error");
      }
    };
    fetchFaculties();
  }, [isLoggedIn, token, t, selectedUniversity, showToast]);

  useEffect(() => {
    if (!isLoggedIn || !token || !selectedFaculty) {
      setAllPrograms([]);
      setYearOptions([{ label: t("please select a year"), value: "" }]);
      setProgramOptions([{ label: t("please select a program"), value: "" }]);
      return;
    }
    setSelectedYear("");
    setSelectedProgram("");

    getPrograms(token, selectedFaculty)
      .then((data) => {
        setAllPrograms(data);
        const years = Array.from(
          new Set<number>(data.map((p: Program) => Number(p.program_year)))
        ).sort((a, b) => b - a);
        if (years.length === 0) {
          setYearOptions([{ label: t("no years available"), value: "" }]);
        } else {
          setYearOptions([
            { label: t("please select a year"), value: "" },
            ...years.map((y) => ({
              label: lang === "en" ? String(y - 543) : String(y),
              value: String(y),
            })),
          ]);
        }
      })
      .catch((err) => showToast("API program error: " + err.message, "error"));
  }, [isLoggedIn, token, selectedFaculty, t, lang, showToast]);

  useEffect(() => {
    if (!selectedYear || allPrograms.length === 0) {
      setProgramOptions([{ label: t("please select a program"), value: "" }]);
      return;
    }
    const filteredPrograms = allPrograms.filter(
      (p: Program) => String(p.program_year) === selectedYear
    );
    if (filteredPrograms.length === 0) {
      setProgramOptions([{ label: t("no programs available"), value: "" }]);
    } else {
      setProgramOptions([
        { label: t("please select a program"), value: "" },
        ...filteredPrograms.map((p: Program) => ({
          label: p.program_shortname_en,
          value: String(p.id),
        })),
      ]);
    }
  }, [selectedYear, allPrograms, t]);

  useEffect(() => {
    if (!isLoggedIn || !token || !selectedProgram) {
      setCourseOptions([{ label: "please select a course", value: "" }]);
      setSelectedCourse("");
      return;
    }
    if (!selectedCourse) {
      setSelectedSection("");
      setSelectedSemester("");
    }
    const fetchCourses = async () => {
      try {
        const data = (await getCourses(token, selectedProgram)) as Course[];
        const uniqueCourses = Array.from(
          new Map(data.map((c: Course) => [c.code, c])).values()
        );
        setCourseOptions([
          { label: "please select a course", value: "" },
          ...uniqueCourses.map((c: Course) => ({
            label: `${c.code} - ${c.name}`,
            value: String(c.code),
          })),
        ]);
      } catch {
        showToast("API course error", "error");
      }
    };
    fetchCourses();
  }, [isLoggedIn, token, selectedProgram, selectedCourse, t, showToast]);

  useEffect(() => {
    if (!isLoggedIn || !token || !selectedCourse) {
      setCourseVariants([]);
      setSectionOptions([{ label: "please select a section", value: "" }]);
      setSemesterOptions([{ label: "please select a semester", value: "" }]);
      setSelectedSemester("");
      setSelectedSection("");
      return;
    }
    const fetchVariants = async () => {
      try {
        const data = await getCourses(token, selectedProgram);
        const courseData = data.filter(
          (c: Course) => String(c.code) === selectedCourse
        );
        setCourseVariants(courseData);
        setSelectedSemester("");
        setSelectedSection("");
      } catch {
        showToast("Error fetching course details", "error");
      }
    };
    fetchVariants();
  }, [isLoggedIn, token, selectedCourse, selectedProgram, showToast]);

  useEffect(() => {
    if (courseVariants.length === 0) {
      setSemesterOptions([{ label: "please select a semester", value: "" }]);
      return;
    }
    const semesters = Array.from(
      new Set(courseVariants.map((c: Course) => String(c.semester)))
    ) as string[];
    semesters.sort((a, b) => Number(a) - Number(b));
    setSemesterOptions([
      { label: t("please select a semester"), value: "" },
      ...semesters.map((s) => ({ label: "semester " + s, value: s })),
    ]);
  }, [courseVariants, t]);

  useEffect(() => {
    if (!selectedSemester || courseVariants.length === 0) {
      setSectionOptions([{ label: "please select a section", value: "" }]);
      return;
    }
    const relevantRows = courseVariants.filter(
      (c) => String(c.semester) === selectedSemester
    );
    const sections = Array.from(
      new Set(relevantRows.map((c: Course) => String(c.section)))
    ) as string[];
    sections.sort((a, b) => Number(a) - Number(b));
    setSectionOptions([
      { label: t("please select a section"), value: "" },
      ...sections.map((s) => ({ label: "section " + s, value: s })),
    ]);
  }, [selectedSemester, courseVariants, t]);

  // 🟢 FIX: Set specificCourseId to the Master ID, not Section ID
  useEffect(() => {
    if (courseVariants.length > 0 && selectedSemester && selectedSection) {
      const foundCourse = courseVariants.find(
        (c) =>
          String(c.semester) === String(selectedSemester) &&
          String(c.section) === String(selectedSection)
      );

      if (foundCourse) {
        // Use 'course_id' (Master Course ID) because CLOs attach to the Course, not the Section.
        setSpecificCourseId(String(foundCourse.course_id));
      } else {
        setSpecificCourseId("");
      }
    } else {
      setSpecificCourseId("");
    }
  }, [selectedSemester, selectedSection, courseVariants]);

  // --- CRUD Operations ---

  const handleAddclo = async (data: Record<string, unknown>) => {
    if (!token) return;
    if (!specificCourseId) {
      showToast(
        t("Please select a Semester and Section to identify the course"),
        "error"
      );
      return;
    }
    try {
      await addClo(
        {
          code: String(data.code),
          name: String(data.nameEn),
          name_th: String(data.nameTh || ""),
          course_id: specificCourseId, // Sending Master ID
        },
        token
      );
      fetchCLOs();
      showToast(t("clo added successfully"), "success");
      setPage(1);
    } catch {
      showToast("Failed to add CLO", "error");
    }
  };

  const handleExcelUpload = async (rows: ExcelCLORow[]) => {
    if (!token || !specificCourseId) {
      showToast(t("Please select a course before uploading"), "error");
      return;
    }
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const [index, row] of rows.entries()) {
      const code = row.code || row.clo_code || row.CLO_code;
      const nameEn = row.nameEn || row.CLO_engname;
      const nameTh = row.nameTh || row.CLO_name;

      if (!code || !nameEn) {
        failCount++;
        errors.push(`Row ${index + 1}: Missing code or name`);
        continue;
      }
      try {
        await addClo(
          {
            code: String(code),
            name: String(nameEn),
            name_th: String(nameTh || ""),
            course_id: specificCourseId, // Sending Master ID
          },
          token
        );
        successCount++;
      } catch {
        failCount++;
        errors.push(`Row ${index + 1}: API Error`);
      }
    }
    if (successCount > 0) {
      fetchCLOs();
      showToast(
        `Success: ${successCount}, Failed: ${failCount}`,
        failCount > 0 ? "error" : "success"
      );
      setPage(1);
    }
  };

  const cloColumns: Column<CLO>[] = [
    { header: "Code", accessor: "code" },
    { header: "CLO Name (EN)", accessor: "name" },
    { header: "CLO Name (TH)", accessor: "name_th" },
    {
      header: "Actions",
      accessor: "id",
      actions: [
        {
          label: "Edit",
          color: "blue",
          hoverColor: "blue",
          onClick: (row: CLO) => {
            setSelectedCLO(row);
            setShowEditPopup(true);
          },
        },
        {
          label: "Delete",
          color: "red",
          hoverColor: "red",
          onClick: (row: CLO) => {
            setCloToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  const saveEdit = async () => {
    if (!selectedCLO) return;
    try {
      await apiClient.patch(
        `/clo/${selectedCLO.id}`,
        {
          code: selectedCLO.code,
          name: selectedCLO.name,
          name_th: selectedCLO.name_th,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCLOs();
      showToast("CLO updated successfully", "success");
      setShowEditPopup(false);
      setSelectedCLO(null);
    } catch {
      showToast("Failed to update CLO", "error");
    }
  };

  const confirmDelete = async () => {
    if (!cloToDelete) return;
    try {
      await apiClient.delete(`/clo/${cloToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCLOs();
      showToast("CLO deleted successfully", "success");
    } catch {
      showToast("Failed to delete CLO", "error");
    } finally {
      setShowDeletePopup(false);
      setCloToDelete(null);
    }
  };

  // 🟢 FIX: Fetch Logic
  const fetchCLOs = () => {
    if (!isLoggedIn || !token) return;
    setLoading(true);
    const filters: Record<string, string> = {};

    if (universityId) filters.universityId = universityId;
    if (facultyId) filters.facultyId = facultyId;
    if (programId) filters.programId = programId;
    if (year) filters.year = year;
    if (semester) filters.semester = semester;
    if (section) filters.section = section;

    // Prioritize specificCourseId (from dropdown) over prop courseId
    if (specificCourseId) {
      filters.courseId = specificCourseId;
    } else if (courseId) {
      filters.courseId = courseId;
    }

    getCLOsPaginate(token, page, limit, filters)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        const total = res.total || 1;
        setClos(data);
        setTotalPages(Math.ceil(total / limit));
      })
      .catch((err) => {
        showToast("API CLO error: " + err.message, "error");
      })
      .finally(() => setLoading(false));
  };

  // Add specificCourseId to dependency array so table refreshes when selection changes
  useEffect(() => {
    fetchCLOs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    courseId,
    specificCourseId, // 🟢 Added dependency
  ]);

  return (
    <div className="mt-5 p-5">
      {loading && <LoadingOverlay />}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{"clo manage"}</h1>
        <AddButton
          buttonText="add new clo"
          placeholderText={{
            code: "CLO Code (e.g., CLO1)",
            nameEn: "CLO Name (EN)",
            nameTh: "CLO Name (TH)",
          }}
          submitButtonText={{
            insert: "insert clo",
            upload: "upload clo (excel)",
          }}
          showAbbreviationInputs={false}
          programOptions={programOptions}
          universityOptions={universityOptions}
          facultyOptions={facultyOptions}
          yearOptions={yearOptions}
          semesterOptions={semesterOptions}
          sectionOptions={sectionOptions}
          courseOptions={courseOptions}
          selectedProgram={selectedProgram}
          selectedFaculty={selectedFaculty}
          selectedUniversity={selectedUniversity}
          selectedYear={selectedYear}
          selectedSemester={selectedSemester}
          selectedSection={selectedSection}
          selectedCourse={selectedCourse}
          onProgramChange={(e) => setSelectedProgram(e.target.value)}
          onFacultyChange={(e) => setSelectedFaculty(e.target.value)}
          onUniversityChange={(e) => setSelectedUniversity(e.target.value)}
          onYearChange={(e) => setSelectedYear(e.target.value)}
          onSemesterChange={(e) => setSelectedSemester(e.target.value)}
          onSectionChange={(e) => setSelectedSection(e.target.value)}
          onCourseChange={(e) => setSelectedCourse(e.target.value)}
          onSubmit={handleAddclo}
          onSubmitExcel={handleExcelUpload}
        />
      </div>

      <hr className="my-3" />

      <Table<CLO> columns={cloColumns} data={clos} />

      {selectedCLO && showEditPopup && (
        <FormEditPopup
          title="Edit CLO"
          data={selectedCLO}
          fields={[
            { label: "CLO Code", key: "code", type: "text" },
            { label: "CLO Name (EN)", key: "name", type: "text" },
            { label: "CLO Name (TH)", key: "name_th", type: "text" },
          ]}
          onChange={(updated) => setSelectedCLO(updated)}
          onSave={saveEdit}
          onClose={() => {
            setShowEditPopup(false);
            setSelectedCLO(null);
          }}
        />
      )}

      <AlertPopup
        isOpen={showDeletePopup}
        type="confirm"
        title="Delete CLO"
        message="Are you sure you want to delete this CLO?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeletePopup(false);
          setCloToDelete(null);
        }}
      />

      <PaginationControlButton
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      <ToastElement />
    </div>
  );
}
