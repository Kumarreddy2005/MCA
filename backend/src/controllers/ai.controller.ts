import { Request, Response } from "express";
import { Complaint } from "../models/complaint.model.js";
import { aiService } from "../services/ai.service.js";
import { ComplaintStatus } from "../types/domain.js";

export class AiController {
  /**
   * Health check for AI subsystem
   */
  public static async getHealth(_req: Request, res: Response): Promise<void> {
    const isAvailable = await aiService.isAvailable();
    res.status(200).json({
      success: true,
      data: {
        aiMicroserviceAvailable: isAvailable,
        mode: isAvailable ? "ONLINE" : "FALLBACK_HEURISTIC",
      },
    });
  }

  /**
   * Run full AI analysis on complaint draft
   */
  public static async analyzeComplaint(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        description,
        category,
        latitude,
        longitude,
        village,
        taluk,
        district,
        documentBase64,
        documentMimeType,
      } = req.body;

      if (!title || !description) {
        res.status(400).json({
          success: false,
          message: "Title and description are required for AI analysis",
        });
        return;
      }

      // Fetch active complaints in the same taluk/district for duplicate clustering
      const filter: Record<string, unknown> = {
        status: {
          $in: [
            ComplaintStatus.SUBMITTED,
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.UNDER_REVIEW,
            ComplaintStatus.ACTION_IN_PROGRESS,
          ],
        },
      };

      if (taluk) {
        filter["location.mandal"] = taluk;
      } else if (district) {
        filter["location.district"] = district;
      }

      const activeCandidates = await Complaint.find(filter)
        .select("_id complaintNumber title description category status location")
        .limit(30)
        .lean();

      const existingComplaints = activeCandidates.map((c) => ({
        id: c._id.toString(),
        complaint_number: c.complaintNumber,
        title: c.title,
        description: c.description,
        category: c.category,
        status: c.status,
        latitude: c.location?.coordinates?.latitude,
        longitude: c.location?.coordinates?.longitude,
        village: c.location?.village,
        taluk: c.location?.mandal,
      }));

      const analysis = await aiService.analyzeComplaint({
        title,
        description,
        category,
        latitude,
        longitude,
        village,
        taluk,
        district,
        documentBase64,
        documentMimeType,
        existingComplaints,
      });

      res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        message: `AI analysis failed: ${msg}`,
      });
    }
  }

  /**
   * Classify department
   */
  public static async classifyDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, selectedCategory } = req.body;
      if (!title && !description) {
        res.status(400).json({
          success: false,
          message: "Title or description is required for classification",
        });
        return;
      }

      const result = await aiService.classifyDepartment(
        title || "",
        description || "",
        selectedCategory
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        message: `Classification failed: ${msg}`,
      });
    }
  }

  /**
   * Evaluate priority & urgency
   */
  public static async evaluatePriority(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, category } = req.body;
      if (!title && !description) {
        res.status(400).json({
          success: false,
          message: "Title or description is required for priority evaluation",
        });
        return;
      }

      const result = await aiService.evaluatePriority(
        title || "",
        description || "",
        category
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        message: `Priority evaluation failed: ${msg}`,
      });
    }
  }

  /**
   * Extract document text via OCR
   */
  public static async extractOcr(req: Request, res: Response): Promise<void> {
    try {
      const { fileBase64, mimeType, textContent } = req.body;
      if (!fileBase64 && !textContent) {
        res.status(400).json({
          success: false,
          message: "Document base64 content or textContent is required",
        });
        return;
      }

      const result = await aiService.extractOcr({
        fileBase64,
        mimeType,
        textContent,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        message: `OCR extraction failed: ${msg}`,
      });
    }
  }

  /**
   * Detect duplicates against existing active complaints
   */
  public static async detectDuplicates(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, category, latitude, longitude, village, taluk, district } = req.body;
      if (!title && !description) {
        res.status(400).json({
          success: false,
          message: "Title or description is required for duplicate check",
        });
        return;
      }

      const filter: Record<string, unknown> = {
        status: {
          $in: [
            ComplaintStatus.SUBMITTED,
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.UNDER_REVIEW,
            ComplaintStatus.ACTION_IN_PROGRESS,
          ],
        },
      };

      if (taluk) {
        filter["location.mandal"] = taluk;
      } else if (district) {
        filter["location.district"] = district;
      }

      const activeCandidates = await Complaint.find(filter)
        .select("_id complaintNumber title description category status location")
        .limit(30)
        .lean();

      const existingComplaints = activeCandidates.map((c) => ({
        id: c._id.toString(),
        complaint_number: c.complaintNumber,
        title: c.title,
        description: c.description,
        category: c.category,
        status: c.status,
        latitude: c.location?.coordinates?.latitude,
        longitude: c.location?.coordinates?.longitude,
        village: c.location?.village,
        taluk: c.location?.mandal,
      }));

      const result = await aiService.detectDuplicates({
        title: title || "",
        description: description || "",
        category,
        latitude,
        longitude,
        village,
        taluk,
        existingComplaints,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        message: `Duplicate detection failed: ${msg}`,
      });
    }
  }
}
