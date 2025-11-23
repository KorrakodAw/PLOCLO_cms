// Import Course type for type safety
import { apiClient } from "./apiClient";
// Local Course type for Excel upload and API
export interface Course {
  id: number;
  code: number;
  name: string;
  name_th: string;
  program_id: number;
}
// Upload multiple courses from Excel, only add if not duplicate
export interface ExcelCourseRow {
  [key: string]: string | number | undefined;
}

export async function getCoursePaginate(
  token: string,
  page = 1,
  limit = 10,
  filters?: {
    universityId?: string;
    facultyId?: string;
    programId?: string;
    year?: string;
    semester?: string;
    section?: string;
  }
) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(filters?.universityId ? { universityId: filters.universityId } : {}),
    ...(filters?.facultyId ? { facultyId: filters.facultyId } : {}),
    ...(filters?.programId ? { programId: filters.programId } : {}),
    ...(filters?.year ? { year: filters.year } : {}),
    ...(filters?.semester ? { semester: filters.semester } : {}),
    ...(filters?.section ? { section: filters.section } : {}),
  });
  const res = await apiClient(`/api/course/paginate?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch paginated Course");
  }
  return await res.json();
}

export async function getCourses(token: string, programId?: string) {
  let query = "";
  if (programId) query = `?programId=${programId}`;

  const res = await apiClient(`/api/course${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addCourse(
  data: {
    code: string;
    name: string;
    name_th: string;
    program_id: string;
    section: string;
    semester: string;
  },
  token: string
) {
  const res = await apiClient("/api/course", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (res.status === 409) {
    const err = await res.json();
    throw new Error(err.error || "Duplicate course code in this program");
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteCourse(id: number, token: string) {
  const res = await apiClient(`/api/course/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
