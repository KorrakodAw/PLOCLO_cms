"use client";

import { useAuth } from "./context/AuthContext";
import LoginForm from "../components/LoginForm";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { isLoggedIn, user } = useAuth();
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      {!isLoggedIn ? (
        <>
          <h1 className="text-3xl font-bold mb-4">{t("please login first")}</h1>
          <LoginForm />
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-4">
            {t("welcome")}, {user?.username || "User"} 👋
          </h1>
          <p className="text-gray-600">{t("you are logged in")}</p>
        </>
      )}
    </div>
  );
}
