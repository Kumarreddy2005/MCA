/**
 * VCGIS Domain Types & Constants (Backend)
 */

// ─── User Roles ──────────────────────────────────────────────
export const UserRole = {
  CITIZEN: "CITIZEN",
  VOLUNTEER: "VOLUNTEER",
  OFFICIAL: "OFFICIAL",
  ADMIN: "ADMIN",
  DEPARTMENT_STAFF: "DEPARTMENT_STAFF",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ─── Complaint Status ────────────────────────────────────────
export const ComplaintStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  VALIDATING: "VALIDATING",
  VERIFICATION_REQUIRED: "VERIFICATION_REQUIRED",
  VERIFIED: "VERIFIED",
  AI_ANALYSIS: "AI_ANALYSIS",
  ROUTING: "ROUTING",
  ASSIGNED: "ASSIGNED",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACTION_IN_PROGRESS: "ACTION_IN_PROGRESS",
  INFORMATION_REQUIRED: "INFORMATION_REQUIRED",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  REOPENED: "REOPENED",
  REJECTED: "REJECTED",
  DUPLICATE: "DUPLICATE",
  CANCELLED: "CANCELLED",
  ESCALATED: "ESCALATED",
  ON_HOLD: "ON_HOLD",
} as const;
export type ComplaintStatus = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];

// ─── Complaint Priority ──────────────────────────────────────
export const Priority = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

// ─── Complaint Source ────────────────────────────────────────
export const ComplaintSource = {
  CITIZEN_PORTAL: "CITIZEN_PORTAL",
  VOLUNTEER_ASSISTED: "VOLUNTEER_ASSISTED",
  ADMIN_CREATED: "ADMIN_CREATED",
} as const;
export type ComplaintSource = (typeof ComplaintSource)[keyof typeof ComplaintSource];

// ─── SLA Status ──────────────────────────────────────────────
export const SlaStatus = {
  ON_TRACK: "ON_TRACK",
  AT_RISK: "AT_RISK",
  BREACHED: "BREACHED",
  RESOLVED: "RESOLVED",
} as const;
export type SlaStatus = (typeof SlaStatus)[keyof typeof SlaStatus];

// ─── User Profiles ───────────────────────────────────────────
export interface CitizenProfile {
  address?: string;
  village?: string;
  ward?: string;
  district?: string;
  pincode?: string;
}

export interface VolunteerProfile {
  volunteerId: string;
  assignedVillage: string;
  assignedWard: string;
  assignedPanchayat?: string;
  district: string;
}

export interface OfficialProfile {
  department: string;
  departmentCode?: Exclude<DepartmentCode, "UNCERTAIN" | "OUT_OF_SCOPE">;
  designation: string;
  jurisdictionDistrict: string;
  jurisdictionTaluk?: string;
}

export interface AdminProfile {
  superAdmin: boolean;
  permissions: string[];
}

