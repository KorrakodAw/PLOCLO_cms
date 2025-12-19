"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useToast } from "../../components/Toast";
import AlertPopup from "../../components/AlertPopup";
import Table, { Column } from "../../components/Table";
import FormEditPopup from "../../components/EditPopup";
import LoadingOverlay from "@/components/LoadingOverlay";

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
        const res = await apiClient.get("/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
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
      await apiClient.delete(`/users/${userToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
      const res = await apiClient.patch(
        `/users/${selectedUser.id}`,
        {
          username: selectedUser.username,
          email: selectedUser.email,
          role: selectedUser.role,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? res.data : u))
      );

      showToast("User updated successfully", "success");
      setShowEditPopup(false);
      setSelectedUser(null);
    } catch {
      showToast("Cannot reach API. Check backend.", "error");
    }
  };

  if (!isLoggedIn) return <p>Please login first.</p>;
  if (loading) return <LoadingOverlay />;

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
      <div className="max-w-[1400px] h-full flex flex-col mx-auto">
        <div className="p-5 md:p-8 min-h-screen">
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
      </div>
    </ProtectedRoute>
  );
}
