"use client";

import { useAuth } from "./context/AuthContext";
import LoginForm from "../components/LoginForm";

export default function HomePage() {
  const { isLoggedIn, user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      {!isLoggedIn ? (
        <>
          <h1 className="text-3xl font-bold mb-4">Please login first</h1>
          <LoginForm />
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-4">
            Welcome, {user?.username || "User"} 👋
          </h1>
          <p className="text-gray-600">You are logged in</p>
        </>
      )}
    </div>
  );
}
