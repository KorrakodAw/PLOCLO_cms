"use client";

import React, { useState, useEffect } from "react";
import { getUniversities, University } from "../../utils/universityApi";
import {
  createFaculty,
  Faculty,
  getFaculties,
  CreateFacultyPayload,
} from "../../utils/facultyApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../../components/Toast";
import AddButton from "../../components/AddButton";
import Table, { Column } from "../../components/Table";
import { useTranslation } from "react-i18next";
import AlertPopup from "../../components/AlertPopup";
import FormEditPopup from "../../components/EditPopup";
import { apiClient } from "../../utils/apiClient";

export default function ManageFaculty() {
  const { token, isLoggedIn } = useAuth();
  const { t } = useTranslation();
  // Fetch faculties when selectedUniversity changes

  const [selectedUniversity, setSelectedUniversity] = useState<string>("");
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const { showToast, ToastElement } = useToast();
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [facultyToDelete, setFacultyToDelete] = useState<Faculty | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const [universityOptions, setUniversityOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const saveEdit = async () => {
    if (!token || !selectedFaculty) return;

    try {
      await apiClient.patch(
        `/faculty/${selectedFaculty.id}`,
        {
          name: selectedFaculty.name,
          name_th: selectedFaculty.name_th,
          abbreviation: selectedFaculty.abbreviation,
          abbreviation_th: selectedFaculty.abbreviation_th,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      showToast("Faculty updated successfully", "success");
      setSelectedFaculty(null);
      setShowEditPopup(false);
      window.location.reload(); // Reload to fetch new data
    } catch {
      showToast("Failed to update faculty. Check backend.", "error");
    }
  };

  const fetchFaculties = async () => {
    if (!token) return;
    try {
      const data = await apiClient.get("/faculty", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFaculties(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFaculty = async (data: Record<string, unknown>) => {
    if (!token) return;

    try {
      const payload: CreateFacultyPayload = {
        name: String(data.nameEn || ""),
        name_th: String(data.nameTh || ""),
        university_id: Number(selectedUniversity),
        abbreviation: String(data.abbrEn || ""),
        abbreviation_th: String(data.abbrTh || ""),
      };
      await createFaculty(token!, payload as CreateFacultyPayload);
      fetchFaculties();
      showToast("Faculty created successfully", "success");
    } catch {
      showToast("Failed to create faculty. Check backend.", "error");
    }
  };

  const confirmDelete = async () => {
    if (!facultyToDelete || !token) return;
    try {
      await apiClient.delete(`/faculty/${facultyToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.reload(); // Reload to fetch new data
      showToast("Faculty deleted successfully", "success");
    } catch {
      showToast("Failed to delete faculty. Check backend.", "error");
    } finally {
      setShowDeletePopup(false);
      setFacultyToDelete(null);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const fetchUniversities = async () => {
      try {
        const data = await getUniversities(token);
        setUniversityOptions([
          { label: t("please select a university"), value: "" },
          ...data.map((u: University) => ({
            label: u.name,
            value: String(u.id),
          })),
        ]);
      } catch {
        showToast("Failed to fetch universities", "error");
      }
    };
    fetchUniversities();
  }, [isLoggedIn, token, t, showToast]);

  useEffect(() => {
    const fetchFaculties = async () => {
      if (!isLoggedIn || !token) {
        return;
      }
      try {
        const data = await getFaculties(token, selectedUniversity);
        setFaculties(data);
      } catch {
        showToast("Cannot reach API. Check backend.", "error");
      }
    };
    fetchFaculties();
  }, [isLoggedIn, token, selectedUniversity, showToast]);

  const facultyColumn: Column<Faculty>[] = [
    { header: "University", accessor: "university_name" },
    {
      header: "Faculty Name",
      accessor: "name",
    },
    {
      header: "Faculty Name (TH)",
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
      header: "actions",
      accessor: "id",
      actions: [
        {
          label: "Edit",
          color: "blue",
          hoverColor: "blue",
          onClick: (row: Faculty) => {
            setSelectedFaculty({ ...row });
            setShowEditPopup(true);
          },
        },
        {
          label: "Delete",
          color: "red",
          hoverColor: "red",
          onClick: (row: Faculty) => {
            setFacultyToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  return (
    <div className="mt-5 p-5">
      {/* {loading && <LoadingOverlay />} */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{"Faculty"}</h1>

        <AddButton
          buttonText="create faculty"
          placeholderText={{
            nameEn: "faculty name (en)",
            nameTh: "faculty name (th)",
            abbrEn: "abbreviation (en)",
            abbrTh: "abbreviation (th)",
          }}
          submitButtonText={{
            insert: "Create Faculty",
            upload: "Upload Faculties Excel",
          }}
          onSubmit={handleFaculty}
          selectedUniversity={selectedUniversity}
          universityOptions={universityOptions}
          onUniversityChange={(e) => setSelectedUniversity(e.target.value)}
          showCodeInput={false}
        />
      </div>
      <hr className="my-3" />
      <Table<Faculty> columns={facultyColumn} data={faculties} />

      {showEditPopup && selectedFaculty && (
        <FormEditPopup
          title="Edit Faculty"
          data={selectedFaculty}
          fields={[
            { label: "Faculty Name (EN)", key: "name", type: "text" },
            { label: "Faculty Name (TH)", key: "name_th", type: "text" },
            { label: "Abbreviation (EN)", key: "abbreviation", type: "text" },
            {
              label: "Abbreviation (TH)",
              key: "abbreviation_th",
              type: "text",
            },
          ]}
          onSave={saveEdit}
          onClose={() => {
            setShowEditPopup(false);
            setSelectedFaculty(null);
          }}
          onChange={(updated) => setSelectedFaculty(updated)}
        />
      )}

      <AlertPopup
        isOpen={showDeletePopup}
        title="Confirm Delete"
        message={`Are you sure you want to delete the faculty "${facultyToDelete?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeletePopup(false)}
      />
      <ToastElement />
    </div>
  );
}
