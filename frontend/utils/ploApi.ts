import { apiClient } from "./apiClient";

export async function addPlo(
  {
    code,
    name,
    engname,
    program_id,
  }: {
    code: string;
    name: string;
    engname: string;
    program_id: string;
  },
  token: string
) {
  const res = await apiClient("/api/plo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code, name, engname, program_id }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to add PLO");
  }
  return await res.json();
}

export async function getPlos(token: string) {
  const res = await apiClient("/api/plo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch PLOs");
  }
  return await res.json();
}

// Get paginated PLOs
export async function getPlosPaginated(token: string, page = 1, limit = 10) {
  const res = await apiClient(`/api/plo/paginate?page=${page}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch paginated PLOs");
  }
  return await res.json();
}
