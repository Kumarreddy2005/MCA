import bcrypt from "bcrypt";
import mongoose, { Document, Model, Schema } from "mongoose";
import { UserRole, DepartmentCode } from "../types/domain.js";

export interface IUserDocument extends Document {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  citizenProfile?: {
    address?: string;
    village?: string;
    ward?: string;
    district?: string;
    pincode?: string;
  };
  volunteerProfile?: {
    volunteerId: string;
    assignedVillage: string;
    assignedWard: string;
    assignedPanchayat?: string;
    district: string;
  };
  officialProfile?: {
    department: string;
    departmentCode?: Exclude<DepartmentCode, "UNCERTAIN" | "OUT_OF_SCOPE">;
    designation: string;
    jurisdictionDistrict: string;
    jurisdictionTaluk?: string;
  };
  departmentStaffProfile?: {
    departmentCode: Exclude<DepartmentCode, "UNCERTAIN" | "OUT_OF_SCOPE">;
  };
  adminProfile?: {
    superAdmin: boolean;
    permissions: string[];
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CITIZEN,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    citizenProfile: {
      address: { type: String, trim: true },
      village: { type: String, trim: true },
      ward: { type: String, trim: true },
      district: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    volunteerProfile: {
      volunteerId: { type: String, trim: true },
      assignedVillage: { type: String, trim: true },
      assignedWard: { type: String, trim: true },
      assignedPanchayat: { type: String, trim: true },
      district: { type: String, trim: true },
    },
    officialProfile: {
      department: { type: String, trim: true },
      departmentCode: { type: String, enum: ["ROAD", "ELECTRICITY", "WATER"], index: true },
      designation: { type: String, trim: true },
      jurisdictionDistrict: { type: String, trim: true },
      jurisdictionTaluk: { type: String, trim: true },
    },
    departmentStaffProfile: {
      departmentCode: { type: String, enum: ["ROAD", "ELECTRICITY", "WATER"], index: true },
    },
    adminProfile: {
      superAdmin: { type: Boolean, default: false },
      permissions: [{ type: String }],
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
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash password before saving if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User: Model<IUserDocument> = mongoose.model<IUserDocument>("User", userSchema);
