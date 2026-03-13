/* eslint-disable @typescript-eslint/no-explicit-any */
import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Table, Column } from "../../components/Table";
import { useEffect, useState } from "react";
import { addPlo } from "../../utils/ploApi";
import PaginationControlButton from "../../components/PaignateControlButton";

import { useToast } from "../../components/Toast";
import FormEditPopup from "../../components/EditPopup";
import AlertPopup from "../../components/AlertPopup";
import { apiClient } from "../../utils/apiClient";
import LoadingOverlay from "../../components/LoadingOverlay";

interface AddPloProps {
  programId?: string;
}

interface Plo {
  id: number;
  name: string;
  engname: string;
  code: string;
  program_shortname_en: string;
  program_shortname_th: string;
  program_year: string;
  program_id: number;
  year: string;
}

export default function AddPlo({ programId }: AddPloProps) {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn, initialized } = useAuth();

  const [plos, setPlos] = useState<Plo[]>([]);
  const [loadingPlos, setLoadingPlos] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  const [selectedPlo, setSelectedPlo] = useState<Plo | null>(null);
  const [ploToDelete, setPloToDelete] = useState<Plo | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const { showToast, ToastElement } = useToast();

  const fetchPlos = async () => {
    if (!initialized) return; // wait for auth context to load

    try {
      setLoadingPlos(true);

      const res = await apiClient.get("/plo/paginate", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page,
          limit,
          programId: programId || "",
        },
      });

      setPlos(res.data.data);
      setTotalPages(res.data.pagination.totalPages || 1);
    } catch {
      showToast("Failed to fetch PLOs", "error");
    } finally {
      setLoadingPlos(false);
    }
  };

  // ฟังก์ชันสำหรับเพิ่ม PLO จาก Excel
  const handleAddPloExcel = async (rows: any[]) => {
    if (!initialized) {
      showToast("Auth context not initialized.", "error");
      return;
    }
    if (!isLoggedIn || !token) {
      showToast(
        "You are logged out or token expired. Please log in again.",
        "error",
      );
      return;
    }

    setLoadingPlos(true);

    let successCount = 0;
    let failCount = 0;
    const errorDetails = [];
    // Process each row from Excel
    for (const [i, row] of rows.entries()) {
      const missingFields = [];
      // Accept both camelCase, snake_case, and Excel header keys for import
      const code = row.code || row.Code || row.PLO_code;
      const nameTh = row.nameTh || row.name || row["ชื่อไทย"] || row.PLO_name;
      const nameEn =
        row.nameEn || row.engname || row["ชื่ออังกฤษ"] || row.PLO_engname;
      if (!code) missingFields.push("code");
      if (!nameTh) missingFields.push("nameTh");
      if (!nameEn) missingFields.push("nameEn");
      if (missingFields.length > 0) {
        failCount++;
        errorDetails.push(`Row ${i + 1}: missing ${missingFields.join(", ")}`);
        continue;
      }
      const payload = {
        code: String(code),
        name: String(nameTh),
        engname: String(nameEn),
        program_id: String(programId),
      };

      try {
        await addPlo(payload, token);
        successCount++;
      } catch (err: any) {
        failCount++;
        let backendMsg = err?.message || "Unknown error";
        if (err?.response) {
          try {
            const details = await err.response.text();
            backendMsg += ` | Details: ${details}`;
          } catch {}
        }
        errorDetails.push(`Row ${i + 1}: backend error - ${backendMsg}`);
        showToast(`Error adding PLO from row ${i + 1}: ${backendMsg}`, "error");
      }
    }
    let summary = `เพิ่มข้อมูลจาก Excel สำเร็จ: ${successCount} รายการ\nล้มเหลว: ${failCount} รายการ`;
    if (errorDetails.length > 0) {
      summary += `\n\nรายละเอียดข้อผิดพลาด:\n` + errorDetails.join("\n");
    }
    showToast(summary, failCount > 0 ? "error" : "success");
    // รีเฟรชรายการ PLO หลังเพิ่ม
    try {
      fetchPlos();
      setPage(1);
    } catch {
      showToast("Failed to refresh PLO list after Excel upload.", "error");
    }
  };

  // ฟังก์ชันสำหรับเพิ่ม PLO
  const handleAddPlo = async (data: Record<string, unknown>) => {
    if (!initialized) return; // wait for auth context to load
    if (!isLoggedIn || !token) {
      showToast(
        "You are logged out or token expired. Please log in again.",
        "error",
      );
      return;
    }

    if (!data.code || !data.nameTh || !data.nameEn) {
      showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
      return;
    }

    try {
      await addPlo(
        {
          code: String(data.code),
          name: String(data.nameTh), // Thai name
          engname: String(data.nameEn), // English name
          program_id: String(programId), // Use the modal-selected program
        },
        token,
      );

      fetchPlos();
      showToast(t("PLO added successfully!"), "success");
      setPage(1);
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast("Error: " + err.message, "error");
      } else {
        showToast("Unexpected error occurred while adding PLO.", "error");
      }
    }
  };

  const confirmDelete = async () => {
    if (!ploToDelete || !token) return;

    try {
      await apiClient.delete(`/plo/${ploToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("PLO deleted successfully", "success");
      setPlos((prev) => prev.filter((plo) => plo.id !== ploToDelete.id));
    } catch {
      showToast("Failed to delete PLO", "error");
    } finally {
      fetchPlos();
      setShowDeletePopup(false);
      setPloToDelete(null);
    }
  };

  const saveEdit = async () => {
    if (!selectedPlo || !token) return;

    try {
      await apiClient.patch(
        `/plo/${selectedPlo.id}`,
        {
          code: selectedPlo.code,
          name: selectedPlo.name,
          engname: selectedPlo.engname,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchPlos();
      showToast("PLO updated successfully", "success");
    } catch {
      showToast("Failed to update PLO", "error");
    } finally {
      setSelectedPlo(null);
    }
  };

  const ploColumns: Column<Plo>[] = [
    { header: t("code"), accessor: "code" },
    lang === "en"
      ? { header: "Description", accessor: "engname" }
      : { header: "รายละเอียด", accessor: "name" },
    // lang === "en"
    //   ? {
    //       header: "Program",
    //       accessor: "program_shortname_en",
    //       render: (v) => v || "-",
    //     }
    //   : {
    //       header: "ชื่อโปรแกรม",
    //       accessor: "program_shortname_th",
    //       render: (v) => v || "-",
    //     },
    {
      header: t("actions"),
      accessor: "id",
      actions: [
        {
          label: t("edit"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row: Plo) => {
            setSelectedPlo(row);
            setShowEditPopup(true);
          },
        },
        {
          label: t("delete"),
          color: "red",
          hoverColor: "red",
          onClick: (row: Plo) => {
            setPloToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  useEffect(() => {
    fetchPlos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token, page, programId]);

  return (
    <div className="p-5 md:p-8 min-h-screen">
      {loadingPlos && <LoadingOverlay />}
      <ToastElement />
      <div className="mb-6 flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-light text-gray-800">
          {t("plo management")}
        </h1>
        <AddButton
          buttonText={t("create new plo")}
          placeholderText={{
            code: t("plo code"),
            nameEn: t("plo name (en)"),
            nameTh: t("plo name (th)"),
          }}
          showAbbreviationInputs={false}
          submitButtonText={{
            insert: t("insert plo"),
            upload: t("upload plo (excel)"),
          }}
          onSubmit={handleAddPlo}
          onSubmitExcel={handleAddPloExcel}
        />
      </div>

      <div className="bg-white p-4 rounded-lg shadow-xl">
        <Table<Plo> columns={ploColumns} data={plos} />
        <div className="pt-4 flex justify-end">
          <PaginationControlButton
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Edit PLO Popup */}
      {showEditPopup && selectedPlo && (
        <FormEditPopup
          title={t("edit plo")}
          data={selectedPlo}
          fields={[
            { label: "PLO Code", key: "code", type: "text" },
            { label: "PLO Name (TH)", key: "name", type: "text" },
            { label: "PLO Name (EN)", key: "engname", type: "text" },
          ]}
          onClose={() => {
            setShowEditPopup(false);
            setSelectedPlo(null);
          }}
          onChange={(updated) => setSelectedPlo(updated)}
          onSave={saveEdit}
        />
      )}

      {/* Delete PLO Popup */}
      <AlertPopup
        isOpen={showDeletePopup}
        type="confirm"
        title="Delete PLO"
        message="Are you sure you want to delete this PLO?"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeletePopup(false);
          setPloToDelete(null);
        }}
      />
    </div>
  );
}
