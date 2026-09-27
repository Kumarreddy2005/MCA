import { apiClient } from "./client";
import { IUser, UserRole } from "@/types/auth";

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

export interface IAdminStats {
  users: {
    total: number;
    citizens: number;
    volunteers: number;
    officials: number;
    admins: number;
    active: number;
    inactive: number;
  };
  departments: {
    total: number;
    active: number;
  };
  complaints: {
    total: number;
    open: number;
    resolved: number;
    breached: number;
    escalated: number;
  };
  auditLogsTotal: number;
}

export interface IDepartmentCategory {
  name: string;
  subcategories: string[];
}

export interface ISlaConfig {
  criticalHours: number;
  highHours: number;
  mediumHours: number;
  lowHours: number;
}

export interface IDepartment {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  categories: IDepartmentCategory[];
  slaConfig: ISlaConfig;
  headOfDepartment?: {
    name?: string;
    designation?: string;
    email?: string;
    phone?: string;
  };
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAuditLog {
  id: string;
  entityType: "COMPLAINT" | "USER" | "DEPARTMENT" | "SYSTEM";
  entityId: string;
  complaintNumber?: string;
  action: string;
  actor: {
    id?: string;
    name: string;
    role: string;
    email?: string;
    phone?: string;
  };
  previousState?: string;
  newState?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface PaginatedResult<T> {
  total: number;
  page: number;
  totalPages: number;
  users?: T[];
  volunteers?: T[];
  officials?: T[];
  logs?: T[];
}

export interface CreateStaffPayload {
  name: string;
  email?: string;
  phone: string;
  password?: string;
  role: UserRole;
  citizenProfile?: Record<string, unknown>;
  volunteerProfile?: {
    volunteerId?: string;
    assignedVillage: string;
    assignedWard: string;
    assignedPanchayat?: string;
    district: string;
  };
  officialProfile?: {
    department: string;
    departmentCode?: "ROAD" | "ELECTRICITY" | "WATER";
    designation: string;
    jurisdictionDistrict: string;
    jurisdictionTaluk?: string;
  };
  adminProfile?: {
    superAdmin: boolean;
    permissions: string[];
  };
}

export const adminService = {
  /**
   * System-wide overview statistics
   */
  async getStats(): Promise<IAdminStats> {
    const res = await apiClient.get<ApiResponse<IAdminStats>>("/admin/stats");
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch admin stats");
    }
    return res.data.data;
  },

  /**
   * List users with pagination and filters
   */
  async listUsers(params: {
    role?: string;
    isActive?: boolean;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ users: IUser[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params.role && params.role !== "ALL") query.append("role", params.role);
    if (typeof params.isActive === "boolean") query.append("isActive", String(params.isActive));
    if (params.department && params.department !== "ALL") query.append("department", params.department);
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));

    const res = await apiClient.get<ApiResponse<{ users: IUser[]; total: number; page: number; totalPages: number }>>(
      `/admin/users?${query.toString()}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch users");
    }
    return res.data.data;
  },

  /**
   * Get single user by ID
   */
  async getUser(id: string): Promise<IUser> {
    const res = await apiClient.get<ApiResponse<IUser>>(`/admin/users/${id}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch user");
    }
    return res.data.data;
  },

