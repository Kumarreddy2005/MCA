import fs from "fs";
import path from "path";
import multer, { FileFilterCallback } from "multer";
import type { Request } from "express";
import { config } from "../config/env.js";

const uploadDir = path.resolve(process.cwd(), config.UPLOAD_PATH, "evidence");

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `evidence-${uniqueSuffix}${ext}`);
  },
});

// Allowed MIME types
const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/m4a",
];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file format (${file.mimetype}). Allowed formats: JPG, PNG, WEBP, PDF, Audio.`));
  }
};

export const uploadEvidence = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 5, // Maximum 5 files per grievance
  },
});
