import React, { createContext, useEffect, useState } from "react";
import { authService } from "@/services/api/auth.service";
import { IUser, StaffLoginPayload, VerifyOtpPayload } from "@/types/auth";

export interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithOtp: (payload: VerifyOtpPayload) => Promise<IUser>;
  loginStaff: (payload: StaffLoginPayload) => Promise<IUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(() => {
    const savedUser = localStorage.getItem("vcgis_user");
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("vcgis_access_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem("vcgis_access_token");
      if (storedToken) {
        try {
          const freshUser = await authService.getCurrentUser();
          setUser(freshUser);
          localStorage.setItem("vcgis_user", JSON.stringify(freshUser));
        } catch {
          // Token expired or invalid
          setUser(null);
          setToken(null);
          localStorage.removeItem("vcgis_access_token");
          localStorage.removeItem("vcgis_user");
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  const loginWithOtp = async (payload: VerifyOtpPayload): Promise<IUser> => {
    setIsLoading(true);
    try {
      const data = await authService.verifyCitizenOtp(payload);
      setUser(data.user);
      setToken(data.accessToken);
      localStorage.setItem("vcgis_access_token", data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem("vcgis_refresh_token", data.refreshToken);
      }
      localStorage.setItem("vcgis_user", JSON.stringify(data.user));
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginStaff = async (payload: StaffLoginPayload): Promise<IUser> => {
    setIsLoading(true);
    try {
      const data = await authService.staffLogin(payload);
      setUser(data.user);
      setToken(data.accessToken);
      localStorage.setItem("vcgis_access_token", data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem("vcgis_refresh_token", data.refreshToken);
      }
      localStorage.setItem("vcgis_user", JSON.stringify(data.user));
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    const refreshToken = localStorage.getItem("vcgis_refresh_token") || undefined;
    await authService.logout(refreshToken);
    setUser(null);
    setToken(null);
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const freshUser = await authService.getCurrentUser();
      setUser(freshUser);
      localStorage.setItem("vcgis_user", JSON.stringify(freshUser));
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        loginWithOtp,
        loginStaff,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth } from "./useAuth";
