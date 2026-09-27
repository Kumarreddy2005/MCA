const GENAI_SERVICE_URL = process.env.AI_SERVICE_URL
  ? process.env.AI_SERVICE_URL.replace(/\/api\/ai\/?$/, "/api/genai")
  : "http://localhost:8000/api/genai";

export interface IAssistCitizenPayload {
  query: string;
  complaintContext?: Record<string, unknown>;
  language?: string;
}

export interface IVolunteerStructurePayload {
  rawNotes: string;
  language?: string;
  villageContext?: string;
  talukContext?: string;
}

export interface IOfficialDraftPayload {
  complaintNumber: string;
  title: string;
  category: string;
  department: string;
  actionType: string;
  actionNotes?: string;
  citizenName?: string;
  officerName?: string;
  officerDesignation?: string;
}

export interface IAdminSummaryPayload {
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

export class GenAiService {
  private static instance: GenAiService;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = GENAI_SERVICE_URL;
  }

  public static getInstance(): GenAiService {
    if (!GenAiService.instance) {
      GenAiService.instance = new GenAiService();
    }
    return GenAiService.instance;
  }

  /**
   * Citizen Assistant: conversational drafting & timeline explanation
   */
  public async assistCitizen(payload: IAssistCitizenPayload) {
    try {
      const res = await fetch(`${this.baseUrl}/citizen/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: payload.query,
          complaint_context: payload.complaintContext,
          language: payload.language || "en",
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`GenAI status ${res.status}`);
      return await res.json();
    } catch {
      return this.fallbackAssistCitizen(payload);
    }
  }

  /**
   * Volunteer Assistant: structure informal notes into 4-part petition
   */
  public async structureVolunteerNotes(payload: IVolunteerStructurePayload) {
    try {
      const res = await fetch(`${this.baseUrl}/volunteer/structure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_notes: payload.rawNotes,
          language: payload.language || "en",
          village_context: payload.villageContext,
          taluk_context: payload.talukContext,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`GenAI status ${res.status}`);
      return await res.json();
    } catch {
      return this.fallbackStructureNotes(payload);
    }
  }

  /**
   * Official Assistant: formal resolution notice, inspection steps, rejection justification
   */
  public async draftOfficialResponse(payload: IOfficialDraftPayload) {
    try {
      const res = await fetch(`${this.baseUrl}/official/draft-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_number: payload.complaintNumber,
          title: payload.title,
          category: payload.category,
          department: payload.department,
          action_type: payload.actionType,
          action_notes: payload.actionNotes,
          citizen_name: payload.citizenName,
          officer_name: payload.officerName,
          officer_designation: payload.officerDesignation,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`GenAI status ${res.status}`);
      return await res.json();
    } catch {
      return this.fallbackOfficialDraft(payload);
    }
  }

  /**
   * Admin Assistant: operational executive summary
   */
  public async generateAdminSummary(payload: IAdminSummaryPayload) {
    try {
      const res = await fetch(`${this.baseUrl}/admin/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time_window_days: payload.timeWindowDays ?? 30,
          district: payload.district,
          department: payload.department,
          total_complaints: payload.totalComplaints ?? 0,
          breached_count: payload.breachedCount ?? 0,
          resolved_count: payload.resolvedCount ?? 0,
          pending_count: payload.pendingCount ?? 0,
          critical_count: payload.criticalCount ?? 0,
          top_categories: payload.topCategories ?? [],
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`GenAI status ${res.status}`);
      return await res.json();
    } catch {
      return this.fallbackAdminSummary(payload);
    }
  }

  /**
   * Multilingual Translation
   */
  public async translate(text: string, sourceLang = "auto", targetLang = "en") {
    try {
      const res = await fetch(`${this.baseUrl}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source_language: sourceLang,
          target_language: targetLang,
        }),
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) throw new Error(`GenAI status ${res.status}`);
      return await res.json();
    } catch {
      return {
        success: true,
        translated_text: text,
        detected_source: sourceLang,
        target_language: targetLang,
      };
    }
  }

  // ─── Deterministic Fallbacks ──────────────────────────────────
  private fallbackAssistCitizen(payload: IAssistCitizenPayload) {
    const q = payload.query.trim();
    return {
      success: true,
      reply_message: `Here is a drafted grievance based on your input: "${q}". Please review and refine the fields before filing.`,
      draft_title: q.slice(0, 60),
      draft_description: `Citizen grievance regarding ${q}. Requesting field inspection and resolution by the concerned department.`,
      suggested_category: "General Civic Grievance",
      suggested_department: "Rural Development & Panchayat Raj",
      next_steps: [
        "Review and edit title and description",
        "Select your exact village locality",
        "Submit petition for automated official routing",
      ],
    };
  }

  private fallbackStructureNotes(payload: IVolunteerStructurePayload) {
    const notes = payload.rawNotes.trim();
    return {
      success: true,
      structured_title: `Grievance petition at ${payload.villageContext || "Village"}`,
      structured_description: `1. INCIDENT SUMMARY:\n${notes}\n\n2. LOCATION:\n${payload.villageContext || "Village"}, ${payload.talukContext || "Taluk"}\n\n3. STATUS: Field verified by Village Volunteer.`,
      incident_summary: notes,
      location_clues: payload.villageContext || "Village locality",
      observed_impact: "Affects local villagers and daily commute.",
      detected_category: "Civic Amenities",
      detected_department: "Rural Development & Panchayat Raj",
      recommended_priority: "MEDIUM",
      missing_info_checklist: [
        { item: "Exact Landmark", question: "Is there a specific pole or building landmark nearby?", is_critical: true },
        { item: "Duration", question: "How long has this issue existed?", is_critical: false },
      ],
    };
  }

  private fallbackOfficialDraft(payload: IOfficialDraftPayload) {
    const deptUpper = (payload.department || "Government Department").toUpperCase();
    return {
      success: true,
      formal_letter: `GOVERNMENT OF KARNATAKA\nDEPARTMENT OF ${deptUpper}\n\nReference: ${payload.complaintNumber}\nSubject: Official notice regarding ${payload.title}\n\nThe competent authority has recorded action: ${payload.actionType}.\nRemarks: ${payload.actionNotes || "Action initiated."}\n\nYours faithfully,\n${payload.officerName || "Department Officer"}`,
      sms_summary: `Govt of Karnataka VCGIS: Action '${payload.actionType}' recorded for ${payload.complaintNumber}.`,
      inspection_checklist: [
        "Inspect site and verify reported grievance",
        "Record geo-tagged photographic evidence",
        "Update resolution remarks",
      ],
    };
  }

  private fallbackAdminSummary(payload: IAdminSummaryPayload) {
    const total = payload.totalComplaints || 0;
    const resolved = payload.resolvedCount || 0;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 100;
    return {
      success: true,
      executive_summary: `Executive Operational Summary: A total of ${total} complaints processed with an SLA compliance rate of ${rate}%.`,
      key_highlights: [
        `Total Volume: ${total} complaints`,
        `Compliance Rate: ${rate}%`,
        `Pending: ${payload.pendingCount || 0}`,
      ],
      identified_hotspots: ["Local civic infrastructure maintenance"],
      strategic_recommendations: ["Ensure timely field inspections by Taluk officers"],
    };
  }
}

export const genAiService = GenAiService.getInstance();
