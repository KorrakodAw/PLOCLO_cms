"use client";
import { useTranslation } from "react-i18next";
import { useAuth } from "../app/context/AuthContext";
import Login from "../components/LoginForm";

export default function HomePage() {
  const { t } = useTranslation("common");
  const { isLoggedIn } = useAuth();

  // จำลองชื่อผู้ใช้จาก token หรือ localStorage (ในของจริงอาจ fetch user info เพิ่มเติม)
  const username =
    typeof window !== "undefined" ? localStorage.getItem("username") : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      {!isLoggedIn ? (
        <>
          <h1 className="text-3xl font-bold mb-4">{t("please login first")}</h1>
          <Login />
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-4">
            {t("welcome")}, {username || "User"} 👋
          </h1>
          <p className="text-gray-600">{t("you are logged in")}</p>
        </>
      )}
    </div>
  );
}
