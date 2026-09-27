import { Router } from "express";
import { buildSuccess } from "../utils/apiResponse.js";
import mongoose from "mongoose";

const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

  res.json(
    buildSuccess({
      status: "ok",
      service: "vcgis-backend",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: process.uptime(),
    })
  );
});

export { healthRouter };
