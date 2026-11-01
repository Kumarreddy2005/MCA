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

// Whitelist of allowed extensions matched to their permitted MIME types
const ALLOWED_EXTENSIONS_MAP: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".pdf": ["application/pdf"],
  ".mp3": ["audio/mpeg"],
  ".wav": ["audio/wav"],
  ".mp4": ["audio/mp4", "video/mp4"],
  ".m4a": ["audio/mp4", "audio/m4a", "audio/x-m4a"],
};

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimesForExt = ALLOWED_EXTENSIONS_MAP[ext];

  if (!allowedMimesForExt) {
    cb(new Error(`File extension '${ext}' is not permitted. Allowed extensions: .jpg, .jpeg, .png, .webp, .pdf, .mp3, .wav, .mp4, .m4a.`));
    return;
  }

  if (!allowedMimesForExt.includes(file.mimetype)) {
    cb(new Error(`MIME type mismatch (${file.mimetype}) for extension '${ext}'.`));
    return;
  }

  cb(null, true);
};

export const uploadEvidence = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 5, // Maximum 5 files per grievance
  },
});
