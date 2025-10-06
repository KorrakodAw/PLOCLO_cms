/* eslint-disable @typescript-eslint/no-explicit-any */
import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Table } from "../../components/Table";
import { useEffect, useState } from "react";
import { addPlo, getPlosPaginated } from "../../utils/ploApi";
import { apiClient } from "../../utils/apiClient";

export default function AddPlo() {
  // ฟังก์ชันสำหรับเพิ่ม PLO จาก Excel
  const handleAddPloExcel = async (rows: any[]) => {
    if (!initialized) {
      alert("Auth context not initialized.");
      return;
    }
    if (!isLoggedIn || !token) {
      alert(
        "You have been logged out or your token has expired. Please log in again."
      );
      return;
    }
    if (!selectedProgram) {
      alert("selectedProgram: " + selectedProgram);
      return;
    }
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
        program_id: selectedProgram,
      };
      console.log("AddPloExcel payload", payload);
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
        console.error(`AddPloExcel error row ${i + 1}:`, err);
      }
    }
    let summary = `เพิ่มข้อมูลจาก Excel สำเร็จ: ${successCount} รายการ\nล้มเหลว: ${failCount} รายการ`;
    if (errorDetails.length > 0) {
      summary += `\n\nรายละเอียดข้อผิดพลาด:\n` + errorDetails.join("\n");
    }
    alert(summary);
    // รีเฟรชรายการ PLO หลังเพิ่ม
    try {
      const result = await getPlosPaginated(token, page, limit);
      setPlos(result.data);
      setTotalPages(result.totalPages);
    } catch (e) {
      console.error("Error refreshing PLOs after Excel import", e);
    }
  };

  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn, initialized } = useAuth();
  const [programOptions, setProgramOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [plos, setPlos] = useState<any[]>([]);
  const [loadingPlos, setLoadingPlos] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10); // You can make this configurable if needed
  // ดึงรายการ PLO จาก backend
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const fetchPlos = async () => {
      setLoadingPlos(true);
      try {
        const result = await getPlosPaginated(token, page, limit);
        setPlos(result.data);
        setTotalPages(result.totalPages);
      } catch {
        setPlos([]);
        setTotalPages(1);
      } finally {
        setLoadingPlos(false);
      }
    };
    fetchPlos();
  }, [isLoggedIn, token, page, limit]);

  // ดึงรายการโปรแกรมจาก backend
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const fetchPrograms = async () => {
      try {
        const res = await apiClient("/api/program", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setProgramOptions([
          { label: "กรุณาเลือกโปรแกรม", value: "" },
          ...data.map((p: any) => ({
            label: `${p.program_name_th || p.program_name_en} (${
              p.program_year
            })`,
            value: String(p.id),
          })),
        ]);
      } catch {}
    };
    fetchPrograms();
  }, [isLoggedIn, token]);

  // ฟังก์ชันสำหรับเพิ่ม PLO
  const handleAddPlo = async (data: Record<string, unknown>) => {
    if (!initialized) return; // wait for auth context to load
    if (!isLoggedIn || !token) {
      alert("คุณถูกออกจากระบบหรือ Token หมดอายุ กรุณาเข้าสู่ระบบใหม่");
      return;
    }
    if (!selectedProgram) {
      alert("กรุณาเลือกโปรแกรมก่อน");
      return;
    }
    if (!data.code || !data.nameTh || !data.nameEn) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    try {
      await addPlo(
        {
          code: String(data.code),
          name: String(data.nameTh), // Thai name
          engname: String(data.nameEn), // English name
          program_id: selectedProgram,
        },
        token
      );
      alert("เพิ่มข้อมูล PLO สำเร็จ!");
      window.location.reload();
    } catch (error: any) {
      let errorMsg = "Error adding PLO.\n";
      if (error.message) errorMsg += `Message: ${error.message}\n`;
      if (error.response) {
        try {
          const details = await error.response.text();
          errorMsg += `Details: ${details}\n`;
        } catch {}
      }
      if (error.stack) errorMsg += `Stack: ${error.stack}`;
      console.error("PLO insert error:", errorMsg, error);
      alert(errorMsg);
    }
  };

  return (
    <div className="mt-5 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{t("plo management")}</h1>
        <AddButton
          buttonText={t("create new plo")}
          placeholderText={{
            code: "PLO Code",
            nameEn: "PLO Name (EN)",
            nameTh: "PLO Name (TH)",
          }}
          showAbbreviationInputs={false}
          showYearInput={false}
          submitButtonText={{
            insert: "Insert PLO",
          }}
          programOptions={programOptions}
          selectedProgram={selectedProgram}
          onProgramChange={(e) => setSelectedProgram(e.target.value)}
          onSubmit={handleAddPlo}
          onSubmitExcel={handleAddPloExcel}
        />
      </div>

      <hr className="my-3" />
      {/* Pagination Controls */}

      <div className="mt-4">
        {loadingPlos ? (
          <div>Loading...</div>
        ) : plos.length === 0 ? (
          <div>No PLO data found.</div>
        ) : (
          <Table<any>
            columns={[
              { header: t("code"), accessor: "code" },
              lang === "en"
                ? { header: "Name", accessor: "engname" }
                : { header: "ชื่อแผนการเรียน", accessor: "name" },
              lang === "en"
                ? {
                    header: "Program",
                    accessor: "program_shortname_en",
                    render: (v) => v || "-",
                  }
                : {
                    header: "ชื่อโปรแกรม",
                    accessor: "program_shortname_th",
                    render: (v) => v || "-",
                  },
              {
                header: t("year"),
                accessor: "program_year",
                render: (value) =>
                  lang === "en" ? Number(value) - 543 : value,
              },
            ]}
            data={plos}
          />
        )}
        <div className="flex justify-center items-center mt-4 gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t("Previous")}
          </button>
          <span>
            {t("Page")} {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t("Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
