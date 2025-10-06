import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";

export default function AddStudent() {
  const { t } = useTranslation("common");
  return (
    <div className="mt-5 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{t("student management")}</h1>
        <AddButton
          buttonText={t("create new student")}
          placeholderText={{
            code: "Student Code",
            nameEn: "Student Name (EN)",
            nameTh: "Student Name (TH)",
          }}
          submitButtonText={{
            insert: "Insert Student",
            upload: "Upload Student (Excel)",
          }}
          showAbbreviationInputs={false}
          showYearInput={false}
          onSubmit={(data) => {
            // ฟังก์ชันสำหรับเพิ่ม Student
            console.log("Add student:", data);
            alert("Function to add student is not implemented yet.");
          }}
          onSubmitExcel={(rows) => {
            // ฟังก์ชันสำหรับเพิ่ม Student จาก Excel
            console.log("Upload students from Excel:", rows);
            alert(
              "Function to upload students from Excel is not implemented yet."
            );
          }}
        />
      </div>

      <hr className="my-3" />
      <h1 className="text-xl font-extralight">{t("student list")}</h1>
    </div>
  );
}
