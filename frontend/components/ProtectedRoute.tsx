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

  const isAuthorized =
    isLoggedIn && (!roles || roles.includes(user?.role ?? ""));

  useEffect(() => {
    if (!initialized) return;

    if (!isLoggedIn) {
      window.location.replace("/");
    } else if (roles && !roles.includes(user?.role ?? "")) {
      router.replace("/403");
    }
  }, [initialized, isLoggedIn, user, roles, router]);

  if (!initialized) return <p>Loading...</p>;

  if (!isAuthorized) return null;

  return <>{children}</>;
}
