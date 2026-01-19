"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation"; // 💡 Added useRouter
import LoadingOverlay from "./LoadingOverlay";
import Navbar from "./Navbar";
import { useAuth } from "../app/context/AuthContext";

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter(); // Initialize router
  const [loading, setLoading] = useState(false); // Global loading state
  const { isLoggedIn, initialized } = useAuth();

  // Keep track of the *previous* pathname to properly determine navigation end
  const [currentPath, setCurrentPath] = useState(pathname);

  useEffect(() => {
    // Only proceed if the pathname has definitively changed since the last render
    if (pathname !== currentPath) {
      setLoading(false);
      setCurrentPath(pathname);
    }
  }, [pathname, currentPath, setLoading]); // Ensure setLoading is in dependency array

  const protectedRoutes = [
    "/editCourse",
    "/editProgram",
    "/manageAccount",
    "/viewChart",
    "/manageUniversity",
  ];

  useEffect(() => {
    if (initialized && !isLoggedIn && protectedRoutes.includes(pathname)) {
      if (pathname !== "/") {
        // Use router.replace for client-side navigation (safer than window.location.replace)
        router.replace("/");
      }
    }
  }, [initialized, isLoggedIn, pathname, protectedRoutes, router]);

  if (!initialized) return null;

  return (
    <div className="flex min-h-screen">
      {loading && <LoadingOverlay />}
      <aside className="w-52 min-h-screen bg-white shadow fixed top-0 left-0">
        {/* 💡 PASS SETLOADING PROP */}
        <Navbar isLoggedIn={isLoggedIn} setLoading={setLoading} />
      </aside>

      <main className="flex-1 ml-52 p-6 bg-white overflow-x-auto">
        {children}
      </main>
    </div>
  );
}
