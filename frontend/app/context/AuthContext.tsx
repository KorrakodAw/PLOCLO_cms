"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../utils/apiClient";

interface User {
  id: number;
  username: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string) {
  try {
    const base64Payload = token.split(".")[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | "">("");
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  const login = async (newToken: string) => {
    setToken(newToken);

    try {
      const res = await apiClient("/api/users/me", {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
      logout();
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    router.replace("/");
  };

  useEffect(() => {
    // load token from localStorage if exists
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      setInitialized(true);
      return;
    }

    const payload = parseJwt(storedToken);
    if (!payload || payload.exp * 1000 < Date.now()) {
      // token expired
      logout();
      setInitialized(true);
      return;
    }

    setToken(storedToken);

    const fetchUser = async () => {
      try {
        const res = await apiClient("/api/users/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err);
        logout();
      } finally {
        setInitialized(true);
      }
    };

    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // save token in localStorage whenever it changes
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isLoggedIn: !!token, initialized }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
