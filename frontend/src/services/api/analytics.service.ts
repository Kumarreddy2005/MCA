import { apiClient } from "./client";
import { Priority, ComplaintStatus } from "@/types/complaint";

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

export interface AnalyticsOverviewData {
  total: number;
  open: number;
  resolved: number;
  breached: number;
  escalated: number;
  resolutionRate: number;
  complianceRate: number;
  breachRate: number;
  avgResolutionHours: number;
  feedbackAverage: number;
}

export interface DepartmentPerformanceItem {
  department: string;
  code: string;
  total: number;
  resolved: number;
  open: number;
  breached: number;
  complianceRate: number;
  avgResolutionHours: number;
  grade: "A+" | "A" | "B" | "C" | "D";
}

export interface TrendItem {
  date: string;
  label: string;
  submitted: number;
  resolved: number;
}

export interface CategoryBreakdownData {
  byPriority: Record<Priority, number>;
  byCategory: Array<{ category: string; count: number; percentage: number }>;
  byStatus: Record<string, number>;
}

export interface GeoPoint {
  id: string;
  complaintNumber: string;
  title: string;
  department: string;
  priority: Priority;
  status: ComplaintStatus;
  latitude: number;
  longitude: number;
  district: string;
  village: string;
  ward?: string;
}

export interface GeoHotspot {
  locationKey: string;
  village: string;
  district: string;
  count: number;
  criticalCount: number;
  topDepartment: string;
  latitude: number;
  longitude: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
}

export interface DistrictScorecardItem {
  district: string;
  total: number;
  resolved: number;
  complianceRate: number;
  activeHotspots: number;
}

export interface GeographicIntelligenceData {
  points: GeoPoint[];
  hotspots: GeoHotspot[];
  districtScorecard: DistrictScorecardItem[];
}

export interface AiMetricsData {
  totalAnalyzed: number;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  duplicateCandidatesFound: number;
  autoRoutingConfidenceAverage: number;
  nlpEntitiesDetectedCount: number;
}

export interface ExecutiveReportData {
  generatedAt: string;
  reportingPeriod: string;
  overview: AnalyticsOverviewData;
  topBottlenecks: Array<{ department: string; openCount: number; breachRate: number }>;
  criticalHotspots: Array<{ village: string; district: string; count: number }>;
  strategicRecommendations: string[];
}

export const analyticsService = {
  async getOverview(params: {
    department?: string;
    district?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<AnalyticsOverviewData> {
    const query = new URLSearchParams();
    if (params.department && params.department !== "ALL") query.append("department", params.department);
    if (params.district && params.district !== "ALL") query.append("district", params.district);
    if (params.startDate) query.append("startDate", params.startDate);
    if (params.endDate) query.append("endDate", params.endDate);

    const res = await apiClient.get<ApiResponse<AnalyticsOverviewData>>(`/analytics/overview?${query.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch analytics overview");
    }
    return res.data.data;
  },

  async getDepartmentPerformance(params: {
    district?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<DepartmentPerformanceItem[]> {
    const query = new URLSearchParams();
    if (params.district && params.district !== "ALL") query.append("district", params.district);
    if (params.startDate) query.append("startDate", params.startDate);
    if (params.endDate) query.append("endDate", params.endDate);

    const res = await apiClient.get<ApiResponse<DepartmentPerformanceItem[]>>(
      `/analytics/departments?${query.toString()}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch department performance");
    }
    return res.data.data;
  },

  async getTrends(params: {
    department?: string;
    district?: string;
    interval?: "daily" | "weekly" | "monthly";
  } = {}): Promise<TrendItem[]> {
    const query = new URLSearchParams();
    if (params.department && params.department !== "ALL") query.append("department", params.department);
    if (params.district && params.district !== "ALL") query.append("district", params.district);
    if (params.interval) query.append("interval", params.interval);

    const res = await apiClient.get<ApiResponse<TrendItem[]>>(`/analytics/trends?${query.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch trends");
    }
    return res.data.data;
  },

  async getCategories(params: {
    department?: string;
    district?: string;
  } = {}): Promise<CategoryBreakdownData> {
    const query = new URLSearchParams();
    if (params.department && params.department !== "ALL") query.append("department", params.department);
    if (params.district && params.district !== "ALL") query.append("district", params.district);

    const res = await apiClient.get<ApiResponse<CategoryBreakdownData>>(`/analytics/categories?${query.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch category breakdown");
    }
    return res.data.data;
  },

  async getGeographicIntelligence(params: {
    department?: string;
    district?: string;
    priority?: string;
  } = {}): Promise<GeographicIntelligenceData> {
    const query = new URLSearchParams();
    if (params.department && params.department !== "ALL") query.append("department", params.department);
    if (params.district && params.district !== "ALL") query.append("district", params.district);
    if (params.priority && params.priority !== "ALL") query.append("priority", params.priority);

    const res = await apiClient.get<ApiResponse<GeographicIntelligenceData>>(`/analytics/geo?${query.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch geographic intelligence");
    }
    return res.data.data;
  },

  async getAiMetrics(): Promise<AiMetricsData> {
    const res = await apiClient.get<ApiResponse<AiMetricsData>>("/analytics/ai");
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch AI metrics");
    }
    return res.data.data;
  },

  async downloadCsv(params: {
    department?: string;
    district?: string;
    priority?: string;
    status?: string;
  } = {}): Promise<void> {
    const query = new URLSearchParams();
    if (params.department && params.department !== "ALL") query.append("department", params.department);
    if (params.district && params.district !== "ALL") query.append("district", params.district);
    if (params.priority && params.priority !== "ALL") query.append("priority", params.priority);
    if (params.status && params.status !== "ALL") query.append("status", params.status);

    const res = await apiClient.get(`/analytics/export/csv?${query.toString()}`, {
      responseType: "blob",
    });

    const blob = new Blob([res.data as BlobPart], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `vcgis_complaints_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async getExecutiveReport(params: {
    department?: string;
    district?: string;
  } = {}): Promise<ExecutiveReportData> {
    const query = new URLSearchParams();
    if (params.department && params.department !== "ALL") query.append("department", params.department);
    if (params.district && params.district !== "ALL") query.append("district", params.district);

    const res = await apiClient.get<ApiResponse<ExecutiveReportData>>(`/analytics/export/report?${query.toString()}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || "Failed to fetch executive report");
    }
    return res.data.data;
  },
};
