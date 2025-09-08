"use client";

import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", labelKey: "English" },
  { code: "th", labelKey: "ไทย" },
];

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <select
      onChange={handleChange}
      value={i18n.language}
      className="px-5 py-2 outline-none focus:outline-none focus:ring-0 hover:shadow-xl"
    >
      {LANGUAGES.map(({ code, labelKey }) => (
        <option key={code} value={code}>
          {labelKey}
        </option>
      ))}
    </select>
  );
}
