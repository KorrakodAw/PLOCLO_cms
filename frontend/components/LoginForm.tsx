"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../app/context/AuthContext";
import { apiClient } from "../utils/apiClient";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggedIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      const res = await apiClient("/api/users/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Login failed");
        return;
      }
      const data = await res.json();
      login(data.token);
    } catch (err) {
      console.error(err);
      alert("Cannot reach backend. Check server.");
    }
  };

  useEffect(() => {
    if (isLoggedIn) router.replace("/");
  }, [isLoggedIn, router]);

  return (
    <form
      className="max-w-md mx-auto p-5 bg-white rounded-2xl shadow-lg"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <h2 className="text-2xl font-bold text-center text-orange-400 mb-6">
        Login
      </h2>

      <div className="mb-4">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email"
          required
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      <div className="mb-4 relative">
        <label>Password</label>
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
          className="w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          type="button"
          className="absolute right-3 top-[38px]"
          onClick={() => setShowPassword((p) => !p)}
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      <button
        type="submit"
        className="w-full py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition"
      >
        Sign in
      </button>
    </form>
  );
}
