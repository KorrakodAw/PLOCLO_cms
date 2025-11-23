"use client";

import { useEffect, useState, useMemo } from "react";
import { useToast } from "../../components/Toast";
import { useAuth } from "../context/AuthContext";
import {
  getUniversities,
  createUniversity,
  University,
} from "../../utils/universityApi";
import { getFaculties, createFaculty, Faculty } from "../../utils/facultyApi";

export default function ManageUniversityPage() {
  const { token, isLoggedIn } = useAuth();

  const [universities, setUniversities] = useState<University[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);

  // University form
  const [uniName, setUniName] = useState("");
  const [uniAbbr, setUniAbbr] = useState("");
  const [uniNameTh, setUniNameTh] = useState("");
  const [uniAbbrTh, setUniAbbrTh] = useState("");

  // Faculty form
  const [facultyName, setFacultyName] = useState("");
  const [facultyUniversityId, setFacultyUniversityId] = useState("");
  const [facultyNameTh, setFacultyNameTh] = useState("");
  const [facultyAbbr, setFacultyAbbr] = useState("");
  const [facultyAbbrTh, setFacultyAbbrTh] = useState("");
  const { showToast, ToastElement } = useToast();

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    getUniversities(token)
      .then((data) => setUniversities(data))
      .catch((e: unknown) => console.error("getUniversities", e));
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    getFaculties(token)
      .then((data) => setFaculties(data))
      .catch((e: unknown) => console.error("getFaculties", e));
  }, [isLoggedIn, token]);

  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await createUniversity(token, {
        name: uniName,
        name_th: uniNameTh || undefined,
        abbreviation: uniAbbr || undefined,
        abbreviation_th: uniAbbrTh || undefined,
      });
      const data = await getUniversities(token);
      setUniversities(data);
      setUniName("");
      setUniAbbr("");
      setUniNameTh("");
      setUniAbbrTh("");
      showToast("University created successfully!", "success");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || "Failed to create university", "error");
    }
  };

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!facultyUniversityId)
      return alert("Please select a university for the faculty");
    try {
      await createFaculty(token, {
        name: facultyName,
        name_th: facultyNameTh || undefined,
        university_id: Number(facultyUniversityId),
        abbreviation: facultyAbbr || undefined,
        abbreviation_th: facultyAbbrTh || undefined,
      });
      const data = await getFaculties(token);
      setFaculties(data);
      setFacultyName("");
      setFacultyNameTh("");
      setFacultyAbbr("");
      setFacultyAbbrTh("");
      setFacultyUniversityId("");
      showToast("Faculty created successfully!", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || "Failed to create faculty", "error");
    }
  };

  const universityMap = useMemo(() => {
    return Object.fromEntries(universities.map((u) => [u.id, u.name]));
  }, [universities]);

  const facultiesWithNames = useMemo(() => {
    return faculties.map((f) => ({
      ...f,
      university_name:
        f.university_id != null ? universityMap[f.university_id] : undefined,
    }));
  }, [faculties, universityMap]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Manage Universities & Faculties
      </h1>

      {/* Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* University Form */}
        <section className="bg-white shadow-md rounded-xl p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            🏛️ Create University
          </h2>
          <form onSubmit={handleCreateUniversity} className="space-y-4">
            <Input
              label="University Name (EN)"
              value={uniName}
              onChange={setUniName}
              required
            />
            <Input
              label="University Name (TH)"
              value={uniNameTh}
              onChange={setUniNameTh}
              required
            />
            <Input
              label="Abbreviation (EN)"
              value={uniAbbr}
              onChange={setUniAbbr}
            />
            <Input
              label="Abbreviation (TH)"
              value={uniAbbrTh}
              onChange={setUniAbbrTh}
            />

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors"
            >
              + Create University
            </button>
          </form>
        </section>

        {/* Faculty Form */}
        <section className="bg-white shadow-md rounded-xl p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            🎓 Create Faculty
          </h2>
          <form onSubmit={handleCreateFaculty} className="space-y-4">
            <div>
              <select
                className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-400 outline-none"
                value={facultyUniversityId}
                onChange={(e) => setFacultyUniversityId(e.target.value)}
                required
              >
                <option value="">Select university</option>
                {universities.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Faculty Name (EN)"
              value={facultyName}
              onChange={setFacultyName}
              required
            />
            <Input
              label="Faculty Name (TH)"
              value={facultyNameTh}
              onChange={setFacultyNameTh}
              required
            />
            <Input
              label="Abbreviation (EN)"
              value={facultyAbbr}
              onChange={setFacultyAbbr}
            />
            <Input
              label="Abbreviation (TH)"
              value={facultyAbbrTh}
              onChange={setFacultyAbbrTh}
            />

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-medium transition-colors"
            >
              + Create Faculty
            </button>
          </form>
        </section>
      </div>

      {/* Lists */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <ListSection
          title="Universities"
          items={universities}
          type="university"
        />
        <ListSection
          title="Faculties"
          items={facultiesWithNames}
          type="faculty"
        />
      </div>

      <ToastElement />
    </div>
  );
}

/* --- Reusable Components --- */
function Input({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <input
        className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-400 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

interface itemsProps {
  id: number;
  name: string;
  name_th?: string;
  abbreviation?: string;
  abbreviation_th?: string;
  university_id?: number;
  university_name?: string;
}

function ListSection({
  title,
  items,
  type,
}: {
  title: string;
  items: itemsProps[];
  type: "university" | "faculty";
}) {
  return (
    <section className="bg-white shadow-md rounded-xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">{title}</h3>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">No {title.toLowerCase()} yet.</p>
      ) : (
        <ul className="space-y-2 text-gray-700">
          {items.map((item) => (
            <li
              key={item.id}
              className="bg-gray-50 hover:bg-gray-100 rounded-md px-3 py-2 border border-gray-200 text-sm"
            >
              {type === "university" ? (
                <>
                  <span className="font-medium">{item.name}</span>{" "}
                  {item.abbreviation && `(${item.abbreviation})`}{" "}
                  {item.name_th && `— ${item.name_th}`}{" "}
                  {item.abbreviation_th && `(${item.abbreviation_th})`}
                </>
              ) : (
                <>
                  <span className="font-medium">{item.name}</span>{" "}
                  {item.abbreviation && `(${item.abbreviation})`}{" "}
                  {item.name_th && `— ${item.name_th}`}{" "}
                  {item.abbreviation_th && `(${item.abbreviation_th})`}{" "}
                  <span className="text-gray-500">
                    ({item.university_name ?? item.university_id ?? "—"})
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
