import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOtpDocument extends Document {
  phone: string;
  otp: string;
  purpose: "LOGIN" | "SIGNUP";
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtpDocument>(
  {
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: [true, "OTP is required"],
    },
    purpose: {
      type: String,
      enum: ["LOGIN", "SIGNUP"],
      default: "LOGIN",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index to auto-expire documents
    },
    attempts: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Otp: Model<IOtpDocument> = mongoose.model<IOtpDocument>("Otp", otpSchema);
