import { Router } from "express";
import {
  assistantHelper,
  fileAssistedComplaint,
  getWorkQueue,
  registerCitizen,
  searchCitizens,
  submitFieldVerification,
} from "../controllers/volunteer.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { uploadEvidence } from "../middlewares/upload.middleware.js";
import { UserRole } from "../types/domain.js";

export const volunteerRouter = Router();

// Guard all volunteer routes: only VOLUNTEER or ADMIN
volunteerRouter.use(authenticate);
volunteerRouter.use(authorize(UserRole.VOLUNTEER, UserRole.ADMIN));

// 1. Citizen registration & search
volunteerRouter.post("/citizens", registerCitizen);
volunteerRouter.get("/citizens", searchCitizens);

// 2. On-behalf grievance filing
volunteerRouter.post("/complaints", uploadEvidence.array("evidence", 5), fileAssistedComplaint);

// 3. Cluster work queue & metrics
volunteerRouter.get("/work-queue", getWorkQueue);

// 4. On-site field verification
volunteerRouter.post("/complaints/:id/verify", uploadEvidence.array("photos", 5), submitFieldVerification);

// 5. AI Assistant helper
volunteerRouter.post("/assistant", assistantHelper);
