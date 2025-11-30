import { apiClient } from "../utils/apiClient";

export interface StudentInput {
  student_id: string;
  program_id: number | string;
  first_name: string;
  last_name: string;
}


/**
 * ✅ Get paginated students
 * Matches backend route: GET /api/student/paginate
 */
export async function getStudentsPaginated(
  token: string,
  page = 1,
  limit = 10,
  filters?: {
    universityId?: string;
    facultyId?: string;
    programId?: string;
    year?: string;
  }
) {
  const res = await apiClient.get("/student/paginate", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      page,
      limit,
      ...filters,
    },
  });
  return res.data;
}

/**
 * ✅ Add a single student
 * Matches backend route: POST /api/student
 */
export async function addStudent(data: StudentInput, token: string) {
  const res = await apiClient.post("/student", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * ✅ Bulk upload students
 * Matches backend route: POST /api/student/bulk
 */
export async function bulkUploadStudents(rows: StudentInput[], token: string) {
  const res = await apiClient.post("/student/bulk", rows, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
