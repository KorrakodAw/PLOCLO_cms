import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useTranslation } from "react-i18next";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation("common");

  return (
    <div className="flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-3">
        <h2 className="text-2xl font-bold text-center mb-6 text-orange-500">
          {t("login")}
        </h2>

        <div className="flex flex-col justify-start items-start">
          <div className="mb-4 w-full">
            <label className="block text-left text-gray-700 font-medium mb-1">
              {t("email")}
            </label>
            <input
              type="email"
              placeholder={t("please input email")}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className="mb-4 w-full relative">
            <label className="block text-left text-gray-700 font-medium mb-1">
              {t("password")}
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("please input password")}
              className="w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-[38px] text-gray-600 hover:text-orange-400 focus:outline-none"
            >
              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </button>
          </div>
        </div>

        <button
          onClick={() => {}}
          className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition duration-200"
        >
          {t("sign in")}
        </button>
      </div>
    </div>
  );
}
