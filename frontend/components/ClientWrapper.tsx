"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import LoadingOverlay from "./LoadingOverlay";
import Navbar from "./Navbar";
import { useAuth } from "../app/context/AuthContext";

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const { isLoggedIn, initialized } = useAuth();

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [pathname]);

  // สมมติ: /dashboard ต้อง login, ส่วน / และ /about ไม่บังคับ
  const protectedRoutes = [
    "/editCourse",
    "/editProgram",
    "/manageAccount",
    "/viewChart",
  ];

  useEffect(() => {
    if (initialized && !isLoggedIn && protectedRoutes.includes(pathname)) {
      // Prevent infinite reloads by checking if already on /
      if (pathname !== "/") {
        // Reload the page and redirect to login
        window.location.replace("/");
      }
    }
  }, [initialized, isLoggedIn, pathname]);

  if (!initialized) return null;

  return (
    <div className="flex min-h-screen">
      {loading && <LoadingOverlay />}

      <aside className="w-52 min-h-screen bg-white shadow fixed top-0 left-0">
        <Navbar isLoggedIn={isLoggedIn} />
      </aside>

      <main className="flex-1 ml-52 p-6 bg-white overflow-x-auto">
        {children}
      </main>
    </div>
  );
}
