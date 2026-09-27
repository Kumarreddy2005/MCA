import { apiClient } from "./client";
import { IComplaint, ISlaAnalyticsData } from "@/types/complaint";

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

export interface SlaSweepResult {
  scannedCount: number;
  warningsDispatched: number;
  breachesDetected: number;
  escalationsTriggered: number;
  evaluatedAt: string;
}

export const slaService = {
  /**
   * 1. Fetch SLA Analytics (Compliance rates, breach rates, avg resolution time)
   */
  async getAnalytics(department?: string, district?: string): Promise<ISlaAnalyticsData> {
    const params = new URLSearchParams();
    if (department && department !== "ALL") params.append("department", department);
    if (district) params.append("district", district);

    const res = await apiClient.get<ApiResponse<ISlaAnalyticsData>>(`/sla/analytics?${params.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch SLA analytics");
    }
    return res.data.data;
  },

  /**
   * 2. Fetch At-Risk and Breached Complaints Queue
   */
  async getAtRiskAndBreachedQueue(params: {
    department?: string;
    tier?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<{ complaints: IComplaint[]; meta?: { page?: number; limit?: number; total?: number; totalPages?: number } }> {
    const query = new URLSearchParams();
    if (params.department && params.department !== "ALL") query.append("department", params.department);
    if (params.tier !== undefined) query.append("tier", String(params.tier));
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));

    const res = await apiClient.get<ApiResponse<{ complaints: IComplaint[] }>>(`/sla/queue?${query.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch SLA queue");
    }
    return {
      complaints: res.data.data.complaints || [],
      meta: res.data.meta,
    };
  },

  /**
   * 3. Trigger manual SLA evaluation and escalation sweep
   */
  async triggerSweep(): Promise<SlaSweepResult> {
    const res = await apiClient.post<ApiResponse<SlaSweepResult>>("/sla/sweep");
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to execute SLA monitoring sweep");
    }
    return res.data.data;
  },

  /**
   * 4. Manually escalate complaint tier
   */
  async escalateComplaint(id: string, targetLevel: number, reason: string): Promise<IComplaint> {
    const res = await apiClient.post<ApiResponse<IComplaint>>(`/sla/complaints/${id}/escalate`, {
      targetLevel,
      reason,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to escalate complaint");
    }
    return res.data.data;
  },
};
