import { apiClient } from "./client";
import {
  IComplaint,
  OfficialDashboardMetrics,
  OfficialQueueFilter,
  ResolveComplaintPayload,
  RejectComplaintPayload,
  TransferDepartmentPayload,
  EscalateComplaintPayload,
} from "@/types/complaint";

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

export const officialService = {
  /**
   * 1. Get Official Dashboard 7 KPI Metrics
   */
  async getMetrics(): Promise<OfficialDashboardMetrics> {
    const res = await apiClient.get<ApiResponse<OfficialDashboardMetrics>>("/officials/metrics");
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch official dashboard metrics");
    }
    return res.data.data;
  },

  /**
   * 2. Get Departmental Work Queue with filtering
   */
  async getWorkQueue(
    filter: OfficialQueueFilter = {}
  ): Promise<{ complaints: IComplaint[]; meta?: { page?: number; limit?: number; total?: number; totalPages?: number } }> {
    const params = new URLSearchParams();
    if (filter.assignedToMe !== undefined) params.append("assignedToMe", String(filter.assignedToMe));
    if (filter.status) params.append("status", filter.status);
    if (filter.priority) params.append("priority", filter.priority);
    if (filter.slaRisk !== undefined) params.append("slaRisk", String(filter.slaRisk));
    if (filter.taluk) params.append("taluk", filter.taluk);
    if (filter.village) params.append("village", filter.village);
    if (filter.search) params.append("search", filter.search);
    if (filter.page) params.append("page", String(filter.page));
    if (filter.limit) params.append("limit", String(filter.limit));

    const res = await apiClient.get<ApiResponse<{ complaints: IComplaint[] }>>(
      `/officials/queue?${params.toString()}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch official work queue");
    }
    return {
      complaints: res.data.data.complaints || [],
      meta: res.data.meta,
    };
  },

  /**
   * 3. Resolve Grievance with mandatory/recommended photo proof and resolution summary
   */
  async resolveComplaint(id: string, payload: ResolveComplaintPayload): Promise<IComplaint> {
    const formData = new FormData();
    formData.append("resolutionSummary", payload.resolutionSummary);
    if (payload.actionTaken) formData.append("actionTaken", payload.actionTaken);
    if (payload.contractorName) formData.append("contractorName", payload.contractorName);
    if (payload.materialsUsed) formData.append("materialsUsed", payload.materialsUsed);

    if (payload.photos && payload.photos.length > 0) {
      payload.photos.forEach((file) => {
        formData.append("photos", file);
      });
    }

    const res = await apiClient.post<ApiResponse<IComplaint>>(
      `/officials/complaints/${id}/resolve`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to resolve complaint");
    }
    return res.data.data;
  },

  /**
   * 4. Reject Grievance with formal administrative justification
   */
  async rejectComplaint(id: string, payload: RejectComplaintPayload): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>(
      `/officials/complaints/${id}/reject`,
      payload
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to reject complaint");
    }
    return res.data.data;
  },

  /**
   * 5. Transfer Grievance to another department with justification
   */
  async transferDepartment(id: string, payload: TransferDepartmentPayload): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>(
      `/officials/complaints/${id}/transfer`,
      payload
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to transfer complaint");
    }
    return res.data.data;
  },

  /**
   * 6. Escalate Grievance to higher authority with justification
   */
  async escalateComplaint(id: string, payload: EscalateComplaintPayload): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>(
      `/officials/complaints/${id}/escalate`,
      payload
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to escalate complaint");
    }
    return res.data.data;
  },
};
