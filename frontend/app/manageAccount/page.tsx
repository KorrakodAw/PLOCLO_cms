"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useToast } from "../../components/Toast";
import AlertPopup from "../../components/AlertPopup";
import Table, { Column } from "../../components/Table";
import FormEditPopup from "../../components/EditPopup";
import LoadingOverlay from "@/components/LoadingOverlay";
import AddButton from "@/components/AddButton";

interface User {
  code: string;
  nameEn: string;
  nameTh: string;
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
  const [activeTab, setActiveTab] = useState<string>("guest");

  const filteredUsers = useMemo(() => {
    if (activeTab === "all") return users;
    return users.filter((user) => user.role === activeTab);
  }, [users, activeTab]);

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

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await apiClient.get("/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setLoading(false);
    } catch {
      showToast("Cannot reach API. Check backend.", "error");
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    fetchUsers();
  }, [isLoggedIn, token]);
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
      fetchUsers();
      showToast("User updated successfully", "success");
      setShowEditPopup(false);
      setSelectedUser(null);
    } catch {
      showToast("Cannot reach API. Check backend.", "error");
    }
  };

  const handleAddUser = async (data: User) => {
    // 1. ตรวจสอบ Email ซ้ำในฝั่ง Frontend ก่อนส่ง Request
    if (users.some((u) => u.email === data.nameEn)) {
      showToast("Email already exists", "error");
      return;
    }

    try {
      const payload = {
        username: data.nameEn,
        email: data.nameTh,
        role: data.code || "guest",
        password: null, // สำหรับผู้ใช้ที่อาจจะ Login ผ่าน Google ในอนาคต
      };

      // 2. ส่งข้อมูลไปยัง Backend
      await apiClient.post("/users/register", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast("User added successfully", "success");
      fetchUsers(); // อัปเดตตารางเพื่อให้ข้อมูลล่าสุดเสมอ
    } catch (err: any) {
      // 3. จัดการกรณี Error จาก Backend (เช่น Database Unique Constraint)
      const msg = err.response?.data?.error || "Failed to add user";
      showToast(msg, "error");
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

  const ROLES_TABS = [
    {
      id: "system_admin",
      label: "Admins",
      color: "text-red-800",
      dot: "bg-red-700",
    },
    {
      id: "course_admin",
      label: "Course Admins",
      color: "text-red-600",
      dot: "bg-red-500",
    },
    {
      id: "instructor",
      label: "Instructors",
      color: "text-blue-600",
      dot: "bg-blue-500",
    },
    {
      id: "student",
      label: "Students",
      color: "text-green-600",
      dot: "bg-green-500",
    },
    {
      id: "guest",
      label: "Guests",
      color: "text-orange-600",
      dot: "bg-orange-500",
    },
  ];

  return (
    <ProtectedRoute roles={["system_admin", "instructor"]}>
      <div className="max-w-[1400px] h-full flex flex-col mx-auto">
        <ToastElement />
        {loading && <LoadingOverlay />}
        <div className="p-5 md:p-8 min-h-screen">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Manage Account
              </h1>
              <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider">
                User Administration
              </p>
            </div>

            {/* ปุ่ม Add User - ใช้ Component AddButton เพื่อความสวยงาม */}
            <AddButton
              buttonText="Create New Account"
              placeholderText={{
                nameEn: "Enter Username",
                nameTh: "Email Address",
              }}
              showCodeInput={false}
              showAbbreviationInputs={false}
              onSubmit={handleAddUser}
            />
          </div>

          {/* TABLE */}
          {/* ROLE TABS NAVIGATION */}
          <div className="flex overflow-x-auto pb-4 mb-4 gap-2 items-center border-b border-gray-100">
            {ROLES_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 rounded-xl transition-all text-sm font-bold flex items-center gap-2 whitespace-nowrap
              ${
                activeTab === tab.id
                  ? `bg-white ${tab.color} shadow-sm border border-gray-200`
                  : "text-gray-400 hover:text-gray-600"
              }
            `}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeTab === tab.id ? tab.dot : "bg-gray-300"
                  }`}
                />
                {tab.label}
                <span className="ml-1 text-xs opacity-60">
                  (
                  {tab.id === "all"
                    ? users.length
                    : users.filter((u) => u.role === tab.id).length}
                  )
                </span>
              </button>
            ))}
          </div>

          {/* DATA TABLE - ใช้ filteredUsers แทน users */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {filteredUsers.length > 0 ? (
              <Table columns={manageAccoutColumns} data={filteredUsers} />
            ) : (
              <div className="p-20 text-center text-gray-400">
                No users found with role:{" "}
                <span className="font-bold">{activeTab}</span>
              </div>
            )}
          </div>

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
                  options: [
                    "system_admin",
                    "course_admin",
                    "instructor",
                    "student",
                    "guest",
                  ],
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
        </div>
      </div>
    </ProtectedRoute>
  );
}