export interface IUser {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  citizenProfile?: CitizenProfile;
  volunteerProfile?: VolunteerProfile;
  officialProfile?: OfficialProfile;
  adminProfile?: AdminProfile;
  departmentStaffProfile?: { departmentCode: Exclude<DepartmentCode, "UNCERTAIN" | "OUT_OF_SCOPE"> };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseData {
  user: IUser;
  accessToken: string;
  refreshToken?: string;
}

// ─── Government Departments ──────────────────────────────────
export const DepartmentCode = {
  ROAD: "ROAD",
  ELECTRICITY: "ELECTRICITY",
  WATER: "WATER",
  UNCERTAIN: "UNCERTAIN",
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
} as const;
export type DepartmentCode = (typeof DepartmentCode)[keyof typeof DepartmentCode];

export const GovernmentDepartments = [
  "Roads & Transport",
  "Electricity & Power",
  "Water Supply",
] as const;
export type GovernmentDepartment = (typeof GovernmentDepartments)[number];

export const DepartmentDisplayName: Record<Exclude<DepartmentCode, "UNCERTAIN" | "OUT_OF_SCOPE">, GovernmentDepartment> = {
  ROAD: "Roads & Transport",
  ELECTRICITY: "Electricity & Power",
  WATER: "Water Supply",
};

export const LEGACY_DEPARTMENT_MAP: Record<string, DepartmentCode> = {
  "Roads & Transport": "ROAD", "Public Works Department": "ROAD", PWD: "ROAD",
  "Roads & Buildings Department": "ROAD",
  "Electricity & Power": "ELECTRICITY", "Energy Department": "ELECTRICITY", BESCOM: "ELECTRICITY",
  "Street Lighting": "ELECTRICITY",
  "Water Supply": "WATER", "Rural Water Supply": "WATER", "Rural Drinking Water & Sanitation": "WATER",
  "Water Department": "WATER", RWS: "WATER",
};

export function normalizeDepartmentCode(value?: string | null): DepartmentCode | null {
  if (!value) return null;
  const key = value.trim().toUpperCase();
  if (key === "ROAD" || key === "ELECTRICITY" || key === "WATER") return key;
  return LEGACY_DEPARTMENT_MAP[value.trim()] || null;
}

export function departmentDisplayName(value?: string | null): string | null {
  const code = normalizeDepartmentCode(value);
  if (!code || code === "UNCERTAIN" || code === "OUT_OF_SCOPE") return null;
  return DepartmentDisplayName[code];
}

// ─── Complaint Interfaces ───────────────────────────────────
export interface ComplaintEvidence {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ComplaintTimelineEvent {
  status: ComplaintStatus;
  message: string;
  actorId?: string;
  actorRole: string;
  actorName?: string;
  timestamp: string;
}

export interface ComplaintLocation {
  village: string;
  ward?: string;
  mandal?: string;
  district: string;
  pincode?: string;
  addressLine?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export const FieldVerificationResult = {
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  REQUIRES_INFO: "REQUIRES_INFO",
} as const;
export type FieldVerificationResult = (typeof FieldVerificationResult)[keyof typeof FieldVerificationResult];

export interface IVerificationChecklist {
  citizenIdentified: boolean;
  incidentConfirmed: boolean;
  evidenceValid: boolean;
  severityMatches: boolean;
}

export interface ComplaintVerification {
  verifiedBy: string;
  verifiedByName: string;
  verifiedBadge?: string;
  verifiedAt: string;
  result: FieldVerificationResult;
  notes: string;
  checklist?: IVerificationChecklist;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  photos?: ComplaintEvidence[];
}

export const ComplaintActionType = {
  INSPECTION: "INSPECTION",
  NOTICE_ISSUED: "NOTICE_ISSUED",
  CONTRACTOR_DISPATCHED: "CONTRACTOR_DISPATCHED",
  INTERNAL_NOTE: "INTERNAL_NOTE",
  CITIZEN_CALL: "CITIZEN_CALL",
  RESOLUTION_PROGRESS: "RESOLUTION_PROGRESS",
} as const;
export type ComplaintActionType = (typeof ComplaintActionType)[keyof typeof ComplaintActionType];

export interface IComplaintAction {
  id?: string;
  actionType: ComplaintActionType;
  remarks: string;
  isInternalOnly: boolean;
  actorId?: string;
  actorName: string;
  actorRole: string;
  attachments?: ComplaintEvidence[];
  createdAt: string;
}

export interface IComplaintResolution {
  resolvedBy: string;
  resolvedByName: string;
  resolvedAt: string;
  resolutionSummary: string;
  resolutionPhotos?: ComplaintEvidence[];
}

export interface IComplaintRejection {
  rejectedBy: string;
  rejectedByName: string;
  rejectedAt: string;
  reason: string;
}

export interface IInformationRequested {
  query: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  response?: string;
  respondedAt?: string;
}

export interface ISlaEscalationEvent {
  level: number;
  levelName: string;
  reason: string;
  triggeredBy: "AUTOMATED_ENGINE" | "MANUAL_STAFF";
  actorName?: string;
  escalatedAt: Date;
}

export interface IComplaintSla {
  startDate?: string | Date;
  targetResolutionDate: string | Date;
  isBreached: boolean;
  breachedAt?: string | Date;
  status: SlaStatus;
  warningSent?: boolean;
  warningSentAt?: string | Date;
  escalationLevel: number;
  escalatedAt?: string | Date;
  escalationHistory?: ISlaEscalationEvent[];
}

export interface ISlaAnalyticsData {
  totalTracked: number;
  onTrackCount: number;
  atRiskCount: number;
  breachedCount: number;
  resolvedWithinSlaCount: number;
  complianceRatePercentage: number;
  breachRatePercentage: number;
  averageResolutionHours: number;
  byPriority: Record<Priority, { total: number; breached: number; complianceRate: number }>;
  byDepartment: Record<string, { total: number; breached: number; complianceRate: number }>;
}

export interface IAiAnalysis {
  departmentRecommendation: {
    department: string;
    confidence: number;
    subCategory?: string;
    alternatives: Array<{ department: string; confidence: number }>;
  };
  priorityRecommendation: {
    priority: Priority;
    urgencyScore: number;
    reasoning: string[];
    safetyFactors: string[];
  };
  nlp: {
    intent: string;
    entities: Array<{ text: string; type: string }>;
    urgencyIndicators: string[];
    keywords: string[];
    detectedLanguage: string;
  };
  summary: {
    summary: string;
    keyPoints: string[];
  };
  duplicateCheck: {
    isDuplicateCandidate: boolean;
    highestScore: number;
    matchCount: number;
    matches: Array<{
      complaintId: string;
      complaintNumber: string;
      title: string;
      similarityScore: number;
      matchReasons: string[];
    }>;
  };
  ocr?: {
    extractedText: string;
    confidence: number;
    isLowConfidence: boolean;
    pageCount?: number;
    language?: string;
  };
  analyzedAt: string;
}

export interface IComplaint {
  id: string;
  complaintNumber: string;
  citizenId: string;
  citizenName: string;
  citizenPhone: string;
  title: string;
  description: string;
  category: string;
  department: string;
  status: ComplaintStatus;
  priority: Priority;
  source: ComplaintSource;
  registeredBy?: string;
  assignedVolunteerId?: string;
  assignedOfficialId?: string;
  assignedOfficialName?: string;
  location: ComplaintLocation;
  evidence: ComplaintEvidence[];
  timeline: ComplaintTimelineEvent[];
  verification?: ComplaintVerification;
  resolution?: IComplaintResolution;
  rejection?: IComplaintRejection;
  actions?: IComplaintAction[];
  informationRequested?: IInformationRequested;
  sla: IComplaintSla;
  aiAnalysis?: IAiAnalysis;
  feedback?: {
    rating: number;
    comment?: string;
    submittedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Notification & Audit Domain Interfaces ─────────────────
export interface INotification {
  id: string;
  recipientId: string;
  role: UserRole;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "URGENT";
  complaintId?: string;
  complaintNumber?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface IAuditLog {
  id: string;
  entityType: "COMPLAINT" | "USER" | "SYSTEM";
  entityId: string;
  complaintNumber?: string;
  action: string;
  actor: {
    id?: string;
    name: string;
    role: string;
    phone?: string;
    email?: string;
    ipAddress?: string;
  };
  previousState?: string;
  newState?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

