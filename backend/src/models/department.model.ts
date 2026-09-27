import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDepartmentCategory {
  name: string;
  subcategories: string[];
}

export interface ISlaConfig {
  criticalHours: number;
  highHours: number;
  mediumHours: number;
  lowHours: number;
}

export interface IEscalationTierConfig {
  level: number;
  title: string;
  authority: string;
  triggerHoursOverdue: number;
}

export interface IDepartmentDocument extends Document {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  categories: IDepartmentCategory[];
  slaConfig: ISlaConfig;
  escalationTiers: IEscalationTierConfig[];
  headOfDepartment?: {
    name?: string;
    designation?: string;
    email?: string;
    phone?: string;
  };
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartmentDocument>(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, "Department code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    categories: [
      {
        name: { type: String, required: true, trim: true },
        subcategories: [{ type: String, trim: true }],
      },
    ],
    slaConfig: {
      criticalHours: { type: Number, default: 24 },
      highHours: { type: Number, default: 48 },
      mediumHours: { type: Number, default: 120 },
      lowHours: { type: Number, default: 240 },
    },
    escalationTiers: [
      {
        level: { type: Number, required: true },
        title: { type: String, required: true },
        authority: { type: String, required: true },
        triggerHoursOverdue: { type: Number, default: 24 },
      },
    ],
    headOfDepartment: {
      name: { type: String, trim: true },
      designation: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
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

export const Department: Model<IDepartmentDocument> = mongoose.model<IDepartmentDocument>(
  "Department",
  departmentSchema
);
