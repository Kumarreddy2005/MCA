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

export const Priority = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const SlaStatus = {
  ON_TRACK: "ON_TRACK",
  AT_RISK: "AT_RISK",
  BREACHED: "BREACHED",
  RESOLVED: "RESOLVED",
} as const;
export type SlaStatus = (typeof SlaStatus)[keyof typeof SlaStatus];

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

export const DEPARTMENT_CODE_BY_NAME: Record<GovernmentDepartment, Exclude<DepartmentCode, "UNCERTAIN" | "OUT_OF_SCOPE">> = {
  "Roads & Transport": "ROAD",
  "Electricity & Power": "ELECTRICITY",
  "Water Supply": "WATER",
};

export interface ComplaintEvidence {
  id?: string;
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
  source: string;
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

export interface ISlaEscalationEvent {
  level: number;
  levelName: string;
  reason: string;
  triggeredBy: "AUTOMATED_ENGINE" | "MANUAL_STAFF";
  actorName?: string;
  escalatedAt: string;
}

export interface IComplaintSla {
  startDate?: string;
  targetResolutionDate: string;
  isBreached: boolean;
  breachedAt?: string;
  status: SlaStatus;
  warningSent?: boolean;
  warningSentAt?: string;
  escalationLevel: number;
  escalatedAt?: string;
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

export interface ComplaintStats {
  total: number;
  active: number;
  resolved: number;
  pending: number;
}

export interface VolunteerWorkQueueStats {
  totalCluster: number;
  pendingVerification: number;
  verifiedCount: number;
  resolvedCount: number;
  urgentCount: number;
  registeredCitizens: number;
  assignedVillage: string;
  assignedWard: string;
}

export interface INotification {
  id: string;
  recipientId: string;
  role: string;
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

export interface OfficialDashboardMetrics {
  totalComplaints: number;
  newComplaints: number;
  pendingComplaints: number;
  urgentComplaints: number;
  slaRiskComplaints: number;
  resolvedComplaints: number;
  reopenedComplaints: number;
  department: string;
}

export interface OfficialQueueFilter {
  assignedToMe?: boolean;
  status?: string;
  priority?: string;
  slaRisk?: boolean;
  taluk?: string;
  village?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ResolveComplaintPayload {
  resolutionSummary: string;
  actionTaken?: string;
  contractorName?: string;
  materialsUsed?: string;
  photos?: File[];
}

export interface RejectComplaintPayload {
  reason: string;
}

export interface TransferDepartmentPayload {
  targetDepartment: string;
  reason: string;
}

export interface EscalateComplaintPayload {
  reason: string;
}
