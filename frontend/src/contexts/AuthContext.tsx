import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, setToken, getToken } from "@/lib/api";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  clinicId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => void;
  register: (data: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const DEMO_USER: User = {
  id: "demo-user-001",
  firstName: "María",
  lastName: "González",
  email: "maria@clinicagonzalez.com",
  clinicId: "demo-clinic-001",
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check for demo mode first
    if (sessionStorage.getItem("demo_mode") === "true") {
      setUser(DEMO_USER);
      setIsDemoMode(true);
      setIsLoading(false);
      return;
    }

    const token = getToken();
    if (token) {
      api.get<User>("/auth/profile")
        .then((res) => setUser(res.data ?? null))
        .catch(() => {
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: User }>("/auth/login", { email, password });
    if (res.data) {
      setToken(res.data.accessToken);
      setUser(res.data.user);
    }
  }, []);

  const loginDemo = useCallback(() => {
    sessionStorage.setItem("demo_mode", "true");
    setIsDemoMode(true);
    setUser(DEMO_USER);
  }, []);

  const register = useCallback(async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    await api.post("/auth/register", data);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("demo_mode");
    setIsDemoMode(false);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, isDemoMode, login, loginDemo, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
