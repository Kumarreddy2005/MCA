import mongoose, { Document, Model, Schema } from "mongoose";
import {
  ComplaintLocation,
  ComplaintSource,
  ComplaintStatus,
  IAiAnalysis,
  Priority,
  SlaStatus,
} from "../types/domain.js";

export interface IEvidenceSubdocument {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface ITimelineSubdocument {
  status: ComplaintStatus;
  message: string;
  actorId?: mongoose.Types.ObjectId;
  actorRole: string;
  actorName?: string;
  timestamp: Date;
}

export interface IComplaintDocument extends Document {
  complaintNumber: string;
  citizenId: mongoose.Types.ObjectId;
  citizenName: string;
  citizenPhone: string;
  title: string;
  description: string;
  category: string;
  department: string;
  departmentCode?: "ROAD" | "ELECTRICITY" | "WATER";
  status: ComplaintStatus;
  priority: Priority;
  source: ComplaintSource;
  registeredBy?: mongoose.Types.ObjectId;
  assignedVolunteerId?: mongoose.Types.ObjectId;
  assignedOfficialId?: mongoose.Types.ObjectId;
  assignedOfficialName?: string;
  location: ComplaintLocation;
  evidence: IEvidenceSubdocument[];
  timeline: ITimelineSubdocument[];
  verification?: {
    verifiedBy: mongoose.Types.ObjectId;
    verifiedByName: string;
    verifiedBadge?: string;
    verifiedAt: Date;
    result: string;
    notes: string;
    checklist?: {
      citizenIdentified: boolean;
      incidentConfirmed: boolean;
      evidenceValid: boolean;
      severityMatches: boolean;
    };
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
    photos?: IEvidenceSubdocument[];
  };
  resolution?: {
    resolvedBy: mongoose.Types.ObjectId;
    resolvedByName: string;
    resolvedAt: Date;
    resolutionSummary: string;
    resolutionPhotos?: IEvidenceSubdocument[];
  };
  rejection?: {
    rejectedBy: mongoose.Types.ObjectId;
    rejectedByName: string;
    rejectedAt: Date;
    reason: string;
  };
  actions?: Array<{
    actionType: string;
    remarks: string;
    isInternalOnly: boolean;
    actorId?: mongoose.Types.ObjectId;
    actorName: string;
    actorRole: string;
    attachments?: IEvidenceSubdocument[];
    createdAt: Date;
  }>;
  informationRequested?: {
    query: string;
    requestedBy: mongoose.Types.ObjectId;
    requestedByName: string;
    requestedAt: Date;
    response?: string;
    respondedAt?: Date;
  };
  sla: {
    startDate?: Date;
    targetResolutionDate: Date;
    isBreached: boolean;
    breachedAt?: Date;
    status: SlaStatus;
    warningSent?: boolean;
    warningSentAt?: Date;
    escalationLevel: number;
    escalatedAt?: Date;
    escalationHistory?: Array<{
      level: number;
      levelName: string;
      reason: string;
      triggeredBy: string;
      actorName?: string;
      escalatedAt: Date;
    }>;
  };
  aiAnalysis?: IAiAnalysis;
  feedback?: {
    rating: number;
    comment?: string;
    submittedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const complaintSchema = new Schema<IComplaintDocument>(
  {
    complaintNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    citizenId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    citizenName: {
      type: String,
      required: true,
      trim: true,
    },
    citizenPhone: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Complaint title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Complaint description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      index: true,
    },
    departmentCode: {
      type: String,
      enum: ["ROAD", "ELECTRICITY", "WATER"],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ComplaintStatus),
      default: ComplaintStatus.SUBMITTED,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(Priority),
      default: Priority.MEDIUM,
      index: true,
    },
    source: {
      type: String,
      enum: Object.values(ComplaintSource),
      default: ComplaintSource.CITIZEN_PORTAL,
      index: true,
    },
    registeredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedVolunteerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    assignedOfficialId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedOfficialName: {
      type: String,
      trim: true,
    },
    location: {
      village: { type: String, required: true, trim: true },
      ward: { type: String, trim: true },
      mandal: { type: String, trim: true },
      district: { type: String, required: true, trim: true },
      pincode: { type: String, trim: true },
      addressLine: { type: String, trim: true },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    evidence: [
      {
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileType: { type: String, required: true },
        fileSize: { type: Number, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    timeline: [
      {
        status: { type: String, required: true },
        message: { type: String, required: true },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        actorRole: { type: String, required: true },
        actorName: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    verification: {
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      verifiedByName: { type: String },
      verifiedBadge: { type: String },
      verifiedAt: { type: Date },
      result: { type: String },
      notes: { type: String },
      checklist: {
        citizenIdentified: { type: Boolean, default: false },
        incidentConfirmed: { type: Boolean, default: false },
        evidenceValid: { type: Boolean, default: false },
        severityMatches: { type: Boolean, default: false },
      },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
      photos: [
        {
          fileName: { type: String },
          fileUrl: { type: String },
          fileType: { type: String },
          fileSize: { type: Number },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
    },
    resolution: {
      resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      resolvedByName: { type: String },
      resolvedAt: { type: Date },
      resolutionSummary: { type: String },
      resolutionPhotos: [
        {
          fileName: { type: String },
          fileUrl: { type: String },
          fileType: { type: String },
          fileSize: { type: Number },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
    },
    rejection: {
      rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
      rejectedByName: { type: String },
      rejectedAt: { type: Date },
      reason: { type: String },
    },
    actions: [
      {
        actionType: { type: String, required: true },
        remarks: { type: String, required: true },
        isInternalOnly: { type: Boolean, default: false },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        actorName: { type: String, required: true },
        actorRole: { type: String, required: true },
        attachments: [
          {
            fileName: { type: String },
            fileUrl: { type: String },
            fileType: { type: String },
            fileSize: { type: Number },
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        createdAt: { type: Date, default: Date.now },
      },
    ],
    informationRequested: {
      query: { type: String },
      requestedBy: { type: Schema.Types.ObjectId, ref: "User" },
      requestedByName: { type: String },
      requestedAt: { type: Date },
      response: { type: String },
      respondedAt: { type: Date },
    },
    sla: {
      startDate: { type: Date, default: Date.now },
      targetResolutionDate: { type: Date, required: true, index: true },
      isBreached: { type: Boolean, default: false, index: true },
      breachedAt: { type: Date },
      status: {
        type: String,
        enum: Object.values(SlaStatus),
        default: SlaStatus.ON_TRACK,
        index: true,
      },
      warningSent: { type: Boolean, default: false },
      warningSentAt: { type: Date },
      escalationLevel: { type: Number, default: 0, index: true },
      escalatedAt: { type: Date },
      escalationHistory: [
        {
          level: { type: Number, required: true },
          levelName: { type: String, required: true },
          reason: { type: String, required: true },
          triggeredBy: { type: String, required: true },
          actorName: { type: String },
          escalatedAt: { type: Date, default: Date.now },
        },
      ],
    },
    aiAnalysis: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true },
      submittedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id ? (ret._id as mongoose.Types.ObjectId).toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Helper static method to generate unique human-readable complaint ID
complaintSchema.statics.generateComplaintNumber = async function (): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await this.countDocuments();
  const sequence = String(count + 1).padStart(5, "0");
  return `CMP-${currentYear}-${sequence}`;
};

export const Complaint = mongoose.model<IComplaintDocument, Model<IComplaintDocument> & {
  generateComplaintNumber: () => Promise<string>;
}>("Complaint", complaintSchema);
