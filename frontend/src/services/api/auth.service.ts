import { apiClient } from "./client";
import {
  AuthResponseData,
  IUser,
  SendOtpPayload,
  StaffLoginPayload,
  VerifyOtpPayload,
} from "@/types/auth";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const authService = {
  /**
   * Send OTP to citizen mobile number
   */
  async sendCitizenOtp(payload: SendOtpPayload): Promise<{ phone: string; expiresIn: number; devOtpPreview?: string }> {
    const res = await apiClient.post<ApiResponse<{ phone: string; expiresIn: number; devOtpPreview?: string }>>(
      "/auth/citizen/send-otp",
      payload
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to send OTP");
    }
    return res.data.data;
  },

  /**
   * Verify Citizen OTP and log in
   */
  async verifyCitizenOtp(payload: VerifyOtpPayload): Promise<AuthResponseData> {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>("/auth/citizen/verify-otp", payload);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Invalid OTP");
    }
    return res.data.data;
  },

  /**
   * Staff login (Volunteer, Official, Admin) using email + password
   */
  async staffLogin(payload: StaffLoginPayload): Promise<AuthResponseData> {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>("/auth/staff/login", payload);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Invalid credentials");
    }
    return res.data.data;
  },

  /**
   * Fetch currently logged-in user profile
   */
  async getCurrentUser(): Promise<IUser> {
    const res = await apiClient.get<ApiResponse<{ user: IUser }>>("/auth/me");
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch user");
    }
    return res.data.data.user;
  },

  /**
   * Refresh session tokens
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>("/auth/refresh", {
      refreshToken,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error("Failed to refresh token");
    }
    return res.data.data;
  },

  /**
   * Logout user
   */
  async logout(refreshToken?: string): Promise<void> {
    try {
      await apiClient.post("/auth/logout", { refreshToken });
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem("vcgis_access_token");
      localStorage.removeItem("vcgis_refresh_token");
      localStorage.removeItem("vcgis_user");
    }
  },
};
