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
export async function uploadCoursesExcel(
  rows: ExcelCourseRow[],
  token: string,
  programId: string | number
) {
  // Fetch all existing courses for the selected program
  const res = await apiClient(`/api/course/paginate?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const existingCourses: Course[] = (await res.json()).data;
  const existingCodes = new Set(
    existingCourses
      .filter((c) => String(c.program_id) === String(programId))
      .map((c) => String(c.code))
  );

  const results = [];
  for (const row of rows) {
    // Try to robustly extract the course code
    let code = "";
    for (const key of ["Course Id", "course_id", "รหัสหลักสูตร"]) {
      if (
        row[key] !== undefined &&
        row[key] !== null &&
        String(row[key]).trim() !== ""
      ) {
        code = String(row[key]).trim();
        break;
      }
    }

    console.log("Excel row:", row, "Extracted code:", code);

    if (!code) {
      results.push({
        code: "",
        status: "error",
        error: "No course code found in row",
      });
      continue;
    }

    if (existingCodes.has(code)) {
      results.push({ code, status: "duplicate" });
      continue;
    }

    try {
      const payload = {
        code: Number(code),
        name: String(
          row["Course Name (EN)"] ||
            row["course_engname"] ||
            row["ชื่อหลักสูตร (EN)"] ||
            ""
        ).trim(),
        name_th: String(
          row["Course Name (TH)"] ||
            row["course_name"] ||
            row["ชื่อหลักสูตร (TH)"] ||
            ""
        ).trim(),
        program_id: Number(programId),

        // ✅ Default section = 1
        section: 1,
      };

      const addRes = await apiClient("/api/course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (addRes.ok) {
        results.push({ code, status: "added" });
        existingCodes.add(code); // Prevent double add in same batch
      } else {
        const errorText = await addRes.text();
        console.error("Failed to add course via Excel:", {
          code,
          payload,
          errorText,
        });
        results.push({ code, status: "error", error: errorText });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({ code, status: "error", error: errorMsg });
    }
  }

  return results;
}

export async function getCourses(token: string, page = 1, limit = 10) {
  const res = await apiClient(
    `/api/course/paginate?page=${page}&limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addCourse(
  data: {
    code: number;
    name: string;
    name_th: string;
    program_id: number;
    section: number;
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
