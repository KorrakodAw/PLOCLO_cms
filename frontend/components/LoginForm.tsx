"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../app/context/AuthContext";
import { apiClient } from "../utils/apiClient"; // Ensure this is your Axios instance
import { useTranslation } from "react-i18next";
import { useToast } from "../components/Toast";
import axios from "axios"; // Import axios to check isAxiosError

export default function LoginForm() {
  const { t } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggedIn } = useAuth();
  const router = useRouter();

  const { showToast, ToastElement } = useToast();

  const handleSubmit = async () => {
    try {
      // Axios handles JSON.stringify and Content-Type automatically
      const res = await apiClient.post("/users/login", {
        email,
        password,
      });

      // Access data directly
      login(res.data.token);
    } catch (err) {
      if (err instanceof Error) {
        if (axios.isAxiosError(err) && err.response) {
          // Axios error with response
          const errorMessage =
            err.response.data?.error || "Login failed. Please try again.";
          showToast(errorMessage, "error");
        } else {
          // General error
          showToast(err.message, "error");
        }
      } else {
        showToast("An unknown error occurred during login.", "error");
      }
    }
  };

  useEffect(() => {
    if (isLoggedIn) router.replace("/");
  }, [isLoggedIn, router]);

  return (
    <form
      // Form Container: Increased shadow and rounded corners for a softer look
      className="w-full max-w-sm mx-auto p-8 bg-white rounded-3xl shadow-xl border border-gray-100"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <h2 className="text-3xl font-extrabold text-center text-orange-600 mb-8">
        {t("login")}
      </h2>

      {/* Email Input Group */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("email")}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("enter_email")}
          required
          // Input Style: Cleaner border, focus ring in primary color
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl transition-colors duration-150 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
        />
      </div>

      {/* Password Input Group */}
      <div className="mb-8 relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("password")}
        </label>
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("enter_password")}
          required
          // Input Style: Cleaner border, focus ring, increased right padding for icon
          className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-xl transition-colors duration-150 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
        />

        {/* Password Toggle Button */}
        <button
          type="button"
          // Positioning: Adjusted top value to align perfectly with the input padding
          className="absolute right-3 top-[37px] text-gray-400 hover:text-orange-500 transition-colors"
          onClick={() => setShowPassword((p) => !p)}
        >
          {/* Assuming FaEyeSlash and FaEye are correctly imported */}
          {showPassword ? (
            <FaEyeSlash className="h-5 w-5" />
          ) : (
            <FaEye className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        // Button Style: Stronger color, more padding, shadow for depth
        className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-md hover:shadow-lg cursor-pointer"
      >
        {t("sign_in")}
      </button>

      <ToastElement />
    </form>
  );
}
