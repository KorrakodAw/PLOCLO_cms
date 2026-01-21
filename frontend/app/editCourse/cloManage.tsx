import { useTranslation } from "react-i18next";
import { Table, Column } from "../../components/Table";
import { useEffect, useState } from "react";
import PaginationControlButton from "../../components/PaignateControlButton";
import AddButton from "../../components/AddButton";

import { addClo, getCLOsPaginate, CLO } from "../../utils/cloApi";

import { useToast } from "../../components/Toast";
import { useAuth } from "../context/AuthContext";

import AlertPopup from "../../components/AlertPopup";
import FormEditPopup from "../../components/EditPopup";
import { apiClient } from "../../utils/apiClient";
import LoadingOverlay from "../../components/LoadingOverlay";

// --- Interfaces ---

interface ExcelCLORow {
  code?: string | number;
  nameEn?: string;
  nameTh?: string;
  clo_name?: string;
  clo_code?: string;
  [key: string]: unknown;
}

interface CLOManagementProps {
  universityId?: string;
  facultyId?: string;
  programId?: string;
  year?: string;
  semester?: string;
  section?: string;
  courseId?: string;
}

export default function CLOManagement({ courseId }: CLOManagementProps) {
  const { t, i18n } = useTranslation("common");
  const { showToast, ToastElement } = useToast();
  const lang = i18n.language;
  const { isLoggedIn, token } = useAuth();

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Data
  const [clos, setClos] = useState<Array<CLO>>([]);
  const [loading, setLoading] = useState(false);

  const [selectedCLO, setSelectedCLO] = useState<CLO | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [cloToDelete, setCloToDelete] = useState<CLO | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  // --- CRUD Operations ---

  const handleAddclo = async (data: Record<string, unknown>) => {
    if (!token) return;
    if (!courseId) {
      showToast(
        t("Please select a Semester and Section to identify the course"),
        "error",
      );
      return;
    }
    try {
      await addClo(
        {
          code: String(data.code),
          name: String(data.nameEn),
          name_th: String(data.nameTh || ""),
          course_id: courseId, // Sending Master ID
        },
        token,
      );
      fetchCLOs();
      showToast(t("clo added successfully"), "success");
      setPage(1);
    } catch {
      showToast("Failed to add CLO", "error");
    }
  };

  const handleExcelUpload = async (rows: ExcelCLORow[]) => {
    // 1. Validate BEFORE starting loading (prevents getting stuck)
    if (!token || !courseId) {
      showToast(t("Please select a course before uploading"), "error");
      return;
    }

    // 2. Start Loading
    setLoading(true);

    try {
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const [index, row] of rows.entries()) {
        const code = row.code || row.clo_code || row.CLO_code;
        const nameEn = row.nameEn || row.CLO_engname;
        const nameTh = row.nameTh || row.CLO_name;

        if (!code || !nameEn) {
          failCount++;
          errors.push(`Row ${index + 1}: Missing code or name`);
          continue;
        }

        try {
          // Note: addClo is awaited here, which is correct
          await addClo(
            {
              code: String(code),
              name: String(nameEn),
              name_th: String(nameTh || ""),
              course_id: courseId,
            },
            token,
          );
          successCount++;
        } catch {
          failCount++;
          errors.push(`Row ${index + 1}: API Error`);
        }
      }

      // 3. Refresh Data (Await it so loading stays on until finished)
      if (successCount > 0) {
        await fetchCLOs();
        setPage(1);
      }

      showToast(
        `Upload Result: ${successCount} success, ${failCount} failed`,
        failCount > 0 ? "error" : "success",
      );
    } catch (err) {
      console.error(err);
      showToast("Critical upload error", "error");
    } finally {
      // 4. ALWAYS stop loading, even if there was an error
      setLoading(false);
    }
  };

  const cloColumns: Column<CLO>[] = [
    { header: "Code", accessor: "code" },
    lang === "en"
      ? { header: "CLO Name (EN)", accessor: "name" }
      : { header: "CLO Name (TH)", accessor: "name_th" },
    {
      header: "Actions",
      accessor: "id",
      actions: [
        {
          label: t("edit"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row: CLO) => {
            setSelectedCLO(row);
            setShowEditPopup(true);
          },
        },
        {
          label: t("delete"),
          color: "red",
          hoverColor: "red",
          onClick: (row: CLO) => {
            setCloToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  const saveEdit = async () => {
    if (!selectedCLO) return;
    try {
      await apiClient.patch(
        `/clo/${selectedCLO.id}`,
        {
          code: selectedCLO.code,
          name: selectedCLO.name,
          name_th: selectedCLO.name_th,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchCLOs();
      showToast("CLO updated successfully", "success");
      setShowEditPopup(false);
      setSelectedCLO(null);
    } catch {
      showToast("Failed to update CLO", "error");
    }
  };

  const confirmDelete = async () => {
    if (!cloToDelete) return;
    try {
      await apiClient.delete(`/clo/${cloToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCLOs();
      showToast("CLO deleted successfully", "success");
    } catch {
      showToast("Failed to delete CLO", "error");
    } finally {
      setShowDeletePopup(false);
      setCloToDelete(null);
      setLoading(false);
    }
  };

  // 🟢 FIX: Fetch Logic
  const fetchCLOs = () => {
    if (!isLoggedIn || !token) return;
    setLoading(true);
    const filters: Record<string, string> = {};

    // Prioritize specificCourseId (from dropdown) over prop courseId
    if (courseId) {
      filters.courseId = courseId;
    } else if (courseId) {
      filters.courseId = courseId;
    }

    getCLOsPaginate(token, page, limit, filters)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        const total = res.total || 1;
        setClos(data);
        setTotalPages(Math.ceil(total / limit));
      })
      .catch((err) => {
        showToast("API CLO error: " + err.message, "error");
      })
      .finally(() => setLoading(false));
  };

  // Add specificCourseId to dependency array so table refreshes when selection changes
  useEffect(() => {
    fetchCLOs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token, page, courseId]);

  return (
    <div className="mt-5 p-5">
      {loading && <LoadingOverlay />}
      <ToastElement />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{t("clo manage")}</h1>
        <AddButton
          buttonText={t("add new clo")}
          placeholderText={{
            code: "CLO Code (e.g., CLO1)",
            nameEn: "CLO Name (EN)",
            nameTh: "CLO Name (TH)",
          }}
          submitButtonText={{
            insert: "insert clo",
            upload: "upload clo (excel)",
          }}
          showAbbreviationInputs={false}
          onSubmit={handleAddclo}
          onSubmitExcel={handleExcelUpload}
        />
      </div>

      <hr className="my-3" />

      <Table<CLO> columns={cloColumns} data={clos} />

      {selectedCLO && showEditPopup && (
        <FormEditPopup
          title="Edit CLO"
          data={selectedCLO}
          fields={[
            { label: "CLO Code", key: "code", type: "text" },
            { label: "CLO Name (EN)", key: "name", type: "text" },
            { label: "CLO Name (TH)", key: "name_th", type: "text" },
          ]}
          onChange={(updated) => setSelectedCLO(updated)}
          onSave={saveEdit}
          onClose={() => {
            setShowEditPopup(false);
            setSelectedCLO(null);
          }}
        />
      )}

      <AlertPopup
        isOpen={showDeletePopup}
        type="confirm"
        title="Delete CLO"
        message="Are you sure you want to delete this CLO?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeletePopup(false);
          setCloToDelete(null);
        }}
      />

      <div className="pt-4 flex justify-end">
        <PaginationControlButton
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
