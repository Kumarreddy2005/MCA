import mongoose, { Document, Model, Schema } from "mongoose";
import { UserRole } from "../types/domain.js";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "URGENT";

export interface INotificationDocument extends Document {
  recipientId: mongoose.Types.ObjectId;
  role: UserRole;
  title: string;
  message: string;
  type: NotificationType;
  complaintId?: mongoose.Types.ObjectId;
  complaintNumber?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["INFO", "SUCCESS", "WARNING", "URGENT"],
      default: "INFO",
      index: true,
    },
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      index: true,
    },
    complaintNumber: {
      type: String,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
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

// Compound index for fast querying unread notifications for a user
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotificationDocument> = mongoose.model<INotificationDocument>(
  "Notification",
  notificationSchema
);
