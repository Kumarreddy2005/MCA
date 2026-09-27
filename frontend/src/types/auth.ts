export const UserRole = {
  CITIZEN: "CITIZEN",
  VOLUNTEER: "VOLUNTEER",
  OFFICIAL: "OFFICIAL",
  ADMIN: "ADMIN",
  DEPARTMENT_STAFF: "DEPARTMENT_STAFF",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

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
  departmentCode?: "ROAD" | "ELECTRICITY" | "WATER";
  designation: string;
  jurisdictionDistrict: string;
  jurisdictionTaluk?: string;
}

export interface AdminProfile {
  superAdmin: boolean;
  permissions: string[];
}

export interface DepartmentStaffProfile {
  departmentCode: "ROAD" | "ELECTRICITY" | "WATER";
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
  departmentStaffProfile?: DepartmentStaffProfile;
  createdAt: string;
  updatedAt: string;
}

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
  name?: string;
  village?: string;
  ward?: string;
  district?: string;
  pincode?: string;
}

export interface StaffLoginPayload {
  email: string;
  password: string;
}
