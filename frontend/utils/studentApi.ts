import { apiClient } from "../utils/apiClient";

export interface StudentInput {
  student_id: string;
  program_id: number | string;
  first_name: string;
  last_name: string;
  email: string;
  year_of_admission: number;
}

/**
 * ✅ Get paginated students
 * Matches backend route: GET /api/student/paginate
 */
export async function getStudentsPaginated(
  token: string,
  page = 1,
  limit = 10
) {
  const res = await apiClient(
    `/api/student/paginate?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch students: ${errText}`);
  }

  return res.json();
}

/**
 * ✅ Add a single student
 * Matches backend route: POST /api/student
 */
export async function addStudent(data: StudentInput, token: string) {
  const res = await apiClient("/api/student", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    // Try to read error JSON safely
    try {
      const err = await res.json();
      throw new Error(err.error || "Failed to add student");
    } catch {
      throw new Error("Failed to add student (invalid response)");
    }
  }

  return res.json();
}

/**
 * ✅ Bulk upload students
 * Matches backend route: POST /api/student/bulk
 */
export async function bulkUploadStudents(rows: StudentInput[], token: string) {
  const res = await apiClient("/api/student/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    try {
      const err = await res.json();
      throw new Error(err.error || "Failed to bulk upload students");
    } catch {
      throw new Error("Failed to bulk upload students (invalid response)");
    }
  }

  return res.json();
}
