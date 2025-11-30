"use client";

import React, { useState, useEffect } from "react";
import {
  createUniversity,
  getUniversities,
  University,
  CreateUniversityPayload,
} from "../../utils/universityApi";
import { useToast } from "../../components/Toast";
import { useAuth } from "../context/AuthContext";
import AddButton from "../../components/AddButton";
import { Table, Column } from "../../components/Table";
import { apiClient } from "../../utils/apiClient";
import FormEditPopup from "../../components/EditPopup";
import AlertPopup from "../../components/AlertPopup";

export default function ManageUniversity() {
  const { token, isLoggedIn } = useAuth();
  const { showToast, ToastElement } = useToast();
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] =
    useState<University | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [universityToDelete, setUniversityToDelete] =
    useState<University | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  // Function to refresh data safely
  const fetchUniversities = async () => {
    if (!token) return;
    try {
      const data = await getUniversities(token);
      setUniversities(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUniversity = async (data: Record<string, unknown>) => {
    if (!token) return;
    try {
      const payload: CreateUniversityPayload = {
        name: String(data.nameEn || ""),
        name_th: String(data.nameTh || ""),
        abbreviation: String(data.abbrEn || ""),
        abbreviation_th: String(data.abbrTh || ""),
      };
      await createUniversity(token!, payload as CreateUniversityPayload);
      showToast("University created successfully", "success");
      fetchUniversities(); // Refresh instead of reload
    } catch {
      showToast("Failed to create university", "error");
    }
  };

  const confirmDelete = async () => {
    if (!universityToDelete || !token) return;

    try {
      await apiClient.delete(`/university/${universityToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("University deleted successfully", "success");
      setUniversities((prev) =>
        prev.filter((uni) => uni.id !== universityToDelete.id)
      );
    } catch {
      showToast("Failed to delete university", "error");
    } finally {
      setShowDeletePopup(false);
      setUniversityToDelete(null);
    }
  };

  const saveEdit = async () => {
    if (!selectedUniversity || !token) return;

    try {
      const res = await apiClient.patch(
        `/university/${selectedUniversity.id}`,
        {
          name: selectedUniversity.name,
          name_th: selectedUniversity.name_th,
          abbreviation: selectedUniversity.abbreviation,
          abbreviation_th: selectedUniversity.abbreviation_th,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUniversities((prev) =>
        prev.map((uni) => (uni.id === selectedUniversity.id ? res.data : uni))
      );
      showToast("University updated successfully", "success");
    } catch {
      showToast("Failed to update university", "error");
    } finally {
      setShowEditPopup(false);
      setSelectedUniversity(null);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    fetchUniversities();
  }, [isLoggedIn, token]);

  const universityColumn: Column<University>[] = [
    {
      header: "University Name",
      accessor: "name",
    },
    {
      header: "University Name (TH)",
      accessor: "name_th",
    },
    {
      header: "Abbreviation",
      accessor: "abbreviation",
    },
    {
      header: "Abbreviation (TH)",
      accessor: "abbreviation_th",
    },
    {
      header: "Actions",
      accessor: "id",
      actions: [
        {
          label: "Edit",
          color: "blue",
          hoverColor: "blue",
          onClick: (row: University) => {
            setSelectedUniversity({ ...row });
            setShowEditPopup(true);
          },
        },
        {
          label: "Delete",
          color: "red",
          hoverColor: "red",
          onClick: (row: University) => {
            setUniversityToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  return (
    <div className="mt-5 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{"Universities"}</h1>

        <AddButton
          buttonText="create university"
          placeholderText={{
            nameEn: "university name (en)",
            nameTh: "university name (th)",
            abbrEn: "abbreviation (en)",
            abbrTh: "abbreviation (th)",
          }}
          submitButtonText={{
            insert: "Create University",
            upload: "Upload Universities Excel",
          }}
          requiredFields={["nameEn", "nameTh", "abbrEn", "abbrTh"]}
          onSubmit={handleUniversity}
          onSubmitExcel={() => {}}
          showCodeInput={false}
        />
      </div>
      <hr className="my-3" />
      <Table<University> columns={universityColumn} data={universities} />

      {/* Edit Popup */}
      {showEditPopup && selectedUniversity && (
        <FormEditPopup
          title="Edit University"
          data={selectedUniversity}
          fields={[
            { label: "University Name", key: "name", type: "text" },
            { label: "University Name (TH)", key: "name_th", type: "text" },
            {
              label: "Abbreviation",
              key: "abbreviation",
              type: "text",
            },
            {
              label: "Abbreviation (TH)",
              key: "abbreviation_th",
              type: "text",
            },
          ]}
          onChange={(updated) => setSelectedUniversity(updated)}
          onSave={saveEdit}
          onClose={() => setShowEditPopup(false)}
        />
      )}

      {/* Delete Popup */}
      <AlertPopup
        isOpen={showDeletePopup}
        type="confirm"
        title="Delete User"
        message="Are you sure you want to delete this university?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeletePopup(false);
          setUniversityToDelete(null);
        }}
      />
      <ToastElement />
    </div>
  );
}
