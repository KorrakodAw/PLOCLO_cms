/* eslint-disable @typescript-eslint/no-explicit-any */
import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Table, Column } from "../../components/Table";
import { useEffect, useState } from "react";
import { addPlo, getPlosPaginated } from "../../utils/ploApi";
import PaginationControlButton from "../../components/PaignateControlButton";
import { getUniversities } from "../../utils/universityApi";
import { getFaculties } from "../../utils/facultyApi";
import { getPrograms } from "../../utils/programApi";
import { useToast } from "../../components/Toast";

interface AddPloProps {
  universityId?: string;
  facultyId?: string;
  programId?: string;
  year?: string;
}

interface Plo {
  id: number;
  name: string;
  engname: string;
  code: string;
  program_shortname_en: string;
  program_shortname_th: string;
  program_year: number;
  program_id: number;
  year: number;
}

export default function AddPlo({
  universityId,
  facultyId,
  programId,
  year,
}: AddPloProps) {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn, initialized } = useAuth();

  const [plos, setPlos] = useState<Plo[]>([]);
  const [, setLoadingPlos] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

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

  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const { showToast, ToastElement } = useToast();

  // Sync internal state with parent props for AddButton

  // useEffect(() => {
  //   if (universityId) setSelectedUniversity(universityId);
  //   if (facultyId) setSelectedFaculty(facultyId);
  //   if (programId) setSelectedProgram(programId);
  //   if (year) setSelectedYear(String(year));
  // }, [universityId, facultyId, programId, year]);

  // Fetch universities for dropdown
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    getUniversities(token)
      .then((data) => {
        setUniversityOptions([
          { label: t("please select a university"), value: "" },
          ...data.map((u: any) => ({ label: u.name, value: String(u.id) })),
        ]);
      })
      .catch((err) => console.error(err));
  }, [isLoggedIn, token, t, universityId]);

  // Fetch faculties when university changes
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedUniversity) {
      setFacultyOptions([{ label: t("please select a faculty"), value: "" }]);
      setPage(1);
      return;
    }

    // Fetch faculties for the selected university
    getFaculties(token, selectedUniversity)
      .then((data) => {
        setFacultyOptions([
          { label: t("please select a faculty"), value: "" },
          ...data
            .filter((f: any) => String(f.university_id) === selectedUniversity)
            .map((f: any) => ({ label: f.name, value: String(f.id) })),
        ]);
      })
      .catch((err) => showToast("API faculty error: " + err.message, "error"));
  }, [isLoggedIn, token, selectedUniversity, t, showToast]);

  // Fetch years and programs when faculty or year changes
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
          showToast("API program error: " + err.message, "error");
        } else {
          showToast("API program error: unknown error", "error");
        }
      });
  }, [isLoggedIn, token, selectedFaculty, selectedYear, t, showToast]);

  // ฟังก์ชันสำหรับเพิ่ม PLO จาก Excel
  const handleAddPloExcel = async (rows: any[]) => {
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
    if (!selectedProgram) {
      showToast("Please select the program from the filters above", "error");
      return;
    }
    let successCount = 0;
    let failCount = 0;
    const errorDetails = [];
    // Process each row from Excel
    for (const [i, row] of rows.entries()) {
      const missingFields = [];
      // Accept both camelCase, snake_case, and Excel header keys for import
      const code = row.code || row.Code || row.PLO_code;
      const nameTh = row.nameTh || row.name || row["ชื่อไทย"] || row.PLO_name;
      const nameEn =
        row.nameEn || row.engname || row["ชื่ออังกฤษ"] || row.PLO_engname;
      if (!code) missingFields.push("code");
      if (!nameTh) missingFields.push("nameTh");
      if (!nameEn) missingFields.push("nameEn");
      if (missingFields.length > 0) {
        failCount++;
        errorDetails.push(`Row ${i + 1}: missing ${missingFields.join(", ")}`);
        continue;
      }
      const payload = {
        code: String(code),
        name: String(nameTh),
        engname: String(nameEn),
        program_id: selectedProgram,
      };

      try {
        await addPlo(payload, token);
        successCount++;
      } catch (err: any) {
        failCount++;
        let backendMsg = err?.message || "Unknown error";
        if (err?.response) {
          try {
            const details = await err.response.text();
            backendMsg += ` | Details: ${details}`;
          } catch {}
        }
        errorDetails.push(`Row ${i + 1}: backend error - ${backendMsg}`);
        showToast(`Error adding PLO from row ${i + 1}: ${backendMsg}`, "error");
      }
    }
    let summary = `เพิ่มข้อมูลจาก Excel สำเร็จ: ${successCount} รายการ\nล้มเหลว: ${failCount} รายการ`;
    if (errorDetails.length > 0) {
      summary += `\n\nรายละเอียดข้อผิดพลาด:\n` + errorDetails.join("\n");
    }
    showToast(summary, failCount > 0 ? "error" : "success");
    // รีเฟรชรายการ PLO หลังเพิ่ม
    try {
      setPage(1);
      window.location.reload();
    } catch {
      showToast("Failed to refresh PLO list after Excel upload.", "error");
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    setLoadingPlos(true);
    const filters: Record<string, string | undefined> = {};

    if (universityId) filters.universityId = universityId;
    if (facultyId) filters.facultyId = facultyId;
    if (programId) filters.programId = programId;
    if (year) filters.year = year;

    getPlosPaginated(token, page, 10, filters)
      .then((res) => {
        const data = Array.isArray(res) ? res : res.data || [];
        const total = res.total || data.length || 1;
        setPlos(data);
        setTotalPages(Math.ceil(total / limit));
      })
      .catch((err) => {
        showToast("API program error: " + err.message, "error");
      })
      .finally(() => setLoadingPlos(false));
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

  // ฟังก์ชันสำหรับเพิ่ม PLO
  const handleAddPlo = async (data: Record<string, unknown>) => {
    if (!initialized) return; // wait for auth context to load
    if (!isLoggedIn || !token) {
      showToast(
        "You are logged out or token expired. Please log in again.",
        "error"
      );
      return;
    }
    if (!selectedUniversity) {
      showToast("Please select the university from the filters above", "error");
      return;
    }
    if (!selectedFaculty) {
      showToast("Please select the faculty from the filters above", "error");
      return;
    }
    if (!selectedYear) {
      showToast("Please select the year from the filters above", "error");
      return;
    }
    if (!selectedProgram) {
      showToast("Please select the program from the filters above", "error");
      return;
    }

    if (!data.code || !data.nameTh || !data.nameEn) {
      showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
      return;
    }

    try {
      await addPlo(
        {
          code: String(data.code),
          name: String(data.nameTh), // Thai name
          engname: String(data.nameEn), // English name
          program_id: selectedProgram, // Use the modal-selected program
        },
        token
      );
      showToast(t("PLO added successfully!"), "success");
      setPage(1);
      window.location.reload();
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast("Error: " + err.message, "error");
      } else {
        showToast("Unexpected error occurred while adding PLO.", "error");
      }
    }
  };

  const ploColumns: Column<Plo>[] = [
    { header: t("code"), accessor: "code" },
    lang === "en"
      ? { header: "Description", accessor: "engname" }
      : { header: "รายละเอียด", accessor: "name" },
    lang === "en"
      ? {
          header: "Program",
          accessor: "program_shortname_en",
          render: (v) => v || "-",
        }
      : {
          header: "ชื่อโปรแกรม",
          accessor: "program_shortname_th",
          render: (v) => v || "-",
        },
    {
      header: t("year"),
      accessor: "program_year",
      render: (value) => (lang === "en" ? Number(value) - 543 : value),
    },
  ];

  return (
    <div className="mt-5 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{t("plo management")}</h1>
        <AddButton
          buttonText={t("create new plo")}
          placeholderText={{
            code: "PLO Code",
            nameEn: "PLO Name (EN)",
            nameTh: "PLO Name (TH)",
          }}
          showAbbreviationInputs={false}
          submitButtonText={{
            insert: "Insert PLO",
          }}
          onSubmit={handleAddPlo}
          onSubmitExcel={handleAddPloExcel}
          facultyOptions={facultyOptions}
          universityOptions={universityOptions}
          programOptions={programOptions}
          yearOptions={yearOptions}
          selectedFaculty={selectedFaculty}
          selectedUniversity={selectedUniversity}
          selectedProgram={selectedProgram}
          selectedYear={selectedYear}
          onFacultyChange={(e) => setSelectedFaculty(e.target.value)}
          onUniversityChange={(e) => setSelectedUniversity(e.target.value)}
          onProgramChange={(e) => {
            setSelectedProgram(e.target.value);
          }}
          onYearChange={(e) => {
            const selectedYear = e.target.value;
            setSelectedYear(selectedYear);
          }}
        />
      </div>

      <hr className="my-3" />
      {/* Pagination Controls */}

      <div className="mt-4">
        <Table<any> columns={ploColumns} data={plos} />

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
