import { apiClient } from "./client";
import { IUser } from "@/types/auth";
import { IComplaint, VolunteerWorkQueueStats } from "@/types/complaint";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface RegisterCitizenPayload {
  name: string;
  phone: string;
  village: string;
  ward?: string;
  mandal?: string;
  district: string;
  pincode?: string;
  address?: string;
}

export interface WorkQueueFilter {
  tab?: "all" | "verifications" | "cluster";
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AssistantDraftResponse {
  title: string;
  formalDescription: string;
  suggestedCategory: string;
  suggestedDepartment: string;
  suggestedPriority: string;
  missingInformation: string[];
  suggestedQuestions: string[];
}

export const volunteerService = {
  /**
   * 1. Register a rural citizen assisted by the volunteer
   */
  async registerCitizen(payload: RegisterCitizenPayload): Promise<IUser> {
    const res = await apiClient.post<ApiResponse<IUser>>("/volunteers/citizens", payload);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to register citizen");
    }
    return res.data.data;
  },

  /**
   * 2. Search registered citizens in volunteer cluster
   */
  async searchCitizens(query?: string): Promise<IUser[]> {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    const res = await apiClient.get<ApiResponse<IUser[]>>(`/volunteers/citizens?${params.toString()}`);
    return res.data.data || [];
  },

  /**
   * 3. File assisted complaint on behalf of a citizen
   */
  async fileAssistedComplaint(formData: FormData): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>("/volunteers/complaints", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to file assisted grievance");
    }
    return res.data.data;
  },

  /**
   * 4. Get volunteer work queue with cluster KPI stats
   */
  async getWorkQueue(
    filters: WorkQueueFilter = {}
  ): Promise<{
    complaints: IComplaint[];
    stats: VolunteerWorkQueueStats;
    total: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (filters.tab && filters.tab !== "all") params.append("tab", filters.tab);
    if (filters.status && filters.status !== "ALL") params.append("status", filters.status);
    if (filters.priority && filters.priority !== "ALL") params.append("priority", filters.priority);
    if (filters.search) params.append("search", filters.search);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());

    const res = await apiClient.get<
      ApiResponse<{
        complaints: IComplaint[];
        stats: VolunteerWorkQueueStats;
        pagination: { total: number; totalPages: number };
      }>
    >(`/volunteers/work-queue?${params.toString()}`);

    const data = res.data.data;
    return {
      complaints: data?.complaints || [],
      stats:
        data?.stats || {
          totalCluster: 0,
          pendingVerification: 0,
          verifiedCount: 0,
          resolvedCount: 0,
          urgentCount: 0,
          registeredCitizens: 0,
          assignedVillage: "",
          assignedWard: "",
        },
      total: data?.pagination?.total || 0,
      totalPages: data?.pagination?.totalPages || 1,
    };
  },

  /**
   * 5. Submit on-site field verification
   */
  async submitFieldVerification(complaintId: string, formData: FormData): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>(
      `/volunteers/complaints/${complaintId}/verify`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to record field verification");
    }
    return res.data.data;
  },

  /**
   * 6. Volunteer AI Assistant helper to structure informal verbal statements
   */
  async getAiAssistantDraft(citizenStatement: string, village?: string): Promise<AssistantDraftResponse> {
    const res = await apiClient.post<ApiResponse<AssistantDraftResponse>>("/volunteers/assistant", {
      citizenStatement,
      village,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to generate structured draft");
    }
    return res.data.data;
  },
};
