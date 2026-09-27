import mongoose, { Document, Model, Schema } from "mongoose";
import { UserRole } from "../types/domain.js";

export type AuditAction =
  | "COMPLAINT_CREATED"
  | "STATUS_TRANSITION"
  | "OFFICIAL_ASSIGNED"
  | "OFFICIAL_REASSIGNED"
  | "EVIDENCE_UPLOADED"
  | "FIELD_VERIFIED"
  | "ACTION_LOGGED"
  | "INFORMATION_REQUESTED"
  | "INFORMATION_PROVIDED"
  | "COMPLAINT_RESOLVED"
  | "COMPLAINT_REJECTED"
  | "COMPLAINT_REOPENED"
  | "FEEDBACK_SUBMITTED"
  | "ESCALATED"
  | "SLA_WARNING"
  | "SLA_BREACH"
  | "SLA_ESCALATION"
  | "MANUAL_ESCALATION"
  | "USER_PROVISIONED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_STATUS_CHANGED"
  | "ROLE_ASSIGNED"
  | "DEPARTMENT_UPDATED"
  | "SLA_CONFIG_UPDATED"
  | "JURISDICTION_ASSIGNED"
  | "SYSTEM_AUTO_ROUTE";

export interface IAuditLogDocument extends Document {
  entityType: "COMPLAINT" | "USER" | "DEPARTMENT" | "SYSTEM";
  entityId: string;
  complaintNumber?: string;
  action: AuditAction;
  actor: {
    id?: mongoose.Types.ObjectId;
    name: string;
    role: UserRole | "SYSTEM";
    phone?: string;
    email?: string;
    ipAddress?: string;
  };
  previousState?: string;
  newState?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["COMPLAINT", "USER", "DEPARTMENT", "SYSTEM"],
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    complaintNumber: {
      type: String,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      id: { type: Schema.Types.ObjectId, ref: "User" },
      name: { type: String, required: true },
      role: { type: String, required: true },
      phone: { type: String },
      email: { type: String },
      ipAddress: { type: String },
    },
    previousState: { type: String },
    newState: { type: String },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
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

// Compound indexes for fast audit trail retrieval
auditLogSchema.index({ entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ "actor.id": 1, timestamp: -1 });

export const AuditLog: Model<IAuditLogDocument> = mongoose.model<IAuditLogDocument>("AuditLog", auditLogSchema);
