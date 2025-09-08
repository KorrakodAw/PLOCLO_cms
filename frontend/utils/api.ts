export const API_URL = "http://localhost:5000"; // backend URL

// Register
export async function register(
  username: string,
  email: string,
  password: string
) {
  const res = await fetch(`${API_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return res.json();
}

// Login
export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token); // store token
  }
  return data;
}

// Get all users (protected)
export async function getUsers() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
