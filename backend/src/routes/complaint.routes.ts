import { Router } from "express";
import {
  assignOfficial,
  createComplaint,
  getAllComplaints,
  getComplaintAuditTrail,
  getComplaintById,
  getDepartmentCategories,
  getMyComplaints,
  recordAction,
  reopenComplaint,
  respondToInformation,
  submitComplaintFeedback,
  transitionStatus,
} from "../controllers/complaint.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadEvidence } from "../middlewares/upload.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const complaintRouter = Router();

// Categories & departments list
complaintRouter.get("/categories", asyncHandler(getDepartmentCategories));

// Citizen/User complaints
complaintRouter.post(
  "/",
  authenticate,
  uploadEvidence.array("files", 5),
  asyncHandler(createComplaint)
);

complaintRouter.get("/my", authenticate, asyncHandler(getMyComplaints));

// Query complaints (Officials / Admins)
complaintRouter.get("/", authenticate, asyncHandler(getAllComplaints));

// Detailed complaint view
complaintRouter.get("/:id", authenticate, asyncHandler(getComplaintById));

// Complaint Lifecycle Engine & Actions (Phase 4)
complaintRouter.patch("/:id/status", authenticate, asyncHandler(transitionStatus));
complaintRouter.post("/:id/assign", authenticate, asyncHandler(assignOfficial));
complaintRouter.post("/:id/actions", authenticate, asyncHandler(recordAction));
complaintRouter.post("/:id/respond-info", authenticate, asyncHandler(respondToInformation));
complaintRouter.get("/:id/audit-trail", authenticate, asyncHandler(getComplaintAuditTrail));

// Citizen feedback & reopen
complaintRouter.post("/:id/feedback", authenticate, asyncHandler(submitComplaintFeedback));
complaintRouter.post("/:id/reopen", authenticate, asyncHandler(reopenComplaint));

