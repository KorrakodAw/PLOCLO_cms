"use client";

import Link from "next/link";
import React, { ReactNode } from "react";
import NavLink from "../components/NavLink";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "next-i18next";
import { useAuth } from "../app/context/AuthContext";

interface NavbarProps {
  children?: ReactNode;
  isLoggedIn: boolean;
}

export default function Navbar({ children, isLoggedIn }: NavbarProps) {
  const pathname = usePathname();
  const isActive = pathname === "/";
  const { t } = useTranslation("common");

  // 👇 ดึง role มาจาก context
  const { logout, user } = useAuth();
  // สมมติ user = { id: 1, role: "admin" }

  return (
    <aside className="w-52 min-h-screen p-6 shadow-2xl fixed top-0 left-0 z-10">
      <Link
        href="/"
        className={`block text-[40px] font-extrabold mb-8 transition-colors duration-300
          ${isActive ? "text-orange-500" : "text-black hover:text-orange-500"}`}
      >
        PLOCLO
      </Link>
      <LanguageSwitcher />
      <nav className="mt-10">
        <ul>
          {isLoggedIn && (
            <>
              {["admin", "instructor"].includes(user?.role || "") && (
                <>
                  <NavLink href="/editProgram">{t("edit program")}</NavLink>
                  <NavLink href="/editCourse">{t("edit course")}</NavLink>
                </>
              )}
              {/* ✅ เฉพาะ Admin */}
              {["admin"].includes(user?.role || "") && (
                <NavLink href="/manageAccount">{t("manage account")}</NavLink>
              )}

              {/* ✅ ทุก role เข้าได้ */}
              <NavLink href="/viewChart">{t("view chart")}</NavLink>
            </>
          )}

          <NavLink href="/aboutData">{t("about")}</NavLink>

          {isLoggedIn && (
            <button
              onClick={logout}
              className={`p-3 block font-normal mt-20 transition-all duration-200 transform hover:translate-x-2
              ${
                isActive
                  ? ""
                  : "text-black hover:text-red-500 hover:shadow-2xl hover:rounded-b-md"
              }`}
            >
              {t("logout")}
            </button>
          )}
        </ul>
      </nav>
      {children}
    </aside>
  );
}
