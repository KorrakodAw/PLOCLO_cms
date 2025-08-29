import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useAuth } from "../app/context/AuthContext";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation("common");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoggedIn } = useAuth();
  const router = useRouter();

  const handleSubmit = () => {
    if (username === "admin" && password === "admin123") {
      login("dummy-token-123"); // ส่ง token แทน
    } else {
      alert("Username or Password is Incorrect");
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/");
    }
  }, [isLoggedIn, router]);

  return (
    <div className="flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-5">
        <h2 className="text-2xl font-bold text-center mb-6 text-orange-400">
          {t("login")}
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex flex-col justify-start items-start">
            <div className="mb-4 w-full">
              <label className="block text-left text-gray-700 font-medium mb-1">
                {t("email")}
              </label>
              <input
                type="text"
                placeholder={t("please input email")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                onChange={(e) => setUsername(e.target.value)}
                required
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
                onChange={(e) => setPassword(e.target.value)}
                required
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
            type="submit"
            className="w-full bg-orange-400 text-white py-2 rounded-lg hover:bg-orange-500 transition duration-200"
          >
            {t("sign in")}
          </button>
        </form>
      </div>
    </div>
  );
}
