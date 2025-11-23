import { useTranslation } from "react-i18next";

export default function CLOPLOMapping() {
  const { t } = useTranslation("common");

  return (
    <div className="mt-5 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extralight">{t("clo plo mapping")}</h1>
      </div>

      <hr className="my-3" />
    </div>
  );
}
