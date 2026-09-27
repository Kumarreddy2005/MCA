import { IAiAnalysis, Priority } from "../types/domain.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000/api/ai";

export interface IAnalyzeComplaintPayload {
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
  existingComplaints?: Array<{
    id: string;
    complaint_number: string;
    title: string;
    description: string;
    category?: string;
    status?: string;
    latitude?: number;
    longitude?: number;
    village?: string;
    taluk?: string;
  }>;
}

export class AiService {
  private static instance: AiService;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = AI_SERVICE_URL;
  }

  public static getInstance(): AiService {
    if (!AiService.instance) {
      AiService.instance = new AiService();
    }
    return AiService.instance;
  }

  /**
   * Health check for AI service
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const healthUrl = this.baseUrl.replace(/\/api\/ai\/?$/, "/health");
      const res = await fetch(healthUrl, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { success?: boolean };
      return data?.success === true;
    } catch {
      return false;
    }
  }

  /**
   * Complete unified complaint analysis
   */
  public async analyzeComplaint(payload: IAnalyzeComplaintPayload): Promise<IAiAnalysis> {
    try {
      const res = await fetch(`${this.baseUrl}/analyze-complaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          category: payload.category,
          latitude: payload.latitude,
          longitude: payload.longitude,
          village: payload.village,
          taluk: payload.taluk,
          district: payload.district,
          document_base64: payload.documentBase64,
          document_mime_type: payload.documentMimeType,
          existing_complaints: payload.existingComplaints || [],
        }),
        signal: AbortSignal.timeout(7000),
      });

      if (!res.ok) {
        throw new Error(`AI service returned ${res.status}`);
      }

      const d = (await res.json()) as Record<string, Record<string, unknown>>;
      const classification = d.classification as Record<string, unknown> | undefined;
      const priorityObj = d.priority as Record<string, unknown> | undefined;
      const nlpObj = d.nlp as Record<string, unknown> | undefined;
      const summaryObj = d.summary as Record<string, unknown> | undefined;
      const similarityObj = d.similarity as Record<string, unknown> | undefined;
      const ocrObj = d.ocr as Record<string, unknown> | undefined;

      const rawMatches = Array.isArray(similarityObj?.matches) ? similarityObj.matches : [];

      const analysis: IAiAnalysis = {
        departmentRecommendation: {
          department: (classification?.primary_department as string) || payload.category || "Rural Development & Panchayat Raj",
          confidence: typeof classification?.confidence === "number" ? classification.confidence : 0.85,
          subCategory: classification?.sub_category as string | undefined,
          alternatives: Array.isArray(classification?.alternative_departments)
            ? (classification.alternative_departments as Array<{ department: string; confidence: number }>)
            : [],
        },
        priorityRecommendation: {
          priority: ((priorityObj?.suggested_priority as Priority) || Priority.MEDIUM),
          urgencyScore: typeof priorityObj?.urgency_score === "number" ? priorityObj.urgency_score : 50,
          reasoning: Array.isArray(priorityObj?.reasoning) ? (priorityObj.reasoning as string[]) : [],
          safetyFactors: Array.isArray(priorityObj?.safety_factors) ? (priorityObj.safety_factors as string[]) : [],
        },
        nlp: {
          intent: (nlpObj?.intent as string) || "SERVICE_DISRUPTION",
          entities: Array.isArray(nlpObj?.entities) ? (nlpObj.entities as Array<{ text: string; type: string }>) : [],
          urgencyIndicators: Array.isArray(nlpObj?.urgency_indicators) ? (nlpObj.urgency_indicators as string[]) : [],
          keywords: Array.isArray(nlpObj?.keywords) ? (nlpObj.keywords as string[]) : [],
          detectedLanguage: (nlpObj?.detected_language as string) || "en",
        },
        summary: {
          summary: (summaryObj?.summary as string) || `${payload.title}: ${payload.description.slice(0, 200)}`,
          keyPoints: Array.isArray(summaryObj?.key_points) ? (summaryObj.key_points as string[]) : [payload.title],
        },
        duplicateCheck: {
          isDuplicateCandidate: Boolean(similarityObj?.is_duplicate_candidate),
          highestScore: typeof similarityObj?.highest_similarity_score === "number" ? similarityObj.highest_similarity_score : 0.0,
          matchCount: typeof similarityObj?.match_count === "number" ? similarityObj.match_count : 0,
          matches: (rawMatches as Array<Record<string, unknown>>).map((m) => ({
            complaintId: String(m.id || ""),
            complaintNumber: String(m.complaint_number || ""),
            title: String(m.title || ""),
            similarityScore: Number(m.similarity_score || 0),
            matchReasons: Array.isArray(m.match_reasons) ? (m.match_reasons as string[]) : [],
          })),
        },
        ocr: ocrObj
          ? {
              extractedText: String(ocrObj.extracted_text || ""),
              confidence: typeof ocrObj.confidence === "number" ? ocrObj.confidence : 0.8,
              isLowConfidence: Boolean(ocrObj.is_low_confidence),
              pageCount: typeof ocrObj.page_count === "number" ? ocrObj.page_count : 1,
              language: typeof ocrObj.language === "string" ? ocrObj.language : "en",
            }
          : undefined,
        analyzedAt: new Date().toISOString(),
      };

      return analysis;
    } catch {
      return this.fallbackAnalyze(payload);
    }
  }

  /**
   * Department classification
   */
  public async classifyDepartment(title: string, description: string, selectedCategory?: string) {
    try {
      const res = await fetch(`${this.baseUrl}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          selected_category: selectedCategory,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) throw new Error(`AI service status ${res.status}`);
      return await res.json();
    } catch {
      return {
        success: true,
        primary_department: selectedCategory || "Rural Development & Panchayat Raj",
        confidence: 0.70,
        sub_category: "Civic Maintenance",
        alternative_departments: [
          { department: "Public Works Department", confidence: 0.20 },
          { department: "Revenue Department", confidence: 0.15 },
        ],
      };
    }
  }

  /**
   * Urgency & priority scoring
   */
  public async evaluatePriority(title: string, description: string, category?: string) {
    try {
      const res = await fetch(`${this.baseUrl}/priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) throw new Error(`AI service status ${res.status}`);
      return await res.json();
    } catch {
      const full = `${title} ${description}`.toLowerCase();
      let priority: Priority = Priority.MEDIUM;
      let score = 50;
      const reasons: string[] = [];
      const safetyFactors: string[] = [];

      if (/live wire|sparking|shock|collapse|flood|hazard|fatal|toxic/.test(full)) {
        priority = Priority.CRITICAL;
        score = 90;
        safetyFactors.push("Severe hazard detected by fallback heuristics");
        reasons.push("Fallback urgency detected potential life safety hazard");
      } else if (/no water|burst|blackout|ambulance|sewage/.test(full)) {
        priority = Priority.HIGH;
        score = 75;
        reasons.push("Fallback urgency detected major public service disruption");
      }

      return {
        success: true,
        suggested_priority: priority,
        urgency_score: score,
        reasoning: reasons,
        safety_factors: safetyFactors,
      };
    }
  }

  /**
   * Detect duplicates against candidate complaints
   */
  public async detectDuplicates(payload: {
    title: string;
    description: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    village?: string;
    taluk?: string;
    existingComplaints: Array<Record<string, unknown>>;
    threshold?: number;
  }) {
    try {
      const res = await fetch(`${this.baseUrl}/similarity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          category: payload.category,
          latitude: payload.latitude,
          longitude: payload.longitude,
          village: payload.village,
          taluk: payload.taluk,
          existing_complaints: payload.existingComplaints,
          threshold: payload.threshold ?? 0.65,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) throw new Error(`AI service status ${res.status}`);
      return await res.json();
    } catch {
      return {
        success: true,
        is_duplicate_candidate: false,
        highest_similarity_score: 0.0,
        match_count: 0,
        matches: [],
      };
    }
  }

  /**
   * OCR document parsing
   */
  public async extractOcr(payload: { fileBase64?: string; mimeType?: string; textContent?: string }) {
    try {
      const res = await fetch(`${this.baseUrl}/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_base64: payload.fileBase64,
          mime_type: payload.mimeType || "application/pdf",
          text_content: payload.textContent,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) throw new Error(`AI service status ${res.status}`);
      return await res.json();
    } catch {
      return {
        success: true,
        extracted_text: payload.textContent || "[Document received. Awaiting review.]",
        confidence: 0.70,
        is_low_confidence: false,
        page_count: 1,
        language: "en",
        metadata: { fallback: true },
      };
    }
  }

  /**
   * Deterministic fallback if microservice is temporarily unavailable
   */
  private fallbackAnalyze(payload: IAnalyzeComplaintPayload): IAiAnalysis {
    const full = `${payload.title} ${payload.description}`.toLowerCase();
    let priority: Priority = Priority.MEDIUM;
    let score = 50;
    const safety: string[] = [];

    if (/live wire|sparking|shock|collapse|flood|fatal|toxic/.test(full)) {
      priority = Priority.CRITICAL;
      score = 90;
      safety.push("Potential life hazard");
    } else if (/no water|pipeline burst|blackout|ambulance/.test(full)) {
      priority = Priority.HIGH;
      score = 75;
    }

    return {
      departmentRecommendation: {
        department: payload.category || "Rural Development & Panchayat Raj",
        confidence: 0.75,
        subCategory: "Civic Maintenance",
        alternatives: [
          { department: "Public Works Department", confidence: 0.20 },
          { department: "Revenue Department", confidence: 0.15 },
        ],
      },
      priorityRecommendation: {
        priority,
        urgencyScore: score,
        reasoning: ["Evaluated using local fallback rule heuristics"],
        safetyFactors: safety,
      },
      nlp: {
        intent: priority === Priority.CRITICAL ? "REPORT_HAZARD" : "SERVICE_DISRUPTION",
        entities: payload.village ? [{ text: payload.village, type: "VILLAGE" }] : [],
        urgencyIndicators: priority === Priority.CRITICAL ? ["urgent", "hazard"] : [],
        keywords: payload.title.toLowerCase().split(/\s+/).slice(0, 5),
        detectedLanguage: "en",
      },
      summary: {
        summary: `Citizen grievance: ${payload.title}. ${payload.description.slice(0, 200)}`,
        keyPoints: [payload.title, `Category: ${payload.category || "General"}`],
      },
      duplicateCheck: {
        isDuplicateCandidate: false,
        highestScore: 0.0,
        matchCount: 0,
        matches: [],
      },
      analyzedAt: new Date().toISOString(),
    };
  }
}

export const aiService = AiService.getInstance();
