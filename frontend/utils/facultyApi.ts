import { apiClient } from "./apiClient";

export interface Faculty {
  id: number;
  name: string;
}

export async function getFaculties(token: string): Promise<Faculty[]> {
  const res = await apiClient("/api/faculty", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Unable to retrieve faculty information");
  }
  return res.json();
}
