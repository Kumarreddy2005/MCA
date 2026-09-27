import { apiClient } from "./client";
import { ComplaintStats, IAuditLog, IComplaint } from "@/types/complaint";

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

export const complaintService = {
  /**
   * Get available government departments and categories
   */
  async getCategories(): Promise<string[]> {
    const res = await apiClient.get<ApiResponse<{ departments: string[] }>>("/complaints/categories");
    return res.data.data?.departments || [];
  },

  /**
   * Submit a new grievance with optional evidence files
   */
  async submitComplaint(formData: FormData): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>("/complaints", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to submit grievance");
    }
    return res.data.data;
  },

  /**
   * Get complaints submitted by currently logged in citizen
   */
  async getMyComplaints(
    status?: string,
    search?: string,
    page = 1
  ): Promise<{ complaints: IComplaint[]; stats: ComplaintStats; total: number }> {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.append("status", status);
    if (search) params.append("search", search);
    params.append("page", page.toString());

    const res = await apiClient.get<ApiResponse<{ complaints: IComplaint[]; stats: ComplaintStats }>>(
      `/complaints/my?${params.toString()}`
    );

    return {
      complaints: res.data.data?.complaints || [],
      stats: res.data.data?.stats || { total: 0, active: 0, resolved: 0, pending: 0 },
      total: res.data.meta?.total || 0,
    };
  },

  /**
   * Get full details of a complaint by ID
   */
  async getComplaintById(id: string): Promise<IComplaint> {
    const res = await apiClient.get<ApiResponse<IComplaint>>(`/complaints/${id}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Grievance not found");
    }
    return res.data.data;
  },

  /**
   * Citizen satisfaction feedback
   */
  async submitFeedback(id: string, rating: number, comment?: string): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>(`/complaints/${id}/feedback`, {
      rating,
      comment,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to submit feedback");
    }
    return res.data.data;
  },

  /**
   * Reopen a closed or resolved complaint
   */
  async reopenComplaint(id: string, reason: string): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>(`/complaints/${id}/reopen`, {
      reason,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to reopen grievance");
    }
    return res.data.data;
  },

  /**
   * Transition complaint status via Lifecycle Engine (Official/Admin)
   */
  async transitionStatus(
    id: string,
    payload: {
      status: string;
      remarks?: string;
      resolutionSummary?: string;
      rejectionReason?: string;
      informationQuery?: string;
      informationResponse?: string;
    }
  ): Promise<IComplaint> {
    const res = await apiClient.patch<ApiResponse<IComplaint>>(`/complaints/${id}/status`, payload);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to update complaint status");
    }
    return res.data.data;
  },

  /**
   * Assign or reassign official (Admin / Senior Official)
   */
  async assignOfficial(id: string, officialId: string, reason?: string): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>(`/complaints/${id}/assign`, {
      officialId,
      reason,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to assign official");
    }
    return res.data.data;
  },

  /**
   * Record formal official action or internal note
   */
  async recordAction(
    id: string,
    actionType: string,
    remarks: string,
    isInternalOnly = false
  ): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>(`/complaints/${id}/actions`, {
      actionType,
      remarks,
      isInternalOnly,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to record action");
    }
    return res.data.data;
  },

  /**
   * Respond to information requested
   */
  async respondToInformation(id: string, response: string): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>(`/complaints/${id}/respond-info`, {
      response,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to submit clarification");
    }
    return res.data.data;
  },

  /**
   * Fetch immutable audit trail
   */
  async getAuditTrail(id: string): Promise<IAuditLog[]> {
    const res = await apiClient.get<ApiResponse<IAuditLog[]>>(`/complaints/${id}/audit-trail`);
    return res.data.data || [];
  },

  /**
   * Query all complaints (Officials / Admins)
   */
  async getAllComplaints(filters: Record<string, string | number | boolean> = {}): Promise<{
    complaints: IComplaint[];
    total: number;
  }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== "ALL") {
        params.append(k, String(v));
      }
    });

    const res = await apiClient.get<ApiResponse<{ complaints: IComplaint[] }>>(
      `/complaints?${params.toString()}`
    );
    return {
      complaints: res.data.data?.complaints || [],
      total: res.data.meta?.total || 0,
    };
  },
};
