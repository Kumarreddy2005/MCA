import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().default(5001),
  API_PREFIX: z.string().default("/api"),

  // Database
  MONGODB_URI: z.string().default("mongodb://localhost:27017/vcgis"),

  // JWT
  JWT_SECRET: z.string().min(16).default("vcgis-dev-jwt-secret-key-32-characters-long"),
  JWT_REFRESH_SECRET: z.string().min(16).default("vcgis-dev-refresh-jwt-secret-key-32-chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Storage
  UPLOAD_PATH: z.string().default("uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(25),

  // AI Service
  AI_SERVICE_URL: z.string().default("http://localhost:8000"),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://127.0.0.1:5173"),

  // Cookies
  COOKIE_SECRET: z.string().min(16).default("vcgis-dev-cookie-secret-key-32-chars"),

  // Rate Limiting
  RATE_LIMIT_POINTS: z.coerce.number().default(120),
  RATE_LIMIT_DURATION_SECONDS: z.coerce.number().default(60),

  // Logging
  LOG_LEVEL: z.string().default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment validation failed:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = {
  ...parsed.data,
  corsOrigin: parsed.data.CORS_ORIGIN.split(",").map((o) => o.trim()),
  isDev: parsed.data.NODE_ENV === "development",
  isProd: parsed.data.NODE_ENV === "production",
} as const;

export type AppConfig = typeof config;
