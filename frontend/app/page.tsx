"use client";

import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import LoginForm from "../components/LoginForm";
import { useTranslation } from "react-i18next";
import QuickActionCard from "../components/QuickActionCard";
import {
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  Settings,
  Info,
} from "lucide-react";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function HomePage() {
  const { isLoggedIn, user } = useAuth();
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(false);

  const role = user?.role || "";
  const isManageable = ["system_admin", "Super_admin"].includes(role);
  const isGuest = role === "guest";

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6">
      {!isLoggedIn ? (
        <LoginForm />
      ) : (
        <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Header */}
          <div className="text-left mb-12">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight mb-4">
              {t("welcome")},{" "}
              <span className="text-orange-500">{user?.username}</span> 👋
            </h1>
            <p className="text-slate-500 text-lg font-medium opacity-80">
              {isGuest
                ? "You are logged in as a Guest. Access is limited to general information."
                : t("What would you like to do today?")}
            </p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 🟢 Guest & All: หน้าอธิบายข้อมูล (มักจะเป็นหน้าเดียวที่ Guest ดูได้) */}
            <QuickActionCard
              loading={() => setLoading(true)}
              href="/aboutData"
              icon={<Info className="text-emerald-500" />}
              title="System Information"
              description="Understand how the PLO/CLO assessment system works."
              colorClass="hover:border-emerald-200"
            />

            {/* 🔴 ซ่อน Card อื่นๆ ถ้าเป็น Guest */}
            {!isGuest && (
              <>
                <QuickActionCard
                  loading={() => setLoading(true)}
                  href="/viewChart"
                  icon={<LayoutDashboard className="text-blue-500" />}
                  title="PLO Analytics"
                  description="Analyze student performance and achievements."
                  colorClass="hover:border-blue-200"
                />
                <QuickActionCard
                  loading={() => setLoading(true)}
                  href="/growthGraph"
                  icon={<TrendingUp className="text-indigo-500" />}
                  title="Growth Tracking"
                  description="Monitor competency evolution over time."
                  colorClass="hover:border-indigo-200"
                />
              </>
            )}

            {/* 🟡 สิทธิ์เฉพาะ Instructor/Admin (ไม่ใช่ Guest และไม่ใช่ Student) */}
            {role !== "student" && !isGuest && (
              <QuickActionCard
                loading={() => setLoading(true)}
                href="/editCourse"
                icon={<BookOpen className="text-orange-500" />}
                title="Manage Courses"
                description="Assign scores and evaluate outcomes."
                colorClass="hover:border-orange-200"
              />
            )}

            {/* 🔵 สิทธิ์ Admin เท่านั้น */}
            {isManageable && (
              <QuickActionCard
                loading={() => setLoading(true)}
                href="/editProgram"
                icon={<Settings className="text-slate-600" />}
                title="System Settings"
                description="Configuration for programs and accounts."
                colorClass="hover:border-slate-300"
              />
            )}
          </div>

          {/* Guest Restrict Banner */}
          {isGuest && (
            <div className="mt-12 p-8 bg-amber-50 border border-amber-100 rounded-[2rem] text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-4 text-amber-500">
                <Settings size={32} />
              </div>
              <h4 className="font-black text-amber-900 mb-2 uppercase tracking-widest text-sm">
                Restricted Access
              </h4>
              <p className="text-amber-700/70 text-sm max-w-md mx-auto leading-relaxed">
                Your account is currently set to <strong>Guest Mode</strong>.
                You can only view general documentation. To access analytics or
                charts, please contact the administrator for full privileges.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
