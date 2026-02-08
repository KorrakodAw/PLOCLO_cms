"use client";

import { useState, useEffect } from "react";
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
  setLoading: (isLoading: boolean) => void;
}

const LOGOUT_ICON_DEFAULT = "/images/icons/logout_black.png";
const LOGOUT_ICON_HOVER = "/images/icons/logout.png";

export default function Navbar({
  children,
  isLoggedIn,
  setLoading,
}: NavbarProps) {
  const pathname = usePathname();
  const isActiveHome = pathname === "/";
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation("common");
  const { logout, user } = useAuth();

  const role = user?.role || "";

  useEffect(() => {
    if (!isLoggedIn) setIsHovered(false);
  }, [isLoggedIn]);

  const handleNavClick = (href: string) => {
    if (pathname === href) return;
    setLoading(true);
  };

  // --- Logic สำหรับการแสดงเมนูตาม Role ---
  const canManageAdmin = ["system_admin", "Super_admin"].includes(role);
  const canViewAnalytics = [
    "Super_admin",
    "instructor",
    "system_admin",
    "course_admin",
    "student",
    "guest",
  ].includes(role);
  const canEditCourse = [
    "instructor",
    "system_admin",
    "course_admin",
    "Super_admin",
  ].includes(role);

  return (
    <aside className="w-52 min-h-screen p-6 shadow-2xl fixed top-0 left-0 z-10 bg-white">
      <Link
        href="/"
        onClick={() => handleNavClick("/")}
        className={`block text-[40px] font-extrabold mb-8 transition-colors duration-300
          ${isActiveHome ? "text-orange-500" : "text-black hover:text-orange-500"}`}
      >
        PLOCLO
      </Link>

      <nav className="mt-10">
        <ul className="space-y-1">
          {isLoggedIn && (
            <>
              {/* Analytics: ทุกคนที่มีสิทธิ์ยกเว้น Super_admin บางเคส (ปรับตามใจชอบ) */}
              {canViewAnalytics && (
                <NavLink
                  href="/viewChart"
                  onClick={() => handleNavClick("/viewChart")}
                >
                  {t("analytics")}
                </NavLink>
              )}

              {/* Programs: สำหรับ Admin เท่านั้น */}
              {canManageAdmin && (
                <NavLink
                  href="/editProgram"
                  onClick={() => handleNavClick("/editProgram")}
                >
                  {t("programs")}
                </NavLink>
              )}

              {/* Courses: แสดงครั้งเดียวสำหรับผู้ที่มีสิทธิ์ Edit */}
              {canEditCourse && (
                <NavLink
                  href="/editCourse"
                  onClick={() => handleNavClick("/editCourse")}
                >
                  {t("courses")}
                </NavLink>
              )}

              {/* Admin Tools */}
              {canManageAdmin && (
                <>
                  <NavLink
                    href="/manageUniversity"
                    onClick={() => handleNavClick("/manageUniversity")}
                  >
                    {t("universities")}
                  </NavLink>
                  <NavLink
                    href="/manageAccount"
                    onClick={() => handleNavClick("/manageAccount")}
                  >
                    {t("accounts")}
                  </NavLink>
                </>
              )}
            </>
          )}

          <NavLink
            href="/aboutData"
            onClick={() => handleNavClick("/aboutData")}
          >
            {t("about")}
          </NavLink>
        </ul>
      </nav>

      {/* Bottom Section: Language & Logout */}
      <div className="absolute bottom-8 left-0 w-full flex flex-col items-center gap-4 px-6">
        <LanguageSwitcher />

        {isLoggedIn && (
          <button
            onClick={logout}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg transition-all duration-300 border border-transparent
              ${isHovered ? "text-red-500 border-red-100 bg-red-50" : "text-black"}`}
          >
            <span className="text-sm font-light">{t("logout")}</span>
            <Image
              src={isHovered ? LOGOUT_ICON_HOVER : LOGOUT_ICON_DEFAULT}
              alt="Logout Icon"
              width={20}
              height={20}
              className="transition-opacity duration-300"
            />
          </button>
        )}
      </div>

      {children}
    </aside>
  );
}
