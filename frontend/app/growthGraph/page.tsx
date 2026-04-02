"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useState, useEffect } from "react";
import { apiClient } from "@/utils/apiClient";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "next-i18next";
import { University } from "@/utils/universityApi";
import { Faculty } from "@/utils/facultyApi";
import { Program } from "@/utils/programApi";
import DropdownSelect from "@/components/DropdownSelect";
import ShowGraphStudent from "./showGraphStudent";

export default function GrowthGraphPage() {
  interface Option {
    value: string;
    label: string;
  }

  const [options, setOptions] = useState({
    university: [] as Option[],
    faculty: [] as Option[],
    program: [] as Option[],
    years: [] as Option[],
  });

  const [selections, setSelections] = useState({
    university: "",
    faculty: "",
    program: "",
    years: "",
  });

  const { token, user } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  const isInstructor = user?.role === "instructor";
  const isStudent = user?.role === "student";

  const updateSelections = (updates: Partial<typeof selections>) => {
    setSelections((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    const saved = localStorage.getItem("edit_fix_filters");
    if (saved && token) {
      try {
        const parsed = JSON.parse(saved);
        setSelections(parsed);
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }
  }, [token]);

  useEffect(() => {
    if (selections.university || selections.faculty || selections.program) {
      localStorage.setItem("edit_fix_filters", JSON.stringify(selections));
    }
  });

  useEffect(() => {
    if (!token) return;

    const initializeData = async () => {
      try {
        const uniRes = await apiClient.get("/university", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const uniOptions = uniRes.data.map((uni: University) => ({
          label: lang === "th" ? uni.name_th || uni.name : uni.name,
          value: String(uni.id),
        }));

        if (isInstructor) {
          const insRes = await apiClient.get(
            `/instructor/email/${user.email}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          const facultyId = insRes.data?.faculty_id;

          const facRes = await apiClient.get(`/faculty/${facultyId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const facultyData = facRes.data;

          const allFacsRes = await apiClient.get("/faculty", {
            headers: { Authorization: `Bearer ${token}` },
            params: { university_id: facultyData.university_id },
          });

          const formattedFacs = allFacsRes.data.map((f: Faculty) => ({
            label: lang === "th" ? f.name_th || f.name : f.name,
            value: String(f.id),
          }));

          setOptions((prev) => ({
            ...prev,
            university: uniOptions,
            faculty: formattedFacs,
          }));

          updateSelections({
            university: String(facultyData.university_id),
            faculty: String(facultyData.id),
          });
        } else if (isStudent) {
          const stdRes = await apiClient.get(`/student/email/${user.email}`, {
            headers: { Authorization: `Beareer ${token}` },
          });
          const studentData = stdRes.data;

          const studentProgramRes = await apiClient.get(
            `/program/${studentData.program_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          const studentProgramData = studentProgramRes.data;
          const targetYear = studentProgramData.program_year;

          const facRes = await apiClient.get(
            `/faculty/${studentProgramData.faculty_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          const facultyData = facRes.data;

          const yearRes = await apiClient.get(`/program/ByCodeForViewChart`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { programCode: studentProgramData.program_code },
          });

          const yearOptions = yearRes.data.map(
            (item: { program_year: number; id: number }) => ({
              label: item.program_year.toString(),
              value: String(item.id),
            }),
          );

          setOptions((prev) => ({
            ...prev,
            university: uniOptions,
            faculty: [
              {
                label:
                  lang === "th"
                    ? facultyData.name_th || facultyData.name
                    : facultyData.name,
                value: String(facultyData.id),
              },
            ],
            program: [
              {
                label:
                  lang === "th"
                    ? studentProgramData.program_shortname_th ||
                      studentProgramData.program_shortname_en
                    : studentProgramData.program_shortname_en,
                value: String(studentProgramData.program_code),
              },
            ],
            years: yearOptions,
          }));

          updateSelections({
            university: String(facultyData.university_id),
            faculty: String(facultyData.id),
            program: String(studentProgramData.program_code),
            years:
              yearOptions.find((y) => y.label === targetYear.toString())
                ?.value || "",
          });
        } else {
          setOptions((prev) => ({
            ...prev,
            university: selections.university ? prev.university : uniOptions,
          }));
        }
      } catch (error) {
        console.error(error);
        showToast("Error fetching universities", "error");
      }
    };

    initializeData();
  }, [token, lang, isInstructor]);

  useEffect(() => {
    if (!selections.university || !token || isInstructor) return;
    const fetchFaculties = async () => {
      try {
        const res = await apiClient.get("/faculty", {
          headers: { Authorization: `Bearer ${token}` },
          params: { university_id: selections.university },
        });
        const options = res.data.map((f: Faculty) => ({
          label: lang === "th" ? f.name_th || f.name : f.name,
          value: String(f.id),
        }));
        setOptions((prev) => ({ ...prev, faculty: options }));
      } catch {
        showToast("Error fetching faculty", "error");
      }
    };

    fetchFaculties();
  }, [selections.university, token, lang]);

  useEffect(() => {
    const fetchPrograms = async () => {
      if (!selections.faculty || !token) return;
      try {
        const res = await apiClient.get(
          `/program/ByFaculty/${selections.faculty}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const options = res.data.map((p: Program) => ({
          label:
            lang === "th"
              ? p.program_shortname_th || p.program_shortname_en
              : p.program_shortname_en,
          value: p.program_code,
        }));
        setOptions((prev) => ({ ...prev, program: options }));
      } catch {
        showToast("Error fetching program", "error");
      }
    };

    fetchPrograms();
  }, [selections.faculty, token, lang]);

  useEffect(() => {
    const fetchYears = async () => {
      if (!selections.program || !token) return;
      try {
        const res = await apiClient.get(`/program/ByCodeForViewChart`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { programCode: selections.program },
        });
        const options = res.data.map(
          (item: { program_year: number; id: number }) => ({
            label: item.program_year.toString(),
            // value: JSON.stringify({ id: item.id, year: item.program_year }),
            value: String(item.id), // 🟢 เปลี่ยนเป็น String ธรรมดา
          }),
        );
        setOptions((prev) => ({ ...prev, years: options }));
      } catch {
        showToast("Error fetching years", "error");
      }
    };

    fetchYears();
  }, [selections.program, token]);

  return (
    <ProtectedRoute
      roles={[
        "system_admin",
        "Super_admin",
        "instructor",
        "curriculum_admin",
        "student",
      ]}
    >
      {/* 🟢 กำหนดความกว้างสูงสุดที่นี่ที่เดียว และใช้ mx-auto เพื่อจัดกึ่งกลางหน้าจอ */}
      <div className="max-w-[1500px] mx-auto mt-8 px-4 space-y-8">
        {/* 🟢 Dropdown Container: ปรับ max-w-none และเอา items-center ออก */}
        <div
          className="bg-white/50 backdrop-blur-sm p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm 
                 grid grid-cols-2 md:grid-cols-4 min-[1500px]:grid-cols-4 gap-6 w-full"
        >
          <DropdownSelect
            label="University"
            options={options.university}
            value={selections.university}
            onChange={(val) =>
              updateSelections({
                university: String(val),
                faculty: "",
                program: "",
                years: "",
              })
            }
            disabled={isInstructor || isStudent}
          />
          <DropdownSelect
            label="Faculty"
            options={options.faculty}
            value={selections.faculty}
            onChange={(val) =>
              updateSelections({
                faculty: String(val),
                program: "",
                years: "",
              })
            }
            disabled={!selections.university || isInstructor || isStudent}
          />
          <DropdownSelect
            label="Program"
            options={options.program}
            value={selections.program}
            onChange={(val) =>
              updateSelections({
                program: String(val),
                years: "",
              })
            }
            disabled={!selections.faculty || isStudent}
          />
          <DropdownSelect
            label="Year"
            options={options.years}
            value={selections.years}
            onChange={(val) =>
              updateSelections({
                years: String(val),
              })
            }
            disabled={!selections.faculty || isStudent}
          />
        </div>

        {/* 🟢 Graph & Table Container: ใช้ w-full เพื่อให้กว้างเท่ากับ Dropdown ด้านบน */}
        <div className="w-full">
          <ShowGraphStudent programId={selections.years} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
