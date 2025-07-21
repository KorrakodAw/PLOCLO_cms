"use client";

import Link from "next/link";
import React, { ReactNode } from "react";
import NavLink from "../components/NavLink";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "next-i18next";

interface NavbarProps {
  children?: ReactNode;
}

export default function Navbar({ children }: NavbarProps) {
  const pathname = usePathname();
  const isActive = pathname === "/";
  const { t } = useTranslation("common");

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
        <ul className="">
          <NavLink href="/editProgram">{t("edit program")}</NavLink>
          <NavLink href="/editCourse">{t("edit course")}</NavLink>
          <NavLink href="/viewChart">{t("view chart")}</NavLink>
          <NavLink href="/aboutData">{t("about")}</NavLink>
          <NavLink href="/manageAccount">{t("manage account")}</NavLink>
        </ul>
      </nav>
      {children}
    </aside>
  );
}


