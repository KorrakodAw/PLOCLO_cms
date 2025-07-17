import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";

export default function AddStudent() {
  const { t } = useTranslation("common");
  return (
    <div className="mt-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-extralight">{t("student management")}</h1>
        <AddButton
          buttonText={t("create new student")}
          placeholderText={{
            code: "Student Code",
            nameEn: "Student Name (EN)",
            nameTh: "Student Name (TH)",
            abbrEn: "Student abbreviation (EN)",
            abbrTh: "Student abbreviation (TH)",
            year: "Year",
          }}
          submitButtonText={{
            insert: "Insert Student",
            upload: "Upload Student (Excel)",
          }}
        />
      </div>

      <hr className="my-3" />
      <h1 className="text-xl font-extralight">{t("student list")}</h1>
    </div>
  );
}
