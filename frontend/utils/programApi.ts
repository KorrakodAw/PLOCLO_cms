// Get paginated programs from backend
export async function getProgramsPaginated(
  token: string,
  page = 1,
  limit = 10
) {
  const res = await apiClient(
    `/api/program/paginate?page=${page}&limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch paginated programs");
  }
  return await res.json();
}
// utils/programApi.ts
import { apiClient } from "../utils/apiClient";

export async function addProgram(data: never, token: string) {
  const res = await apiClient("/api/program", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create program");
  }

  return res.json();
}

export async function bulkUploadPrograms(rows: never[], token: string) {
  const res = await apiClient("/api/program/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to upload programs");
  }

  return res.json();
}
