"use client";

import { useEffect } from "react";
import Link from "next/link";
import React, { ReactNode } from "react";
import NavLink from "../components/NavLink";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "next-i18next";
import { useAuth } from "../app/context/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  School,
  Users,
  Info,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface NavbarProps {
  children?: ReactNode;
  isLoggedIn: boolean;
  setLoading: (isLoading: boolean) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Navbar({
  children,
  setLoading,
  isOpen,
  setIsOpen,
}: NavbarProps) {
  const pathname = usePathname();

  const { t } = useTranslation("common");
  const { logout, user } = useAuth();
  const role = user?.role || "";

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsOpen(false);
      else setIsOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setIsOpen]);

  const handleNavClick = (href: string) => {
    if (pathname === href) return;
    setLoading(true);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const canManageAdmin = ["system_admin", "Super_admin"].includes(role);
  const canViewAnalytics = [
    "Super_admin",
    "instructor",
    "system_admin",
    "curriculum_admin",
    "student",
  ].includes(role);
  const canEditCourse = [
    "instructor",
    "system_admin",
    "curriculum_admin",
    "Super_admin",
  ].includes(role);
  const canViewAnalyticswithGuest = ["guest"].includes(role);
  const canManagePrograms = ["curriculum_admin"].includes(role); // Add roles that can manage programs when needed

  const menuItems = [
    {
      id: "analytics",
      href: "/viewChart",
      icon: <LayoutDashboard size={22} />,
      label: t("analytics"),
      show: canViewAnalytics || canViewAnalyticswithGuest,
    },
    {
      id: "graphGrowth",
      href: "/growthGraph",
      icon: <TrendingUp size={22} />,
      label: t("growthGraph"),
      show: canViewAnalytics,
    },
    {
      id: "programs",
      href: "/editProgram",
      icon: <Settings size={22} />,
      label: t("programs"),
      show: canManageAdmin || canManagePrograms,
    },
    {
      id: "courses",
      href: "/editCourse",
      icon: <BookOpen size={22} />,
      label: t("courses"),
      show: canEditCourse,
    },
    {
      id: "universities",
      href: "/manageUniversity",
      icon: <School size={22} />,
      label: t("universities"),
      show: canManageAdmin,
    },
    {
      id: "accounts",
      href: "/manageAccount",
      icon: <Users size={22} />,
      label: t("accounts"),
      show: canManageAdmin,
    },
    {
      id: "aboutData",
      href: "/aboutData",
      icon: <Info size={22} />,
      label: t("aboutData"),
      show: canViewAnalytics || canViewAnalyticswithGuest,
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("edit_fix_filters");
    localStorage.removeItem("token");

    logout();

    window.location.href = "/";
  };

  return (
    <>
      {/* 🟢 Improved Toggle Button (Static Icons) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-8 z-[60] p-1.5 bg-white border border-slate-200 rounded-full shadow-lg transition-all duration-500
          ${isOpen ? "left-[190px]" : "left-[68px]"}`}
      >
        {isOpen ? (
          <ChevronLeft size={16} className="text-slate-500" />
        ) : (
          <ChevronRight size={16} className="text-slate-500" />
        )}
      </button>

      <aside
        className={`fixed top-0 left-0 z-50 h-screen transition-all duration-500 ease-in-out bg-white shadow-[4px_0_24px_rgba(0,0,0,0.05)] flex flex-col
        ${isOpen ? "w-52" : "w-20"}`}
      >
        <div className="flex flex-col h-full py-8 px-4">
          {/* Logo Section */}
          <Link
            href="/"
            onClick={() => handleNavClick("/")}
            className={`flex items-center mb-10 transition-all duration-300 ${isOpen ? "justify-start px-2 gap-3" : "justify-center"}`}
          >
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-orange-200">
              <span className="text-white font-black text-xl">P</span>
            </div>
            {isOpen && (
              <span className="text-2xl font-black  text-orange-600 tracking-tight">
                PLOCLO
              </span>
            )}
          </Link>

          {/* Navigation Links */}
          <nav className="flex-1">
            {/* 🟢 1. ลดระยะห่างระหว่าง <li> จาก space-y-4 เป็น space-y-1 หรือ space-y-2 */}
            <ul className="space-y-1.5">
              {menuItems.map(
                (item) =>
                  item.show && (
                    <li key={item.id} title={!isOpen ? item.label : ""}>
                      <NavLink
                        href={item.href}
                        onClick={() => handleNavClick(item.href)}
                      >
                        <div
                          className={`flex items-center transition-colors duration-200 
                ${!isOpen ? "py-1.5 justify-center" : "py-1.5 px-4 justify-start"} // 🟢 2. ลดความสูงที่นี่
                ${pathname === item.href ? "text-orange-500 font-light" : "text-slate-400 hover:text-slate-900"}`}
                        >
                          <div
                            className={`flex items-center justify-center shrink-0 ${!isOpen ? "w-full" : "w-6"}`}
                          >
                            {item.icon}
                          </div>

                          {isOpen && (
                            <span className="ml-4 text-[14px] tracking-wide whitespace-nowrap">
                              {" "}
                              {/* 🟢 3. อาจลดขนาด Font เล็กน้อย */}
                              {item.label}
                            </span>
                          )}

                          {/* Indicator Line */}
                          {isOpen && pathname === item.href && (
                            <div className="absolute left-0 w-1 h-5 bg-orange-500 rounded-r-full" /> // 🟢 4. ลดความสูงเส้น Indicator ตามความสูงเมนู
                          )}
                        </div>
                      </NavLink>
                    </li>
                  ),
              )}
            </ul>
          </nav>

          {/* Bottom Section */}
          <div className="mt-auto space-y-4">
            <div
              className={`flex flex-col gap-6 pt-6 border-t border-slate-100 ${!isOpen ? "items-center" : "px-6"}`}
            >
              {isOpen ? (
                <LanguageSwitcher />
              ) : (
                <div className="text-[10px] font-bold text-slate-400">
                  TH/EN
                </div>
              )}

              <button
                onClick={handleLogout}
                title={!isOpen ? t("logout") : ""}
                className={`flex items-center transition-colors duration-200 text-slate-400 hover:text-red-500
                  ${!isOpen ? "justify-center w-full" : "justify-start gap-4"}`}
              >
                <LogOut size={22} className="shrink-0" />
                {isOpen && (
                  <span className="text-[15px] font-medium">{t("logout")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {children}
    </>
  );
}
