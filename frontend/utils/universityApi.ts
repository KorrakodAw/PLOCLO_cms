import { apiClient } from "./apiClient";

export interface University {
  id: number;
  name: string;
  name_th?: string;
  abbreviation?: string;
  abbreviation_th?: string;
}

/**
 * Fetches the list of universities.
 * @param token The user's authentication token.
 * @returns A promise that resolves to an array of University objects.
 */

export async function getUniversities(token: string) {
  const res = await apiClient("/api/university", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Create a new university
 */
export async function createUniversity(
  token: string,
  payload: {
    name: string;
    name_th?: string;
    abbreviation?: string;
    abbreviation_th?: string;
  }
) {
  const res = await apiClient(`/api/university`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to create university");
  }

  return res.json();
}
