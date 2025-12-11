/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import { useToast } from "../../components/Toast";
import DropdownSelect from "../../components/DropdownSelect";
import { University, getUniversities } from "../../utils/universityApi";
import { getFaculties, Faculty } from "../../utils/facultyApi";
import { getPrograms, Program } from "../../utils/programApi";
import { getCourses } from "../../utils/courseApi";
import { useTranslation } from "next-i18next";

// --- Types ---
interface PLO {
  id: number;
  code: string;
  name_en: string;
  name_th: string;
}

interface CLO {
  id: number;
  code: string;
  name_en: string;
}

interface Option {
  label: string;
  value: string;
}

interface CourseVariant {
  id: string;
  code: string;
  name: string;
  program_id: string;
  year: number;
  semester: number;
  section: string;
}

export default function CloPloMapping() {
  const { token, isLoggedIn } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // --- SELECTION STATES ---
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedCourseCode, setSelectedCourseCode] = useState(""); // Stores "305100"
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // Stores the specific database ID (e.g., 145) determined by Code + Semester + Section
  const [specificCourseId, setSpecificCourseId] = useState<string>("");

  // --- OPTION STATES ---
  const [uniOptions, setUniOptions] = useState<Option[]>([]);
  const [facOptions, setFacOptions] = useState<Option[]>([]);
  const [progOptions, setProgOptions] = useState<Option[]>([]);
  const [yearOptions, setYearOptions] = useState<Option[]>([]);
  const [courseOptions, setCourseOptions] = useState<Option[]>([]);
  const [semesterOptions, setSemesterOptions] = useState<Option[]>([]);
  const [sectionOptions, setSectionOptions] = useState<Option[]>([]);

  // --- DATA STATES ---
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [courseVariants, setCourseVariants] = useState<CourseVariant[]>([]);

  const [plos, setPlos] = useState<PLO[]>([]);
  const [clos, setClos] = useState<CLO[]>([]);
  const [mappingGrid, setMappingGrid] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------------
  // 1. DROPDOWN LOADING LOGIC
  // --------------------------------------------------------

  // A. Load Universities
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    getUniversities(token)
      .then((data) => {
        setUniOptions([
          { label: t("please select a university"), value: "" },
          ...data.map((u: University) => ({
            label: u.name,
            value: String(u.id),
          })),
        ]);
      })
      .catch(() => showToast("API university error", "error"));
  }, [isLoggedIn, token, t, showToast]);

  // B. Load Faculties
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedUniversity) {
      setFacOptions([{ label: t("please select a faculty"), value: "" }]);
      setSelectedFaculty("");
      return;
    }
    getFaculties(token, selectedUniversity)
      .then((data) => {
        setFacOptions([
          { label: t("please select a faculty"), value: "" },
          ...data.map((f: Faculty) => ({ label: f.name, value: String(f.id) })),
        ]);
      })
      .catch(() => showToast("API faculty error", "error"));
  }, [isLoggedIn, token, selectedUniversity, t, showToast]);

  // C. Load Programs & Years (Optimized Fetch)
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedFaculty) {
      setAllPrograms([]);
      setYearOptions([{ label: t("please select a year"), value: "" }]);
      setProgOptions([{ label: t("please select a program"), value: "" }]);
      return;
    }
    getPrograms(token, selectedFaculty)
      .then((data) => {
        setAllPrograms(data);
        const years = Array.from(
          new Set(data.map((p: Program) => Number(p.program_year)))
        ).sort((a, b) => Number(b) - Number(a));
        setYearOptions([
          { label: t("please select a year"), value: "" },
          ...years.map((y) => ({
            label: lang === "en" ? String(Number(y) - 543) : String(y),
            value: String(y),
          })),
        ]);
      })
      .catch((err) => showToast("API program error: " + err.message, "error"));
  }, [isLoggedIn, token, selectedFaculty, t, lang, showToast]);

  // D. Filter Programs by Year
  useEffect(() => {
    if (!selectedYear || allPrograms.length === 0) {
      setProgOptions([{ label: t("please select a program"), value: "" }]);
      return;
    }
    const filtered = allPrograms.filter(
      (p) => String(p.program_year) === selectedYear
    );
    setProgOptions([
      { label: t("please select a program"), value: "" },
      ...filtered.map((p) => ({
        label: p.program_shortname_en,
        value: String(p.id),
      })),
    ]);
  }, [selectedYear, allPrograms, t]);

  // E. Load Courses (Unique Codes)
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedProgram) {
      setCourseOptions([{ label: t("please select a course"), value: "" }]);
      setSelectedCourseCode("");
      return;
    }
    getCourses(token, selectedProgram)
      .then((data: any) => {
        // Unique by code
        const unique = Array.from(
          new Map(data.map((c: any) => [c.code, c])).values()
        );
        setCourseOptions([
          { label: "please select a course", value: "" },
          ...unique.map((c: any) => ({
            label: `${c.code} - ${c.name}`,
            value: String(c.code),
          })),
        ]);
      })
      .catch(() => showToast("API course error", "error"));
  }, [isLoggedIn, token, selectedProgram, t, showToast]);

  // F. Load Variants (Semesters/Sections) based on Course Code
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedCourseCode) {
      setCourseVariants([]);
      setSemesterOptions([{ label: t("please select a semester"), value: "" }]);
      setSectionOptions([{ label: t("please select a section"), value: "" }]);
      return;
    }
    getCourses(token, selectedProgram).then((data: any) => {
      const variants = data.filter(
        (c: any) => String(c.code) === selectedCourseCode
      );
      setCourseVariants(variants);
    });
  }, [isLoggedIn, token, selectedCourseCode, selectedProgram]);

  // G. Filter Semesters
  useEffect(() => {
    if (courseVariants.length === 0) {
      setSemesterOptions([{ label: t("please select a semester"), value: "" }]);
      return;
    }
    const semesters = Array.from(
      new Set(courseVariants.map((c) => String(c.semester)))
    ).sort();
    setSemesterOptions([
      { label: t("please select a semester"), value: "" },
      ...semesters.map((s) => ({ label: "semester " + s, value: s })),
    ]);
  }, [courseVariants, t]);

  // H. Filter Sections
  useEffect(() => {
    if (!selectedSemester) {
      setSectionOptions([{ label: t("please select a section"), value: "" }]);
      return;
    }
    const sections = courseVariants
      .filter((c) => String(c.semester) === selectedSemester)
      .map((c) => String(c.section))
      .sort();
    setSectionOptions([
      { label: t("please select a section"), value: "" },
      ...sections.map((s) => ({ label: "section " + s, value: s })),
    ]);
  }, [selectedSemester, courseVariants, t]);

  // I. Determine Specific Course ID
  useEffect(() => {
    if (selectedSemester && selectedSection && courseVariants.length > 0) {
      const found = courseVariants.find(
        (c) =>
          String(c.semester) === selectedSemester &&
          String(c.section) === selectedSection
      );
      setSpecificCourseId(found ? found.id : "");
    } else {
      setSpecificCourseId("");
    }
  }, [selectedSemester, selectedSection, courseVariants]);

  // --------------------------------------------------------
  // 2. MATRIX DATA FETCHING
  // --------------------------------------------------------

  // A. Fetch PLOs (Triggered by Program selection) - KEEP THIS AS IS
  useEffect(() => {
    if (!selectedProgram || !token) {
      setPlos([]);
      return;
    }
    apiClient
      .get(`/plo?programId=${selectedProgram}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setPlos(res.data);
      })
      .catch((err) => {
        console.error(err);
        showToast("Failed to load PLOs", "error");
      });
  }, [selectedProgram, token, showToast]);

  // B. Fetch CLOs AND Existing Mappings (Triggered by Course ID) - UPDATE THIS
  useEffect(() => {
    if (!specificCourseId || !token || !selectedCourseCode) {
      setClos([]);
      setMappingGrid({}); // Reset grid
      return;
    }

    setLoading(true); // Start loading spinner if you have one

    // Fetch both endpoints in parallel
    Promise.all([
      // 1. Get CLOs
      apiClient.get(`/clo?courseId=${specificCourseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      // 2. Get Saved Weights
      apiClient.get(`/mapping/clo-plo/${specificCourseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([cloRes, mappingRes]) => {
        // 1. Set CLOs
        setClos(cloRes.data);

        // 2. Process Mappings into the Grid Dictionary
        // Backend returns array: [{ clo_id: 1, plo_id: 5, weight: 20 }, ...]
        // We convert to object: { "1_5": 20, ... }
        const newGrid: Record<string, number> = {};

        // Handle if mappingRes.data is the array directly
        const mappings = Array.isArray(mappingRes.data) ? mappingRes.data : [];

        mappings.forEach((m: any) => {
          newGrid[`${m.clo_id}_${m.plo_id}`] = m.weight;
        });

        setMappingGrid(newGrid);
        console.log("Loaded Mappings:", newGrid);
      })
      .catch((err) => {
        console.error("Error loading matrix:", err);
        showToast("Failed to load matrix data", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [specificCourseId, token, selectedCourseCode, showToast]);
  // --------------------------------------------------------
  // 3. HANDLERS
  // --------------------------------------------------------
  const handleWeightChange = (cloId: number, ploId: number, val: string) => {
    // Allow empty string (user deleting) or valid numbers only
    if (val !== "" && isNaN(Number(val))) return;

    setMappingGrid((prev) => ({
      ...prev,
      [`${cloId}_${ploId}`]: val === "" ? 0 : Number(val),
    }));
  };

  const handleSave = async () => {
    if (!token) return;

    const totalWeight = Object.values(mappingGrid).reduce(
      (sum, val) => sum + val,
      0
    );
    if (Math.abs(totalWeight - 100) > 0.01) {
      showToast(
        `Total weight is ${totalWeight}%. It must be exactly 100%.`,
        "error"
      );
      return; // STOP here, do not save.
    }
    // -----------------------------

    setLoading(true);

    // Prepare the payload
    const updates = Object.keys(mappingGrid).map((key) => {
      const [cloId, ploId] = key.split("_");
      return {
        clo_id: Number(cloId),
        plo_id: Number(ploId),
        weight: mappingGrid[key],
      };
    });

    try {
      await apiClient.post(
        "/mapping/clo-plo",
        { updates },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Mapping saved successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to save", "error");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------
  // 4. UI RENDER
  // --------------------------------------------------------
  return (
    <div className="mt-5 p-5">
      <div className="flex justify-between items-end mb-6">
        <h1 className="text-2xl font-extralight text-gray-800">
          CLO-PLO Mapping
        </h1>
      </div>

      {/* --- FILTERS --- */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DropdownSelect
            label="University"
            value={selectedUniversity}
            options={uniOptions}
            onChange={(e) => setSelectedUniversity(e.target.value)}
          />
          <DropdownSelect
            label="Faculty"
            value={selectedFaculty}
            options={facOptions}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            disabled={!selectedUniversity}
          />
          <DropdownSelect
            label="Year"
            value={selectedYear}
            options={yearOptions}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={!selectedFaculty}
          />
          <DropdownSelect
            label="Program"
            value={selectedProgram}
            options={progOptions}
            onChange={(e) => setSelectedProgram(e.target.value)}
            disabled={!selectedYear}
          />

          <DropdownSelect
            label="Course"
            value={selectedCourseCode}
            options={courseOptions}
            onChange={(e) => setSelectedCourseCode(e.target.value)}
            disabled={!selectedProgram}
          />
          <DropdownSelect
            label="Semester"
            value={selectedSemester}
            options={semesterOptions}
            onChange={(e) => setSelectedSemester(e.target.value)}
            disabled={!selectedCourseCode}
          />
          <DropdownSelect
            label="Section"
            value={selectedSection}
            options={sectionOptions}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedSemester}
          />
        </div>
      </div>

      {/* --- MATRIX TABLE --- */}
      <div className="bg-white p-4 shadow-md rounded-lg overflow-x-auto min-h-[300px] border border-gray-200 ">
        {!specificCourseId && (
          <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-400 font-medium">
              Please select a course section to view mapping
            </p>
          </div>
        )}
        <div className="flex flex-col">
          {specificCourseId && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2.5 max-w-[300px] rounded shadow hover:bg-green-700 transition disabled:opacity-50 font-medium mb-2.5"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          )}
          {specificCourseId && clos.length > 0 && plos.length > 0 && (
            <table className="w-full border-collapse border border-gray-300 text-sm">
              {/* HEADERS: PLOs as Columns */}
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-0 sticky left-0 bg-gray-100 z-20 w-32 min-w-[70px] h-14">
                    <div className="relative w-full h-full">
                      {/* 1. The Diagonal Line (SVG) */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {/* Draws a line from Top-Left to Bottom-Right */}
                        <line
                          x1="0"
                          y1="0"
                          x2="100%"
                          y2="100%"
                          stroke="#d1d5db"
                          strokeWidth="1"
                        />
                      </svg>

                      {/* 2. Top-Right Text (Column Name: PLO) */}
                      <div className="absolute top-2 right-3 text-xs font-bold text-gray-600">
                        PLO
                      </div>

                      {/* 3. Bottom-Left Text (Row Name: CLO) */}
                      <div className="absolute bottom-2 left-3 text-xs font-bold text-gray-600">
                        CLO
                      </div>
                    </div>
                  </th>

                  {plos.map((plo) => (
                    <th
                      key={plo.id}
                      className="border p-2 min-w-[80px] text-center bg-gray-50"
                      title={plo.name_en}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-800">
                          {plo.code}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* BODY: CLOs as Rows */}
              <tbody>
                {clos.map((clo) => (
                  <tr
                    key={clo.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="border p-3 font-bold sticky left-0 bg-white z-10 shadow-sm ">
                      {clo.code}
                    </td>

                    {plos.map((plo) => {
                      const weight = mappingGrid[`${clo.id}_${plo.id}`] || "";
                      const hasValue = Number(weight) > 0;
                      return (
                        <td
                          key={plo.id}
                          className={`border p-1 text-center ${
                            hasValue ? "bg-blue-50/30" : ""
                          }`}
                        >
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className={`w-full h-full text-center py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                              hasValue
                                ? "font-bold text-blue-700"
                                : "text-gray-400"
                            }`}
                            placeholder="-"
                            value={weight}
                            onChange={(e) =>
                              handleWeightChange(clo.id, plo.id, e.target.value)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Empty States */}
          {!loading && specificCourseId && clos.length === 0 && (
            <div className="text-center text-red-400 py-10 bg-red-50 rounded-lg">
              No CLOs found for this course section.
            </div>
          )}
          {!loading && specificCourseId && plos.length === 0 && (
            <div className="text-center text-red-400 py-10 bg-red-50 rounded-lg">
              No PLOs found for this program.
            </div>
          )}
        </div>
      </div>

      <ToastElement />
    </div>
  );
}
