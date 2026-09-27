import mongoose, { Document, Model, Schema } from "mongoose";

export interface IKnowledgeChunk {
  chunkId: string;
  chunkIndex: number;
  content: string;
  heading?: string;
}

export interface IKnowledgeDocument extends Document {
  documentNumber: string;
  title: string;
  department: string;
  category: string;
  version: string;
  effectiveDate: Date;
  source: string;
  approvalState: "DRAFT" | "REVIEW" | "APPROVED" | "REJECTED";
  documentStatus: "ACTIVE" | "SUPERSEDED" | "ARCHIVED";
  content: string;
  summary?: string;
  tags: string[];
  chunks: IKnowledgeChunk[];
  supersededBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    chunkId: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },
    heading: { type: String },
  },
  { _id: false }
);

const KnowledgeDocumentSchema = new Schema<IKnowledgeDocument>(
  {
    documentNumber: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    department: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    version: { type: String, default: "1.0" },
    effectiveDate: { type: Date, required: true },
    source: { type: String, required: true },
    approvalState: {
      type: String,
      enum: ["DRAFT", "REVIEW", "APPROVED", "REJECTED"],
      default: "APPROVED",
      index: true,
    },
    documentStatus: {
      type: String,
      enum: ["ACTIVE", "SUPERSEDED", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    content: { type: String, required: true },
    summary: { type: String },
    tags: [{ type: String, index: true }],
    chunks: [KnowledgeChunkSchema],
    supersededBy: { type: Schema.Types.ObjectId, ref: "KnowledgeDocument" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast query resolution
KnowledgeDocumentSchema.index({ department: 1, documentStatus: 1, approvalState: 1 });
KnowledgeDocumentSchema.index({ title: "text", content: "text", tags: "text" });

export const KnowledgeDocument: Model<IKnowledgeDocument> =
  mongoose.models.KnowledgeDocument ||
  mongoose.model<IKnowledgeDocument>("KnowledgeDocument", KnowledgeDocumentSchema);
