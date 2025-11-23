import { apiClient } from "../utils/apiClient";

export interface ProgramInput {
  program_code: string | number;
  faculty_id: string | number;
  program_name_en: string;
  program_name_th: string;
  program_shortname_en: string;
  program_shortname_th: string;
  program_year: number;
}

// Get all programs (for dropdowns, not paginated)
export async function getPrograms(token: string, facultyId?: string) {
  let query = "";
  if (facultyId) query = `?facultyId=${facultyId}`;

  const res = await apiClient(`/api/program${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


export async function getProgramsPaginated(
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
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(filters?.universityId ? { universityId: filters.universityId } : {}),
    ...(filters?.facultyId ? { facultyId: filters.facultyId } : {}),
    ...(filters?.programId ? { programId: filters.programId } : {}),
    ...(filters?.year ? { year: filters.year } : {}),
  });

  const res = await apiClient(`/api/program/paginate?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch paginated programs");
  }

  return await res.json();
}

// utils/programApi.ts

export async function addProgram(data: ProgramInput, token: string) {
  const res = await apiClient("/api/program", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errBody = await res.json();
    interface ErrorWithStatus extends Error {
      status?: number;
    }
    const e: ErrorWithStatus = new Error(errBody.error || "Failed to create program");
    e.status = res.status;
    throw e;
  }

  return res.json();
}

export async function bulkUploadPrograms(rows: ProgramInput[], token: string) {
  const res = await apiClient("/api/program/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const errBody = await res.json();
    interface ErrorWithStatus extends Error {
      status?: number;
    }
    const e: ErrorWithStatus = new Error(errBody.error || "Failed to upload programs");
    e.status = res.status;
    throw e;
  }

  return res.json();
}