  /**
   * Create or provision user
   */
  async createUser(payload: CreateStaffPayload): Promise<IUser> {
    const res = await apiClient.post<ApiResponse<IUser>>("/admin/users", payload);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to create user");
    }
    return res.data.data;
  },

  /**
   * Update user details or profile
   */
  async updateUser(id: string, payload: Partial<CreateStaffPayload>): Promise<IUser> {
    const res = await apiClient.patch<ApiResponse<IUser>>(`/admin/users/${id}`, payload);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to update user");
    }
    return res.data.data;
  },

  /**
   * Toggle user active/inactive status
   */
  async updateUserStatus(id: string, isActive: boolean): Promise<IUser> {
    const res = await apiClient.patch<ApiResponse<IUser>>(`/admin/users/${id}/status`, { isActive });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to update user status");
    }
    return res.data.data;
  },

  /**
   * List all departments
   */
  async listDepartments(): Promise<IDepartment[]> {
    const res = await apiClient.get<ApiResponse<IDepartment[]>>("/admin/departments");
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch departments");
    }
    return res.data.data;
  },

  /**
   * Update department SLA thresholds
   */
  async updateDepartmentSla(id: string, slaConfig: ISlaConfig): Promise<IDepartment> {
    const res = await apiClient.patch<ApiResponse<IDepartment>>(`/admin/departments/${id}/sla`, slaConfig);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to update department SLA");
    }
    return res.data.data;
  },

  /**
   * Update department info
   */
  async updateDepartment(id: string, payload: Partial<IDepartment>): Promise<IDepartment> {
    const res = await apiClient.patch<ApiResponse<IDepartment>>(`/admin/departments/${id}`, payload);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to update department");
    }
    return res.data.data;
  },

  /**
   * List volunteers with cluster jurisdictions
   */
  async listVolunteers(params: {
    district?: string;
    village?: string;
    ward?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    volunteers: Array<{
      user: IUser;
      totalComplaintsLogged: number;
      verifiedComplaintsCount: number;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.district) query.append("district", params.district);
    if (params.village) query.append("village", params.village);
    if (params.ward) query.append("ward", params.ward);
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));

    const res = await apiClient.get<
      ApiResponse<{
        volunteers: Array<{
          user: IUser;
          totalComplaintsLogged: number;
          verifiedComplaintsCount: number;
        }>;
        total: number;
        page: number;
        totalPages: number;
      }>
    >(`/admin/volunteers?${query.toString()}`);

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch volunteers");
    }
    return res.data.data;
  },

  /**
   * Reassign volunteer jurisdiction
   */
  async updateVolunteerJurisdiction(
    id: string,
    jurisdiction: {
      assignedVillage: string;
      assignedWard: string;
      assignedPanchayat?: string;
      district: string;
    }
  ): Promise<IUser> {
    const res = await apiClient.patch<ApiResponse<IUser>>(`/admin/volunteers/${id}/jurisdiction`, jurisdiction);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to update volunteer jurisdiction");
    }
    return res.data.data;
  },

  /**
   * List officials with assignments
   */
  async listOfficials(params: {
    department?: string;
    district?: string;
    taluk?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ officials: IUser[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params.department && params.department !== "ALL") query.append("department", params.department);
    if (params.district) query.append("district", params.district);
    if (params.taluk) query.append("taluk", params.taluk);
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));

    const res = await apiClient.get<ApiResponse<{ officials: IUser[]; total: number; page: number; totalPages: number }>>(
      `/admin/officials?${query.toString()}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch officials");
    }
    return res.data.data;
  },

  /**
   * Reassign official department and jurisdiction
   */
  async updateOfficialAssignment(
    id: string,
    assignment: {
      department: string;
      departmentCode?: "ROAD" | "ELECTRICITY" | "WATER";
      designation: string;
      jurisdictionDistrict: string;
      jurisdictionTaluk?: string;
    }
  ): Promise<IUser> {
    const res = await apiClient.patch<ApiResponse<IUser>>(`/admin/officials/${id}/assignment`, assignment);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to update official assignment");
    }
    return res.data.data;
  },

  /**
   * Cross-system audit log explorer
   */
  async listAuditLogs(params: {
    entityType?: string;
    action?: string;
    actorRole?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ logs: IAuditLog[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params.entityType && params.entityType !== "ALL") query.append("entityType", params.entityType);
    if (params.action && params.action !== "ALL") query.append("action", params.action);
    if (params.actorRole && params.actorRole !== "ALL") query.append("actorRole", params.actorRole);
    if (params.startDate) query.append("startDate", params.startDate);
    if (params.endDate) query.append("endDate", params.endDate);
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));

    const res = await apiClient.get<ApiResponse<{ logs: IAuditLog[]; total: number; page: number; totalPages: number }>>(
      `/admin/audit?${query.toString()}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch audit logs");
    }
    return res.data.data;
  },
};
