import { Router } from "express";
import { GenAiController } from "../controllers/genai.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { UserRole } from "../types/domain.js";

export const genaiRouter = Router();

// Citizen Assistant (accessible to all authenticated users)
genaiRouter.post("/citizen/assist", authenticate, GenAiController.assistCitizen);

// Volunteer Copilot (accessible to volunteers, citizens, and admins)
genaiRouter.post(
  "/volunteer/structure",
  authenticate,
  authorize(UserRole.CITIZEN, UserRole.VOLUNTEER, UserRole.ADMIN),
  GenAiController.structureVolunteerNotes
);

// Official Copilot (accessible to departmental officials and admins)
genaiRouter.post(
  "/official/draft-response",
  authenticate,
  authorize(UserRole.OFFICIAL, UserRole.ADMIN),
  GenAiController.draftOfficialResponse
);

// Admin Copilot (accessible to administrators only)
genaiRouter.post(
  "/admin/summary",
  authenticate,
  authorize(UserRole.ADMIN),
  GenAiController.generateAdminSummary
);

// Translation Helper (accessible to all authenticated users)
genaiRouter.post("/translate", authenticate, GenAiController.translateText);
