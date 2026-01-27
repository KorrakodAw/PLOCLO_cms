"use client";

import React, { useEffect, useState, use } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/utils/apiClient";
import { Table, Column } from "@/components/Table";
import { useToast } from "@/components/Toast";
import AlertPopup from "@/components/AlertPopup";
import FormEditPopup from "@/components/EditPopup";
import AddButton from "@/components/AddButton";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useTranslation } from "react-i18next";
import BreadCrumb from "@/components/BreadCrumb";

// --- Types ---
interface Instructor {
  id: number;
  full_thai_name: string;
  full_eng_name: string;
  email: string;
  phoneNum: string;
  faculty_id: number;
  nameTh?: string;
  nameEn?: string;
  abbrTh?: string;
  abbrEn?: string;
}

interface Faculty {
  id: number;
  name: string;
  name_th: string;
  university_id: number;
  university?: {
    id: number;
    name: string;
    name_th: string;
  };
}

interface PageProps {
  params: Promise<{
    universityId: string;
    facultyId: string;
  }>;
}

export default function FacultyInstructorPage({ params }: PageProps) {
  // Unwrap params using React.use()
  const { facultyId } = use(params);

  const { token } = useAuth();
  const { showToast, ToastElement } = useToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // --- State ---
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit/Delete State
  const [selectedInstructor, setSelectedInstructor] =
    useState<Instructor | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [instructorToDelete, setInstructorToDelete] =
    useState<Instructor | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  // --- 1. Fetch Data ---
  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // A. Get Faculty Info (for display header)
      const facultyRes = await apiClient.get(`/faculty/${facultyId}`);
      setFaculty(facultyRes.data);

      // B. Get Instructors (filtered by facultyId)
      const instructorRes = await apiClient.get(
        `/instructor?facultyId=${facultyId}`,
      );
      setInstructors(instructorRes.data);
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && facultyId) fetchData();
  }, [token, facultyId]);

  // --- 2. Handlers ---
  const handleCreateInstructor = async (data: Instructor) => {
    if (!token) return;
    try {
      await apiClient.post("/instructor", {
        full_thai_name: data.nameEn,
        full_eng_name: data.nameTh,
        email: data.abbrEn,
        phoneNum: data.abbrTh, // Optional
        faculty_id: parseInt(facultyId),
      });
      showToast("Instructor created successfully", "success");
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to create instructor";
      showToast(msg, "error");
    }
  };

  const handleUpdateInstructor = async () => {
    if (!selectedInstructor) return;
    try {
      await apiClient.put(`/instructor/${selectedInstructor.id}`, {
        full_thai_name: selectedInstructor.full_thai_name,
        full_eng_name: selectedInstructor.full_eng_name,
        email: selectedInstructor.email,
        phoneNum: selectedInstructor.phoneNum,
        faculty_id: parseInt(facultyId), // Keep the faculty link
      });
      showToast("Instructor updated successfully", "success");
      setShowEditPopup(false);
      setSelectedInstructor(null);
      fetchData();
    } catch {
      showToast("Failed to update instructor", "error");
    }
  };

  const handleDeleteInstructor = async () => {
    if (!instructorToDelete) return;
    try {
      await apiClient.delete(`/instructor/${instructorToDelete.id}`);
      showToast("Instructor deleted successfully", "success");
      setShowDeletePopup(false);
      setInstructorToDelete(null);
      fetchData();
    } catch {
      showToast("Failed to delete instructor", "error");
    }
  };

  // --- 3. Table Columns ---
  const columns: Column<Instructor>[] = [
    { header: t("First Name"), accessor: "full_thai_name" },
    { header: t("Last Name"), accessor: "full_eng_name" },
    { header: t("Email"), accessor: "email" },
    { header: t("Phone"), accessor: "phoneNum" },
    {
      header: t("Actions"),
      accessor: "id",
      actions: [
        {
          label: t("edit"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row) => {
            setSelectedInstructor(row);
            setShowEditPopup(true);
          },
        },
        {
          label: t("delete"),
          color: "red",
          hoverColor: "red",
          onClick: (row) => {
            setInstructorToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  if (loading) return <LoadingOverlay />;

  return (
    // <div className="bg-yellow-200 p-4 mb-4 border border-yellow-400 text-yellow-800 rounded font-mono">
    //   TEST: Faculty ID is ({facultyId})
    // </div>
    <div className="p-8 min-h-screen bg-gray-50/50">
      <BreadCrumb
        items={[
          { label: t("manage universities"), href: "/manageUniversity" },
          {
            // ✅ FIX: Use optional chaining to get the name safely
            label:
              lang === "th"
                ? faculty?.university?.name_th || t("loading...")
                : faculty?.university?.name || t("loading..."),

            // ✅ FIX: Use the ID from the university object or the faculty FK
            href: `/manageUniversity/${faculty?.university_id}`,
          },
          {
            label:
              lang === "th"
                ? faculty?.name_th || t("loading...")
                : faculty?.name || t("loading..."),
          },
        ]}
      />
      <ToastElement />

      {/* Header Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-light text-gray-800 tracking-tight">
            {"Instructor Management"}
          </h1>
          <p className="text-gray-500 mt-1">
            Faculty:{" "}
            <span className="font-light text-orange-600">
              {faculty?.name}
            </span>
          </p>
        </div>
        {/* <button
          onClick={() => router.back()} // Go back to University Detail
          className="text-sm text-gray-500 hover:text-gray-800 underline"
        >
          &larr; Back to Faculty List
        </button> */}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-light text-gray-700">
            Instructors List ({instructors.length})
          </h2>

          <AddButton
            buttonText={t("Add Instructor")}
            // Repurpose the placeholder text for Instructor fields
            placeholderText={{
              nameEn: "Full Thai Name",
              nameTh: "Full English Name",
              abbrEn: "Email Address",
              abbrTh: "Phone (Optional)",
            }}
            submitButtonText={{
              insert: t("Add Instructor"),
              upload: t("Upload Excel"),
            }}
            showAbbreviationInputs={true} // We need the 3rd input for Email
            showCodeInput={false}
            onSubmit={handleCreateInstructor}
          />
        </div>

        <div className="p-6">
          {instructors.length > 0 ? (
            <Table columns={columns} data={instructors} />
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-400 italic">
                No instructors found in this faculty.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Popups */}
      {showEditPopup && selectedInstructor && (
        <FormEditPopup
          title="Edit Instructor Details"
          data={selectedInstructor}
          fields={[
            { label: "Full Thai Name", key: "full_thai_name", type: "text" },
            { label: "Full English Name", key: "full_eng_name", type: "text" },
            { label: "Email", key: "email", type: "email" },
            { label: "Phone", key: "phoneNum", type: "text" },
          ]}
          onChange={setSelectedInstructor}
          onSave={handleUpdateInstructor}
          onClose={() => setShowEditPopup(false)}
        />
      )}

      <AlertPopup
        isOpen={showDeletePopup}
        title="Remove Instructor"
        message={`Are you sure you want to remove ${instructorToDelete?.full_thai_name} ${instructorToDelete?.full_eng_name}?`}
        onConfirm={handleDeleteInstructor}
        onCancel={() => setShowDeletePopup(false)}
      />
    </div>
  );
}
