import { apiClient } from "../utils/apiClient";

export interface ProgramInput {
  program_code: string | number;
  facultyId?: string | number;
  faculty_id?: string | number;
  program_name_en: string;
  program_name_th: string;
  program_shortname_en: string;
  program_shortname_th: string;
  program_year: number;
}

export interface Program {
  id: string;
  program_code: string;
  faculty_id: string;
  program_name_en: string;
  program_name_th: string;
  program_shortname_en: string;
  program_shortname_th: string;
  program_year: number;
}

// Get all programs (for dropdowns, not paginated)
export async function getPrograms(token: string, facultyId?: string) {
  const res = await apiClient.get("/program", {
    headers: { Authorization: `Bearer ${token}` },
    params: facultyId ? { facultyId } : {},
  });
  return res.data;
}

// Corrected getProgramsPaginated utility
export async function getProgramsPaginated(
  token: string,
  page = 1,
  limit = 10,
  filters?: {
    universityId?: string;
    facultyId?: string;
    programId?: string; // This filter is likely for *Program ID* (the database ID)
    year?: string;
    program_code_filter?: string; // 💡 NEW: Use a clear name for the code filter
  }
) {
  // Build a clean map of query parameters to send to the backend
  const paramsToSend: Record<string, any> = {
    page,
    limit,
  };

  if (filters) {
    if (filters.universityId) paramsToSend.universityId = filters.universityId;
    if (filters.facultyId) paramsToSend.facultyId = filters.facultyId;
    if (filters.programId) paramsToSend.programId = filters.programId;
    if (filters.year) paramsToSend.year = filters.year;

    // 💡 CRITICAL FIX: If you pass the program code for filtering the list,
    // it must use the backend's expected parameter name, which was programId in your backend logic.
    // If you are using program_code_filter as the input, map it here:
    if (filters.program_code_filter)
      paramsToSend.programId = filters.program_code_filter;
  }

  const res = await apiClient.get("/program/paginate", {
    headers: { Authorization: `Bearer ${token}` },
    params: paramsToSend,
  });
  return res.data;
}

// utils/programApi.ts

export async function addProgram(data: ProgramInput, token: string) {
  const res = await apiClient.post("/program", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function bulkUploadPrograms(rows: ProgramInput[], token: string) {
  const res = await apiClient.post("/program/bulk", rows, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
