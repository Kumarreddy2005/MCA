import path from "path";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { config } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { sanitizeInput } from "./middlewares/sanitize.middleware.js";
import { apiRouter } from "./routes/index.js";
import { buildError, buildSuccess } from "./utils/apiResponse.js";
import { logger } from "./utils/logger.js";

export function createApp() {
  const app = express();

  // Security: Disable Express fingerprinting
  app.disable("x-powered-by");

  // Enterprise Security Headers (OWASP Top 10 Hardening)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      xContentTypeOptions: true,
      xFrameOptions: { action: "sameorigin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );

  // Parsing & compression
  app.use(compression());
  app.use(cookieParser(config.COOKIE_SECRET));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  // Input Sanitization: Strips NoSQL operators ($), prototype pollution, and script injection
  app.use(sanitizeInput);

  // Static uploads
  app.use("/uploads", express.static(path.resolve(process.cwd(), config.UPLOAD_PATH)));

  // Logging
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );

  // Tiered Rate Limiting:
  // 1. Strict Limiter for Authentication endpoints (/api/auth/*) to mitigate brute-force
  const authRateLimiter = new RateLimiterMemory({
    points: 15,
    duration: 60,
  });

  // 2. Standard Limiter for general API traffic
  const generalRateLimiter = new RateLimiterMemory({
    points: config.RATE_LIMIT_POINTS,
    duration: config.RATE_LIMIT_DURATION_SECONDS,
  });

  app.use(async (req, res, next) => {
    const clientIp = req.ip ?? "unknown";

    try {
      if (req.path.startsWith(`${config.API_PREFIX}/auth`)) {
        await authRateLimiter.consume(clientIp);
      }
      await generalRateLimiter.consume(clientIp);
      next();
    } catch {
      res.status(429).json(buildError("RATE_LIMITED", "Too many requests. Please try again later."));
    }
  });

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.status(200).json(
      buildSuccess(
        {
          status: "healthy",
          uptimeSeconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
          service: "vcgis-backend",
          version: "1.0.0",
        },
        "VCGIS Backend API is healthy"
      )
    );
  });

  // Root
  app.get("/", (_req, res) => {
    res.json(buildSuccess(undefined, "VCGIS Backend API is running"));
  });

  // API routes
  app.use(config.API_PREFIX, apiRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
