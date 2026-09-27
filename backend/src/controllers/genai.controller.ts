import { Request, Response } from "express";
import { genAiService } from "../services/genai.service.js";

export class GenAiController {
  /**
   * Citizen Assistant
   */
  public static async assistCitizen(req: Request, res: Response): Promise<void> {
    try {
      const { query, complaintContext, language } = req.body;
      if (!query || typeof query !== "string") {
        res.status(400).json({
          success: false,
          message: "Query is required for citizen assistant",
        });
        return;
      }

      const result = await genAiService.assistCitizen({
        query: query.trim(),
        complaintContext,
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
        message: `Citizen assistant failed: ${msg}`,
      });
    }
  }

  /**
   * Volunteer Assistant: Structuring notes
   */
  public static async structureVolunteerNotes(req: Request, res: Response): Promise<void> {
    try {
      const { rawNotes, language, villageContext, talukContext } = req.body;
      if (!rawNotes || typeof rawNotes !== "string") {
        res.status(400).json({
          success: false,
          message: "rawNotes string is required for volunteer structuring",
        });
        return;
      }

      const result = await genAiService.structureVolunteerNotes({
        rawNotes: rawNotes.trim(),
        language,
        villageContext,
        talukContext,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        message: `Volunteer structuring failed: ${msg}`,
      });
    }
  }

  /**
   * Official Assistant: Drafting formal response letters & checklists
   */
  public static async draftOfficialResponse(req: Request, res: Response): Promise<void> {
    try {
      const {
        complaintNumber,
        title,
        category,
        department,
        actionType,
        actionNotes,
        citizenName,
      } = req.body;

      if (!complaintNumber || !actionType) {
        res.status(400).json({
          success: false,
          message: "complaintNumber and actionType are required",
        });
        return;
      }

      const officerName = req.user?.name || "Official";
      const officerDesignation = "Jurisdictional Officer";

      const result = await genAiService.draftOfficialResponse({
        complaintNumber,
        title: title || "Grievance Redressal",
        category: category || "Civic Grievance",
        department: department || "Government Department",
        actionType,
        actionNotes,
        citizenName,
        officerName,
        officerDesignation,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        message: `Official draft failed: ${msg}`,
      });
    }
  }

  /**
   * Admin Assistant: Executive operational summary
   */
  public static async generateAdminSummary(req: Request, res: Response): Promise<void> {
    try {
      const {
        timeWindowDays,
        district,
        department,
        totalComplaints,
        breachedCount,
        resolvedCount,
        pendingCount,
        criticalCount,
        topCategories,
      } = req.body;

      const result = await genAiService.generateAdminSummary({
        timeWindowDays,
        district,
        department,
        totalComplaints,
        breachedCount,
        resolvedCount,
        pendingCount,
        criticalCount,
        topCategories,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        message: `Admin summary failed: ${msg}`,
      });
    }
  }

  /**
   * Multilingual Translation
   */
  public static async translateText(req: Request, res: Response): Promise<void> {
    try {
      const { text, sourceLanguage, targetLanguage } = req.body;
      if (!text || typeof text !== "string") {
        res.status(400).json({
          success: false,
          message: "Text is required for translation",
        });
        return;
      }

      const result = await genAiService.translate(
        text,
        sourceLanguage || "auto",
        targetLanguage || "en"
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Internal error";
      res.status(500).json({
        success: false,
        message: `Translation failed: ${msg}`,
      });
    }
  }
}
