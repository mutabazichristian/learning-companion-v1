import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import api from "../api/axios";

interface AuthState {
  token: string | null;
  username: string;
  role: "teacher" | "student" | "";
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, role: "teacher" | "student") => Promise<void>;
  logout: () => void;
}

const defaultState: AuthContextValue = {
  token: null,
  username: "",
  role: "",
  login: async () => {},
  register: async () => {},
  logout: () => {},
};

const AuthContext = createContext<AuthContextValue>(defaultState);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [role, setRole] = useState<"teacher" | "student" | "">("");

  useEffect(() => {
    const saved = localStorage.getItem("learning_companion_user");
    if (saved) {
      const parsed = JSON.parse(saved);
      setToken(parsed.token);
      setUsername(parsed.username);
      setRole(parsed.role);
    }
  }, []);

  useEffect(() => {
    if (token && username && role) {
      localStorage.setItem(
        "learning_companion_user",
        JSON.stringify({ token, username, role })
      );
      localStorage.setItem("learning_companion_token", token);
    } else {
      localStorage.removeItem("learning_companion_user");
      localStorage.removeItem("learning_companion_token");
    }
  }, [token, username, role]);

  const login = async (username: string, password: string) => {
    const resp = await api.post("/auth/login", { username, password });
    const data = resp.data as { access_token: string; username: string; role: "teacher" | "student" };
    setToken(data.access_token);
    setUsername(data.username);
    setRole(data.role);
  };

  const register = async (username: string, password: string, role: "teacher" | "student") => {
    await api.post("/auth/register", { username, password, role });
  };

  const logout = () => {
    setToken(null);
    setUsername("");
    setRole("");
    localStorage.removeItem("learning_companion_user");
    localStorage.removeItem("learning_companion_token");
  };

  return (
    <AuthContext.Provider value={{ token, username, role, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
