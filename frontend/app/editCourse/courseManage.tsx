/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import AddButton from "../../components/AddButton";
import { Table, Column } from "../../components/Table";
import PaginationControlButton from "../../components/PaignateControlButton";
import { getFaculties } from "../../utils/facultyApi";
import { getUniversities } from "../../utils/universityApi";

import {
  getCourses,
  addCourse,
  uploadCoursesExcel,
} from "../../utils/courseApi";
import { getProgramsPaginated } from "../../utils/programApi";
import { useAuth } from "../context/AuthContext";

interface ProgramOption {
  label: string;
  value: string;
  program_shortname_en?: string;
}

interface Course {
  id: number;
  code: number;
  name: string;
  name_th: string;
  program_id: number;
  section: number;
}

export default function CourseManagement() {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn, initialized } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const totalPages = Math.max(1, Math.ceil(total / limit)); // ✅ FIXED

  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);
  const [universityOptions, setUniversityOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [facultyOptions, setFacultyOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");

  // Fetch university options
  useEffect(() => {
    const fetchUniversities = async () => {
      if (!token) return;
      try {
        const data = await getUniversities(token);
        setUniversityOptions([
          { label: t("please select a university"), value: "" },
          ...data.map((u: any) => ({ label: u.name, value: String(u.id) })),
        ]);
      } catch (err: any) {
        alert("Failed to fetch universities: " + (err.message || err));
      }
    };
    fetchUniversities();
  }, [token]);

  // Fetch program options
  const fetchPrograms = async () => {
    if (!token) return;
    try {
      const res = await getProgramsPaginated(token, 1, 10);
      setProgramOptions([
        { label: t("please select a program"), value: "" },
        ...res.data.map((p: any) => ({
          label: `${p.program_name_en} (${p.program_year})`,
          value: String(p.id),
        })),
      ]);
    } catch (err: any) {
      alert("Failed to fetch programs: " + (err.message || err));
    }
  };

  //fetch Faculties
  useEffect(() => {
    const fetchFaculties = async () => {
      if (!token) return;
      try {
        const data = await getFaculties(token);
        setFacultyOptions([
          { label: t("please select a faculty"), value: "" },
          ...data.map((f: any) => ({ label: f.name, value: String(f.id) })),
        ]);
      } catch (err: any) {
        alert("Failed to fetch faculties: " + (err.message || err));
      }
    };
    fetchFaculties();
  }, [token]);

  const handleAddCourseExcel = async (data: unknown[]) => {
    if (!token || !selectedProgram) {
      alert(t("Please select a program and ensure you are logged in."));
      return;
    }
    try {
      const results = await uploadCoursesExcel(
        data as any[],
        token,
        selectedProgram
      );
      const added = results.filter((r: any) => r.status === "added").length;
      const duplicate = results.filter(
        (r: any) => r.status === "duplicate"
      ).length;
      const error = results.filter((r: any) => r.status === "error").length;
      let msg = `${t("Upload summary")}\n`;
      msg += `${t("Added")}: ${added}\n`;
      msg += `${t("Duplicate")}: ${duplicate}\n`;
      msg += `${t("Error")}: ${error}`;
      alert(msg);
      fetchCourses(1);
    } catch (err: any) {
      alert(t("Error uploading courses") + ": " + (err.message || err));
    }
  };

  // Fetch courses
  const fetchCourses = async (pageNum = page) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getCourses(token, pageNum, limit);
      setCourses(res.data);
      setTotal(res.total || 0);
    } catch (err: any) {
      alert(t("Failed to fetch courses") + ": " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && initialized) {
      fetchPrograms();
      setPage(1);
    }
    // eslint-disable-next-line
  }, [isLoggedIn, initialized, token]);

  useEffect(() => {
    if (isLoggedIn && initialized) {
      fetchCourses(page);
    }
    // eslint-disable-next-line
  }, [page]);

  const handleAddCourse = async (data: Record<string, unknown>) => {
    if (!token) return;
    if (!selectedProgram) {
      alert("Please select a program.");
      return;
    }
    try {
      await addCourse(
        {
          code: Number(data.code),
          name: String(data.nameEn),
          name_th: String(data.nameTh),
          program_id: Number(selectedProgram),
          section: Number(data.year),
        },
        token
      );
      alert("Course added successfully!");
      fetchCourses(1);
    } catch (err: any) {
      alert("Error: " + (err.message || err));
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
    { header: t("section"), accessor: "section" },
    // {
    //   header: t("program"),
    //   accessor: "program_id",
    //   render: (value) => programIdToShortName(value),
    // },
  ];

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
            abbrEn: "Course abbreviation (EN)",
            abbrTh: "Course abbreviation (TH)",
            year: "Section",
          }}
          submitButtonText={{
            insert: "Insert Course",
            upload: "Upload Course (Excel)",
          }}
          showAbbreviationInputs={false}
          programOptions={programOptions}
          universityOptions={universityOptions}
          facultyOptions={facultyOptions}
          selectedProgram={selectedProgram}
          selectedFaculty={selectedFaculty}
          selectedUniversity={selectedUniversity}
          onProgramChange={(e) => setSelectedProgram(e.target.value)}
          onFacultyChange={(e) => setSelectedFaculty(e.target.value)}
          onUniversityChange={(e) => setSelectedUniversity(e.target.value)}
          onSubmit={handleAddCourse}
          onSubmitExcel={handleAddCourseExcel}
        />
      </div>

      <hr className="my-3" />

      {loading ? (
        <div>{t("loading")}</div>
      ) : (
        <>
          <Table<Course> columns={courseColumns} data={courses} />
          <PaginationControlButton
            page={page}
            totalPages={totalPages} // ✅ FIXED
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
