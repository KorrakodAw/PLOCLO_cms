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

  const { token } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

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

    apiClient
      .get("/university", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const universityOptions = res.data.map((uni: University) => ({
          label: lang === "th" ? uni.name_th || uni.name : uni.name,
          value: String(uni.id),
        }));
        setOptions((prev) => ({ ...prev, university: universityOptions }));
      })
      .catch((err) => {
        showToast("Error fetching university", "error");
      });
  }, [token, lang]);

  useEffect(() => {
    const fetchFaculties = async () => {
      if (!selections.university || !token) return;
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

  useEffect(() => {
    console.log(selections.years);
  });

  return (
    <ProtectedRoute roles={["system_admin", "Super_admin"]}>
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
            disabled={!selections.university}
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
            disabled={!selections.faculty}
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
            disabled={!selections.faculty}
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
