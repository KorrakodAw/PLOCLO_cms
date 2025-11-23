import { apiClient } from "./apiClient";

export interface Faculty {
  id: number;
  name: string;
  name_th?: string;
  university_id?: number;
  abbreviation?: string;
  abbreviation_th?: string;
}

/**
 * Fetches the list of faculties.
 * @param token The user's authentication token.
 * @param universityId Optional ID to filter faculties by a specific university.
 * @returns A promise that resolves to an array of Faculty objects.
 */
export async function getFaculties(token: string, universityId?: string) {
  const query = universityId ? `?university_id=${universityId}` : "";
  const res = await apiClient(`/api/faculty${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Unable to retrieve faculty information");
  }

  return res.json();
}

/**
 * Create a new faculty
 */
export async function createFaculty(
  token: string,
  payload: {
    name: string;
    name_th?: string;
    university_id: number;
    abbreviation?: string;
    abbreviation_th?: string;
  }
) {
  const res = await apiClient(`/api/faculty`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create faculty");
  }

  return res.json();
}
