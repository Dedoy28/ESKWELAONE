import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/axios"; 

export type UserRole = "admin" | "registrar" | "teacher" | "nurse" | "guidance_counselor";

interface User {
  id: string; 
  name: string;
  email: string;
  role: UserRole;
  studentId?: string; 
  section?: string;   
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null; // ⭐️ --- 1. ADD accessToken TO THE TYPE ---
  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null); // ⭐️ --- 2. ADD STATE FOR THE TOKEN ---
  const [isLoading, setIsLoading] = useState(true);

  // Restore user session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("user_data");
    const token = localStorage.getItem("access_token");

    if (savedUser && token) {
      try {
        const parsedUser: User = JSON.parse(savedUser); 
        if (parsedUser && parsedUser.id && parsedUser.role) {
          setUser(parsedUser);
          setAccessToken(token); // ⭐️ --- 3. SET THE TOKEN STATE HERE ---
          console.log("User restored from localStorage:", parsedUser);
        } else {
          console.warn("Invalid user data in localStorage, clearing session.");
          localStorage.removeItem("user_data");
          localStorage.removeItem("user_role");
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      } catch (e) {
        console.error("Failed to parse saved user data:", e);
        localStorage.removeItem("user_data");
        localStorage.removeItem("user_role");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
    } else {
      console.log("No saved user session found in localStorage.");
    }
    setIsLoading(false);
  }, []);

  // Login
  const login = async (credentials: {
    email: string;
    password: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await api.post("/login/", credentials);
      const data = response.data; 

      console.log("Login API Response Data:", data);

      const loggedUser: User = {
        id: data.id, 
        name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.username,
        email: data.email, 
        role: data.role as UserRole,
        studentId: data.student_id,
        section: data.section,
      };

      if (!loggedUser.id || !loggedUser.role) {
        console.error("Incomplete user data received from login API:", data);
        throw new Error("Incomplete user data received from login.");
      }

      console.log("Constructed loggedUser object:", loggedUser);

      setUser(loggedUser);
      setAccessToken(data.access); // ⭐️ --- 3. SET THE TOKEN STATE HERE ---

      localStorage.setItem("user_data", JSON.stringify(loggedUser));
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("user_role", loggedUser.role);

      setIsLoading(false);
      return true;
    } catch (error: any) { 
      console.error("Login failed:", error);
      if (error.response) {
        console.error("Login API Error Response:", error.response.data);
      } else if (error.request) {
        console.error("Login request error (no response):", error.request);
      } else {
        console.error("Login setup error:", error.message);
      }

      setIsLoading(false);
      localStorage.removeItem("user_data");
      localStorage.removeItem("user_role");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return false;
    }
  };

  // Logout
  const logout = () => {
    setUser(null);
    setAccessToken(null); // ⭐️ --- 3. CLEAR THE TOKEN STATE HERE ---
    localStorage.removeItem("user_data");
    localStorage.removeItem("user_role");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    console.log("User logged out, session cleared.");
  };

  return (
    <AuthContext.Provider 
      value={{ user, accessToken, login, logout, isLoading }} // ⭐️ --- 4. PASS THE TOKEN IN THE VALUE ---
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};