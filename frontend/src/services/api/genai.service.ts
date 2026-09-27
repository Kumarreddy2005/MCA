import { apiClient } from "./client";

export interface ICitizenAssistParams {
  query: string;
  complaintContext?: Record<string, unknown>;
  language?: string;
}

export interface ICitizenAssistResult {
  success?: boolean;
  reply_message: string;
  draft_title?: string;
  draft_description?: string;
  suggested_category?: string;
  suggested_department?: string;
  status_explanation?: string;
  next_steps?: string[];
}

export interface IVolunteerStructureParams {
  rawNotes: string;
  language?: string;
  villageContext?: string;
  talukContext?: string;
}

export interface IMissingChecklistItem {
  item: string;
  question: string;
  is_critical: boolean;
}

export interface IVolunteerStructureResult {
  success?: boolean;
  structured_title: string;
  structured_description: string;
  incident_summary: string;
  location_clues: string;
  observed_impact: string;
  detected_category: string;
  detected_department: string;
  recommended_priority: string;
  missing_info_checklist: IMissingChecklistItem[];
}

export interface IOfficialDraftParams {
  complaintNumber: string;
  title: string;
  category: string;
  department: string;
  actionType: "RESOLUTION" | "INSPECTION" | "REJECTION" | "TRANSFER";
  actionNotes?: string;
  citizenName?: string;
}

export interface IOfficialDraftResult {
  success?: boolean;
  formal_letter: string;
  sms_summary: string;
  inspection_checklist: string[];
  rejection_statutory_basis?: string;
}

export interface IAdminSummaryParams {
  timeWindowDays?: number;
  district?: string;
  department?: string;
  totalComplaints?: number;
  breachedCount?: number;
  resolvedCount?: number;
  pendingCount?: number;
  criticalCount?: number;
  topCategories?: string[];
}

export interface IAdminSummaryResult {
  success?: boolean;
  executive_summary: string;
  key_highlights: string[];
  identified_hotspots: string[];
  strategic_recommendations: string[];
}

export interface ITranslateResult {
  success?: boolean;
  translated_text: string;
  detected_source: string;
  target_language: string;
}

export const genAiService = {
  /**
   * Citizen Assistant: conversational drafting & timeline explanation
   */
  async assistCitizen(params: ICitizenAssistParams): Promise<ICitizenAssistResult> {
    const res = await apiClient.post("/genai/citizen/assist", params);
    return res.data.data;
  },

  /**
   * Volunteer Assistant: structure informal notes into 4-part petition
   */
  async structureVolunteerNotes(params: IVolunteerStructureParams): Promise<IVolunteerStructureResult> {
    const res = await apiClient.post("/genai/volunteer/structure", params);
    return res.data.data;
  },

  /**
   * Official Assistant: formal resolution notice, inspection steps, rejection justification
   */
  async draftOfficialResponse(params: IOfficialDraftParams): Promise<IOfficialDraftResult> {
    const res = await apiClient.post("/genai/official/draft-response", params);
    return res.data.data;
  },

  /**
   * Admin Assistant: operational executive summary
   */
  async generateAdminSummary(params: IAdminSummaryParams): Promise<IAdminSummaryResult> {
    const res = await apiClient.post("/genai/admin/summary", params);
    return res.data.data;
  },

  /**
   * Multilingual Translation helper
   */
  async translate(text: string, sourceLanguage = "auto", targetLanguage = "en"): Promise<ITranslateResult> {
    const res = await apiClient.post("/genai/translate", {
      text,
      sourceLanguage,
      targetLanguage,
    });
    return res.data.data;
  },
};
