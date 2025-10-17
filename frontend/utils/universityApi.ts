import { apiClient } from "./apiClient";

export async function getUniversities(token: string) {
  const res = await apiClient("/api/university", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
