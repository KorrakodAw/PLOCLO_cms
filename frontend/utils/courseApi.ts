// Import Course type for type safety

import { apiClient } from "./apiClient";
// Local Course type for Excel upload and API
export interface Course {
  id: string;
  code: string;
  name: string;
  name_th: string;
  program_id: string;
  year: number;
  semester: number;
  section: string;
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
    courseCode?: string;
  }
) {
  const res = await apiClient.get("/course/paginate", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      page,
      limit,
      ...filters,
    },
  });
  return res.data;
}

export async function getCourses(token: string, programId?: string) {
  const res = await apiClient.get("/course", {
    headers: { Authorization: `Bearer ${token}` },
    params: programId ? { programId: programId } : {},
  });
  return res.data;
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
  const res = await apiClient.post("/course", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function deleteCourse(id: number, token: string) {
  const res = await apiClient.delete(`/course/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
