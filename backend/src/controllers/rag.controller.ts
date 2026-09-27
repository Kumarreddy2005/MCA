import { Request, Response } from "express";
import mongoose from "mongoose";
import { KnowledgeDocument } from "../models/knowledge-document.model.js";
import { ragService } from "../services/rag.service.js";

export class RagController {
  /**
   * Query trusted knowledge base (Citizens, Volunteers, Officials, Admins)
   */
  public static async queryKnowledge(req: Request, res: Response): Promise<void> {
    try {
      const { query, departmentFilter, maxSources, language } = req.body;
      if (!query || typeof query !== "string") {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Query string is required" },
        });
        return;
      }

      const result = await ragService.queryKnowledge({
        query: query.trim(),
        departmentFilter,
        maxSources: maxSources ? Number(maxSources) : 3,
        language,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        error: { code: "RAG_QUERY_ERROR", message: msg },
      });
    }
  }

  /**
   * List active government documents
   */
  public static async listDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { department } = req.query;
      const result = await ragService.listDocuments(
        typeof department === "string" ? department : undefined
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        error: { code: "RAG_LIST_ERROR", message: msg },
      });
    }
  }

  /**
   * Get single document by ID or document number
   */
  public static async getDocumentById(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Document id is required" },
        });
        return;
      }
      const query = mongoose.Types.ObjectId.isValid(id)
        ? { $or: [{ _id: id }, { documentNumber: id }] }
        : { documentNumber: id };
      const doc = await KnowledgeDocument.findOne(query).lean();

      if (!doc) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Document '${id}' not found` },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: doc,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        error: { code: "RAG_GET_ERROR", message: msg },
      });
    }
  }

  /**
   * Ingest new government circular or order (Admin only)
   */
  public static async ingestDocument(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        documentNumber,
        department,
        category,
        version,
        effectiveDate,
        source,
        content,
        tags,
      } = req.body;

      if (!title || !documentNumber || !department || !content) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "title, documentNumber, department, and content are required",
          },
        });
        return;
      }

      // 1. Ingest via RAG microservice
      const microserviceResult = await ragService.ingestDocument({
        title,
        documentNumber,
        department,
        category: category || "General",
        version: version || "1.0",
        effectiveDate: effectiveDate || new Date().toISOString().slice(0, 10),
        source: source || "Karnataka Gazette",
        content,
        tags: Array.isArray(tags) ? tags : [],
        approvalState: "APPROVED",
        documentStatus: "ACTIVE",
      });

      // 2. Persist in MongoDB
      const savedDoc = await KnowledgeDocument.findOneAndUpdate(
        { documentNumber },
        {
          title,
          documentNumber,
          department,
          category: category || "General",
          version: version || "1.0",
          effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
          source: source || "Karnataka Gazette",
          content,
          tags: Array.isArray(tags) ? tags : [],
          approvalState: "APPROVED",
          documentStatus: "ACTIVE",
          chunks: [
            {
              chunkId: `${documentNumber}_c0`,
              chunkIndex: 0,
              content: content.slice(0, 500),
            },
          ],
        },
        { upsert: true, new: true }
      );

      res.status(201).json({
        success: true,
        data: {
          ...(microserviceResult as Record<string, unknown>),
          id: savedDoc._id,
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        error: { code: "RAG_INGEST_ERROR", message: msg },
      });
    }
  }

  /**
   * Archive or mark document as superseded (Admin only)
   */
  public static async archiveDocument(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Document id is required" },
        });
        return;
      }
      const { newStatus } = req.body;
      const statusToSet = (newStatus || "SUPERSEDED").toUpperCase();

      const result = await ragService.archiveDocument(id, statusToSet);

      const query = mongoose.Types.ObjectId.isValid(id)
        ? { $or: [{ _id: id }, { documentNumber: id }] }
        : { documentNumber: id };

      await KnowledgeDocument.updateOne(query, { $set: { documentStatus: statusToSet } });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        error: { code: "RAG_ARCHIVE_ERROR", message: msg },
      });
    }
  }
}
