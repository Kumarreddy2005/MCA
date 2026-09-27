/**
 * VCGIS Shared Types
 *
 * These types define the contract between frontend and backend.
 * They must be kept in sync across both services.
 */

// ─── User Roles ──────────────────────────────────────────────
export const UserRole = {
  CITIZEN: "CITIZEN",
  VOLUNTEER: "VOLUNTEER",
  OFFICIAL: "OFFICIAL",
  ADMIN: "ADMIN",
  DEPARTMENT_STAFF: "DEPARTMENT_STAFF",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const DepartmentCode = {
  ROAD: "ROAD",
  ELECTRICITY: "ELECTRICITY",
  WATER: "WATER",
  UNCERTAIN: "UNCERTAIN",
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
} as const;
export type DepartmentCode = (typeof DepartmentCode)[keyof typeof DepartmentCode];

export const GovernmentDepartments = ["Roads & Transport", "Electricity & Power", "Water Supply"] as const;
export type GovernmentDepartment = (typeof GovernmentDepartments)[number];

// ─── Complaint Status ────────────────────────────────────────
export const ComplaintStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  VALIDATING: "VALIDATING",
  VERIFICATION_REQUIRED: "VERIFICATION_REQUIRED",
  VERIFIED: "VERIFIED",
  AI_ANALYSIS: "AI_ANALYSIS",
  ROUTING: "ROUTING",
  ASSIGNED: "ASSIGNED",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACTION_IN_PROGRESS: "ACTION_IN_PROGRESS",
  INFORMATION_REQUIRED: "INFORMATION_REQUIRED",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  REOPENED: "REOPENED",
  REJECTED: "REJECTED",
  DUPLICATE: "DUPLICATE",
  CANCELLED: "CANCELLED",
  ESCALATED: "ESCALATED",
  ON_HOLD: "ON_HOLD",
} as const;
export type ComplaintStatus = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];

// ─── Complaint Priority ──────────────────────────────────────
export const Priority = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

// ─── Complaint Source ────────────────────────────────────────
export const ComplaintSource = {
  CITIZEN_PORTAL: "CITIZEN_PORTAL",
  VOLUNTEER_ASSISTED: "VOLUNTEER_ASSISTED",
  ADMIN_CREATED: "ADMIN_CREATED",
} as const;
export type ComplaintSource = (typeof ComplaintSource)[keyof typeof ComplaintSource];

// ─── SLA Status ──────────────────────────────────────────────
export const SlaStatus = {
  ON_TRACK: "ON_TRACK",
  AT_RISK: "AT_RISK",
  BREACHED: "BREACHED",
  RESOLVED: "RESOLVED",
} as const;
export type SlaStatus = (typeof SlaStatus)[keyof typeof SlaStatus];

// ─── API Response ────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// ─── User Profile Models ─────────────────────────────────────
export interface CitizenProfile {
  address?: string;
  village?: string;
  ward?: string;
  district?: string;
  pincode?: string;
}

export interface VolunteerProfile {
  volunteerId: string;
  assignedVillage: string;
  assignedWard: string;
  assignedPanchayat?: string;
  district: string;
}

export interface OfficialProfile {
  department: string;
  departmentCode?: Exclude<DepartmentCode, "UNCERTAIN" | "OUT_OF_SCOPE">;
  designation: string;
  jurisdictionDistrict: string;
  jurisdictionTaluk?: string;
}

export interface AdminProfile {
  superAdmin: boolean;
  permissions: string[];
}

export interface IUser {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  citizenProfile?: CitizenProfile;
  volunteerProfile?: VolunteerProfile;
  officialProfile?: OfficialProfile;
  adminProfile?: AdminProfile;
  departmentStaffProfile?: { departmentCode: Exclude<DepartmentCode, "UNCERTAIN" | "OUT_OF_SCOPE"> };
  createdAt: string;
  updatedAt: string;
}

// ─── Auth Payloads & Responses ───────────────────────────────
export interface AuthResponseData {
  user: IUser;
  accessToken: string;
  refreshToken?: string;
}

export interface SendOtpPayload {
  phone: string;
  purpose?: "LOGIN" | "SIGNUP";
}

export interface VerifyOtpPayload {
  phone: string;
  otp: string;
  name?: string; // Optional for self-signup on first OTP verify
  village?: string;
  ward?: string;
  district?: string;
  pincode?: string;
}

export interface StaffLoginPayload {
  email: string;
  password: string;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "VOLUNTEER" | "OFFICIAL" | "DEPARTMENT_STAFF" | "ADMIN";
  volunteerProfile?: VolunteerProfile;
  officialProfile?: OfficialProfile;
  adminProfile?: AdminProfile;
}
