"use client";

import { useState } from "react";
import Link from "next/link";
import React, { ReactNode } from "react";
import NavLink from "../components/NavLink";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "next-i18next";
import { useAuth } from "../app/context/AuthContext";

import Image from "next/image";

interface NavbarProps {
  children?: ReactNode;
  isLoggedIn: boolean;
}

const LOGOUT_ICON_DEFAULT = "/images/icons/logout_black.png";
const LOGOUT_ICON_HOVER = "/images/icons/logout.png";

export default function Navbar({ children, isLoggedIn }: NavbarProps) {
  const pathname = usePathname();
  const isActive = pathname === "/";
  const [isHovered, setIsHovered] = useState(false);
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

      <nav className="mt-10">
        <ul>
          {isLoggedIn && (
            <>
              <NavLink href="/viewChart">{t("analytics")}</NavLink>
              {["admin", "instructor"].includes(user?.role || "") && (
                <>
                  <NavLink href="/editProgram">{t("programs")}</NavLink>
                  <NavLink href="/editCourse">{t("courses")}</NavLink>
                </>
              )}
              {/* ✅ เฉพาะ Admin */}
              {["admin"].includes(user?.role || "") && (
                <>
                  <NavLink href="/manageAccount">{t("accounts")}</NavLink>
                  <NavLink href="/manageUniversity">
                    {t("universities")}
                  </NavLink>
                </>
              )}

              {/* ✅ ทุก role เข้าได้ */}
            </>
          )}

          <NavLink href="/aboutData">{t("about")}</NavLink>

          <div className="fixed bottom-0 center flex flex-col justify-between items-center p-4 z-40">
            <LanguageSwitcher />

            {isLoggedIn && (
              <button
                onClick={logout}
                // 2. Set state on mouse events
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                // Removed mt-auto and ml-3 for clarity based on your fixed parent
                className={`p-3 mt-3 font-normal flex justify-center items-center gap-2 cursor-pointer w-[140px] h-[40px] text-sm 
        ${
          isHovered
            ? "text-red-500 " // Use the hover state to apply the hover text color
            : "text-black"
        }
        ${isActive ? "" : ""}
      `}
              >
                {t("logout")}

                {/* 3. Conditional Image Rendering */}
                <Image
                  // If hovered, use the hover icon path, otherwise use the default path

                  src={isHovered ? LOGOUT_ICON_HOVER : LOGOUT_ICON_DEFAULT}
                  alt="Logout Icon"
                  width={30}
                  height={30}
                />
              </button>
            )}
          </div>
        </ul>
      </nav>
      {children}
    </aside>
  );
}
