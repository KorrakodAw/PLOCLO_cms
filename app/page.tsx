"use client";
import Login from "../components/LoginForm";
import { useTranslation } from "react-i18next";

// Mark as client component if you use useTranslation here

export default function HomePage() {
  const { t } = useTranslation("common");
  return (
    <div className="align-middle justify-center text-center">
      <h1 className="text-3xl font-bold mb-4">{t("please login first")}</h1>
      <Login />
    </div>
  );
}

