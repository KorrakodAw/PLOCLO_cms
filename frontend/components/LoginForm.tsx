"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../app/context/AuthContext";
import { apiClient } from "../utils/apiClient";
import { useTranslation } from "react-i18next";
import { useGlobalToast } from "@/app/context/ToastContext";
import axios from "axios";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import LoadingOverlay from "./LoadingOverlay";

export default function LoginForm() {
  const { t } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggedIn } = useAuth();
  const router = useRouter();
  const { showToast } = useGlobalToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (response: CredentialResponse) => {
    setIsLoading(true);
    try {
      // 1. ส่ง Google Credential ไปที่ Backend
      const res = await apiClient.post("users/auth/google/verify", {
        token: response.credential,
      });

      // 2. จัดการเมื่อ Login สำเร็จ
      if (res.data.token) {
        await login(res.data.token);
        showToast("Google Login Success!", "success");

        // ใช้ replace เพื่อป้องกันการกดย้อนกลับมาหน้า Login
        router.replace("/");
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err);

      // 3. 🛡️ จัดการ Error ตามรหัสสถานะ (Status Code) จาก Backend
      const statusCode = err.response?.status;

      const backendMessage = err.response?.data?.message;

      if (statusCode === 409) {
        // กรณี Username ซ้ำ (Duplicate Username)
        showToast(
          backendMessage || "Username already exists. Please contact admin.",
          "error",
        );
      } else if (statusCode === 400) {
        // กรณี Token มีปัญหา
        showToast("Invalid Google account session.", "error");
      } else if (statusCode === 500) {
        // กรณี Backend Crash
        showToast("Server error. Please try again later.", "error");
      } else {
        // กรณีอื่นๆ (เช่น Network พัง)
        showToast("Failed to authenticate with Google.", "error");
      }
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post("/users/login", { email, password });
      await login(res.data.token);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        showToast(err.response.data?.error || "Login failed", "error");
      } else {
        showToast("An unknown error occurred", "error");
      }
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      // Just use the standard login but with hidden guest credentials
      const res = await apiClient.post("/users/login", {
        email: "testGuest@gmail.com",
        password: "test123",
      });
      await login(res.data.token);

      router.replace("/");
    } catch {
      showToast("Guest login failed", "error");
    }
  };

  useEffect(() => {
    if (isLoggedIn) router.replace("/");
  }, [isLoggedIn, router]);

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen p-4">
      {isLoading && <LoadingOverlay />}
      <div className="w-full max-w-sm">
        <form
          className="w-full p-8 bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <h2 className="text-3xl font-light text-center text-orange-600 mb-10 tracking-tight">
            {t("login")}
          </h2>

          {/* Email Field */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
              {t("email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("enter_email")}
              required
              className="w-full px-5 py-3 border font-light border-gray-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all"
            />
          </div>

          {/* Password Field */}
          <div className="mb-8 relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
              {t("password")}
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("enter_password")}
              required
              className="w-full px-5 py-3 pr-12 border font-light border-gray-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all"
            />
            <button
              type="button"
              className="absolute right-4 top-[38px] text-gray-300 hover:text-orange-500 transition-colors"
              onClick={() => setShowPassword((p) => !p)}
            >
              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </button>
          </div>

          {/* Primary Action: Standard Login */}
          <button
            type="submit"
            className="w-full py-4 bg-orange-500 font-bold text-white rounded-2xl hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 mb-6"
          >
            {t("sign_in")}
          </button>

          {/* Secondary Action: Google Login */}
          <div className="flex justify-center w-full overflow-hidden mb-8">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => showToast("Google Login Failed", "error")}
              useOneTap
              theme="outline"
              shape="pill"
              width="320px"
            />
          </div>

          {/* 🟢 Guest Login Button (Inside the bottom of the card) */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-2.5 text-[11px] font-light text-gray-600 hover:text-orange-500 bg-transparent border border-gray-100 hover:border-orange-200 rounded-full transition-all uppercase tracking-[0.15em] shadow-sm hover:shadow-md"
            >
              {t("continue_as_guest")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
