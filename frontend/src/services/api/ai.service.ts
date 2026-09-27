import { apiClient } from "./client";
import { IAiAnalysis } from "@/types/complaint";

export interface IAnalyzeComplaintParams {
  title: string;
  description: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  village?: string;
  taluk?: string;
  district?: string;
  documentBase64?: string;
  documentMimeType?: string;
}

export const aiService = {
  /**
   * Get AI service health status
   */
  async getHealth(): Promise<{ aiMicroserviceAvailable: boolean; mode: string }> {
    const res = await apiClient.get("/ai/health");
    return res.data.data;
  },

  /**
   * Run complete AI analysis on complaint draft
   */
  async analyzeComplaint(params: IAnalyzeComplaintParams): Promise<IAiAnalysis> {
    const res = await apiClient.post("/ai/analyze", params);
    return res.data.data;
  },

  /**
   * Classify grievance department
   */
  async classifyDepartment(title: string, description: string, selectedCategory?: string) {
    const res = await apiClient.post("/ai/classify", {
      title,
      description,
      selectedCategory,
    });
    return res.data.data;
  },

  /**
   * Evaluate priority & urgency score
   */
  async evaluatePriority(title: string, description: string, category?: string) {
    const res = await apiClient.post("/ai/priority", {
      title,
      description,
      category,
    });
    return res.data.data;
  },

  /**
   * Extract text via OCR
   */
  async extractOcr(payload: { fileBase64?: string; mimeType?: string; textContent?: string }) {
    const res = await apiClient.post("/ai/ocr", payload);
    return res.data.data;
  },

  /**
   * Check for duplicate complaints
   */
  async checkDuplicates(params: {
    title: string;
    description: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    village?: string;
    taluk?: string;
    district?: string;
  }) {
    const res = await apiClient.post("/ai/duplicates", params);
    return res.data.data;
  },
};
