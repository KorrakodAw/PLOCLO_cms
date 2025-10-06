// components/ProtectedRoute.tsx
"use client";
import { useAuth } from "../app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const { user, isLoggedIn, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized) {
      if (!isLoggedIn) {
        router.replace("/");
      } else if (roles && !roles.includes(user?.role ?? "")) {
        router.replace("/403"); // หน้า forbidden
      }
    }
  }, [initialized, isLoggedIn, user, router, roles]);

  if (!initialized) return <p>Loading...</p>;

  return <>{children}</>;
}
