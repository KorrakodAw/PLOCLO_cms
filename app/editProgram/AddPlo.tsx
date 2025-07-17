import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";

export default function AddPlo() {
  const { t } = useTranslation("common");
  return (
    <div className="mt-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-extralight">{t("plo management")}</h1>
        <AddButton
          buttonText={t("create new plo")}
          placeholderText={{
            code: "PLO Code",
            nameEn: "PLO Name (EN)",
            nameTh: "PLO Name (TH)",
            abbrEn: "PLO abbreviation (EN)",
            abbrTh: "PLO abbreviation (TH)",
            year: "Year",
          }}
          submitButtonText={{
            insert: "Insert PLO",
            upload: "Upload PLO (Excel)",
          }}
        />
      </div>

      <hr className="my-3" />
      <h1 className="text-xl font-extralight">{t("plo list")}</h1>
    </div>
  );
}
