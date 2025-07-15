"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LoadingOverlay from "./LoadingOverlay";
import Navbar from "./Navbar";

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      {loading && <LoadingOverlay />}

      {/* Sidebar */}
      <aside className="w-52 min-h-screen bg-white shadow fixed top-0 left-0">
        <Navbar />
      </aside>

      {/* Content Area */}
      <main className="flex-1 ml-52 p-6 bg-white overflow-x-auto">
        {children}
      </main>
    </div>
  );
}
