import { Router } from "express";
import { AiController } from "../controllers/ai.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

export const aiRouter = Router();

// Public/semi-public health check
aiRouter.get("/health", AiController.getHealth);

// AI features (authenticated for citizens, volunteers, officials, and admins)
aiRouter.post("/analyze", authenticate, AiController.analyzeComplaint);
aiRouter.post("/classify", authenticate, AiController.classifyDepartment);
aiRouter.post("/priority", authenticate, AiController.evaluatePriority);
aiRouter.post("/ocr", authenticate, AiController.extractOcr);
aiRouter.post("/duplicates", authenticate, AiController.detectDuplicates);
