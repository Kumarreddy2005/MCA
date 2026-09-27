import { Router } from "express";
import { RagController } from "../controllers/rag.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { UserRole } from "../types/domain.js";

export const ragRouter = Router();

// Knowledge Search & Q&A (accessible to all authenticated users: Citizen, Volunteer, Official, Admin)
ragRouter.post("/query", authenticate, RagController.queryKnowledge);

// List active circulars and guidelines
ragRouter.get("/documents", authenticate, RagController.listDocuments);

// Get single circular by ID
ragRouter.get("/documents/:id", authenticate, RagController.getDocumentById);

// Admin Ingest Document
ragRouter.post("/documents", authenticate, authorize(UserRole.ADMIN), RagController.ingestDocument);

// Admin Archive / Supersede Document
ragRouter.post(
  "/documents/:id/archive",
  authenticate,
  authorize(UserRole.ADMIN),
  RagController.archiveDocument
);
