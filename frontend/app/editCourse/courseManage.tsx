import AddButton from "../../components/AddButton";
import { Table, Column } from "../../components/Table";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
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
}

interface Course {
  id: number;
  code: number;
  name: string;
  name_th: string;
  program_id: number;
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

  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  // Fetch program options for dropdown
  const fetchPrograms = async () => {
    if (!token) return;
    try {
      const res = await getProgramsPaginated(token, 1, 100);
      setProgramOptions([
        { label: "กรุณาเลือกโปรแกรม", value: "" },
        ...res.data.map((p: any) => ({
          label: `${p.program_name_th || p.program_name_en} (${
            p.program_year
          })`,
          value: String(p.id),
        })),
      ]);
    } catch (err: any) {
      alert("Failed to fetch programs: " + (err.message || err));
    }
  };

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
      fetchCourses(1);
      fetchPrograms();
      setPage(1);
    }
    // eslint-disable-next-line
  }, [isLoggedIn, initialized, token]);

  // Refetch when page changes
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
        },
        token
      );
      alert("Course added successfully!");
      fetchCourses(1);
    } catch (err: any) {
      alert("Error: " + (err.message || err));
    }
  };

  const courseColumns: Column<Course>[] = [
    { header: t("course id"), accessor: "code" },
    lang === "en"
      ? { header: "Name", accessor: "name" }
      : { header: "ชื่อหลักสูตร", accessor: "name_th" },

    { header: t("program id"), accessor: "program_id" },
  ];

  return (
    <div className="mt-5">
      <div className=" flex justify-between">
        <h1 className="text-2xl font-extralight">{t("course management")}</h1>
        <AddButton
          buttonText={t("create new course")}
          placeholderText={{
            code: "Course Id",
            nameEn: "Course Name (EN)",
            nameTh: "Course Name (TH)",
            abbrEn: "Course abbreviation (EN)",
            abbrTh: "Course abbreviation (TH)",
            year: "Year",
          }}
          submitButtonText={{
            insert: "Insert Course",
            upload: "Upload Course (Excel)",
          }}
          showAbbreviationInputs={false}
          showYearInput={false}
          programOptions={programOptions}
          selectedProgram={selectedProgram}
          onProgramChange={(e) => setSelectedProgram(e.target.value)}
          onSubmit={handleAddCourse}
          onSubmitExcel={async (data: unknown[]) => {
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
              const added = results.filter(
                (r: any) => r.status === "added"
              ).length;
              const duplicate = results.filter(
                (r: any) => r.status === "duplicate"
              ).length;
              const error = results.filter(
                (r: any) => r.status === "error"
              ).length;
              let msg = `${t("Upload summary")}\n`;
              msg += `${t("Added")}: ${added}\n`;
              msg += `${t("Duplicate")}: ${duplicate}\n`;
              msg += `${t("Error")}: ${error}`;
              alert(msg);
              fetchCourses(1);
            } catch (err: any) {
              alert(t("Error uploading courses") + ": " + (err.message || err));
            }
          }}
        />
      </div>
      <hr className="my-3" />
      <p className="text-xl font-extralight">{t("course")}</p>
      {/* Table */}
      {loading ? (
        <div>{t("loading")}</div>
      ) : (
        <>
          <Table<Course> columns={courseColumns} data={courses} />
          {/* Pagination Controls */}
          <div className="flex justify-center items-center gap-4 mt-4">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {t("previous")}
            </button>
            <span>
              {t("page")} {page} / {Math.ceil(total / limit) || 1}
            </span>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() =>
                setPage((p) => (p < Math.ceil(total / limit) ? p + 1 : p))
              }
              disabled={page >= Math.ceil(total / limit)}
            >
              {t("next")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
