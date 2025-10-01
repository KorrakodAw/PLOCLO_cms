"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import ProtectedRoute from "../../components/ProtectedRoute";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export default function ManageAccount() {
  const { token, isLoggedIn } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !token) return;

    const fetchUsers = async () => {
      try {
        const res = await apiClient("/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to fetch users");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error(err);
        alert("Cannot reach API. Check backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isLoggedIn, token]);

  if (!isLoggedIn) return <p>Please login first.</p>;
  if (loading) return <p>Loading users...</p>;

  return (
    <ProtectedRoute roles={["admin", "instructor"]}>
      <div className="p-5">
        <h1 className="text-2xl font-extralight mb-4">Manage Account</h1>
        <table className="min-w-full border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">ID</th>
              <th className="px-4 py-2 border">Username</th>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">{u.id}</td>
                <td className="px-4 py-2 border">{u.username}</td>
                <td className="px-4 py-2 border">{u.email}</td>
                <td className="px-4 py-2 border">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProtectedRoute>
  );
}
