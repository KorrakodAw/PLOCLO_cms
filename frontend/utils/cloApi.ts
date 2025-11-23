import { apiClient } from "./apiClient";

// 1. Updated Interface to include description
export interface CLO {
  id: string;
  code: string;
  name: string;
  name_th?: string;
  description?: string;
  course_id: string;
}

// 2. Updated Filters to include courseCode (since your dropdown uses code)
export interface CLOFilters {
  universityId?: string;
  facultyId?: string;
  programId?: string;
  year?: string;
  semester?: string;
  section?: string;
  courseId?: string;
  courseCode?: string; // Added this
}

export interface ExcelCLORow {
  [key: string]: string | number | undefined;
}

// --- Main Fetch Function ---

export async function getCLOsPaginate(
  token: string,
  page: number = 1,
  limit: number = 10,
  filters?: CLOFilters // Assuming this interface is defined elsewhere
) {
  // 1. Create the params object
  const params = new URLSearchParams();

  // 2. Always append pagination (converted to string)
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  // 3. Conditionally append filters if they exist
  if (filters) {
    if (filters.universityId)
      params.append("universityId", String(filters.universityId));
    if (filters.facultyId)
      params.append("facultyId", String(filters.facultyId));
    if (filters.programId)
      params.append("programId", String(filters.programId));
    if (filters.year) params.append("year", String(filters.year));
    if (filters.semester) params.append("semester", String(filters.semester));
    if (filters.section) params.append("section", String(filters.section));
    if (filters.courseId) params.append("courseId", String(filters.courseId));
  }

  // 4. Make the request
  const res = await apiClient(`/api/clo/paginate?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // 5. Handle Errors
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch paginated CLOs");
  }

  return await res.json();
}
// --- Add CLO ---

export async function addClo(
  data: {
    code: string;
    name: string;
    name_th?: string;
    course_id: string;
  },
  token: string
) {
  const res = await apiClient("/api/clo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to add CLO");
  }

  return await res.json();
}

// --- Simple Get (Optional, kept from your original code) ---

export async function getCLOs(token: string, page = 1, limit = 10) {
  const res = await apiClient(`/api/clo/paginate?page=${page}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}
