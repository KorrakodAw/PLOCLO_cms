"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useToast } from "../../components/Toast";
import AlertPopup from "../../components/AlertPopup";
import Table, { Column } from "../../components/Table";
import FormEditPopup from "../../components/EditPopup";

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

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const { showToast, ToastElement } = useToast();

  // Fetch users
  useEffect(() => {
    if (!isLoggedIn || !token) return;

    const fetchUsers = async () => {
      try {
        const res = await apiClient("/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const err = await res.json();
          showToast(err.error || "Failed to fetch users", "error");
          return;
        }

        const data = await res.json();
        setUsers(data);
      } catch {
        showToast("Cannot reach API. Check backend.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isLoggedIn, token, showToast]);

  // ============================
  // DELETE USER
  // ============================
  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const res = await apiClient(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Failed to delete user", "error");
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      showToast("User deleted successfully", "success");
    } catch {
      showToast("Cannot reach API. Check backend.", "error");
    } finally {
      setShowDeletePopup(false);
      setUserToDelete(null);
    }
  };

  // ============================
  // SAVE EDITED USER
  // ============================
  const saveEdit = async () => {
    if (!selectedUser) return;

    try {
      const res = await apiClient(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: selectedUser.username,
          email: selectedUser.email,
          role: selectedUser.role,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Failed to update user", "error");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? selectedUser : u))
      );

      showToast("User updated successfully", "success");
      setShowEditPopup(false);
      setSelectedUser(null);
    } catch {
      showToast("Cannot reach API. Check backend.", "error");
    }
  };

  if (!isLoggedIn) return <p>Please login first.</p>;
  if (loading) return <p>Loading users...</p>;

  const manageAccoutColumns: Column<User>[] = [
    { header: "ID", accessor: "id" },
    { header: "Username", accessor: "username" },
    { header: "Email", accessor: "email" },
    { header: "Role", accessor: "role" },
    {
      header: "Actions",
      accessor: "id",
      actions: [
        {
          label: "Edit",
          color: "blue",
          hoverColor: "blue",
          onClick: (row: User) => {
            setSelectedUser({ ...row });
            setShowEditPopup(true);
          },
        },
        {
          label: "Delete",
          color: "red",
          hoverColor: "red",
          onClick: (row: User) => {
            setUserToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  return (
    <ProtectedRoute roles={["admin", "instructor"]}>
      <div className="p-5">
        <h1 className="text-2xl font-extralight mb-4">Manage Account</h1>

        {/* TABLE */}
        <Table columns={manageAccoutColumns} data={users} />

        {/* ============================
          EDIT POPUP
        ============================ */}

        {showEditPopup && selectedUser && (
          <FormEditPopup
            title="Edit User"
            data={selectedUser}
            fields={[
              { label: "Username", key: "username", type: "text" },
              { label: "Email", key: "email", type: "email" },
              {
                label: "Role",
                key: "role",
                type: "select",
                options: ["admin", "instructor", "student"],
              },
            ]}
            onChange={(updated) => setSelectedUser(updated)}
            onSave={saveEdit}
            onClose={() => setShowEditPopup(false)}
          />
        )}

        {/* ============================
          DELETE CONFIRM POPUP
        ============================ */}
        <AlertPopup
          isOpen={showDeletePopup}
          type="confirm"
          title="Delete User"
          message="Are you sure you want to delete this user?"
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeletePopup(false);
            setUserToDelete(null);
          }}
        />

        <ToastElement />
      </div>
    </ProtectedRoute>
  );
}
