import type { Request, Response } from "express";
import { z } from "zod";
import { Complaint } from "../models/complaint.model.js";
import { ComplaintStatus, UserRole, normalizeDepartmentCode } from "../types/domain.js";
import { buildError, buildSuccess } from "../utils/apiResponse.js";
import { transitionComplaintStatus, LifecycleError } from "../services/complaint-lifecycle.service.js";
import { logAuditEvent } from "../services/audit.service.js";

const statusSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  remarks: z.string().trim().min(3).max(2000),
});
const actionSchema = z.object({ actionType: z.string().trim().min(2), remarks: z.string().trim().min(3).max(2000) });

function department(req: Request) { return req.user?.departmentStaffProfile?.departmentCode; }

export async function getStaffQueue(req: Request, res: Response) {
  if (!req.user) return res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
  const dept = department(req);
  if (!dept) return res.status(400).json(buildError("CONFIG_ERROR", "Department Staff account has no department assignment"));
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const filter: any = { departmentCode: dept };
  if (req.query.status && req.query.status !== "ALL") filter.status = req.query.status;
  if (req.query.priority && req.query.priority !== "ALL") filter.priority = req.query.priority;
  if (req.query.search) { const r = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); filter.$or=[{complaintNumber:r},{title:r},{description:r},{"location.village":r}]; }
  const [complaints,total]=await Promise.all([Complaint.find(filter).sort({priority:-1,createdAt:-1}).skip((page-1)*limit).limit(limit),Complaint.countDocuments(filter)]);
  res.json(buildSuccess({complaints,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)},departmentCode:dept}));
}

export async function updateStaffStatus(req: Request, res: Response) {
  if (!req.user) return res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
  const parsed=statusSchema.safeParse(req.body); if(!parsed.success) return res.status(400).json(buildError("VALIDATION_ERROR","Invalid status update",parsed.error.flatten().fieldErrors));
  const complaint=await Complaint.findById(req.params.id); if(!complaint) return res.status(404).json(buildError("NOT_FOUND","Complaint not found"));
  const dept=department(req); if(!dept || (complaint.departmentCode || normalizeDepartmentCode(complaint.department))!==dept) return res.status(403).json(buildError("DEPARTMENT_ISOLATION_VIOLATION","Complaint is outside your department"));
  try {
    const updated=await transitionComplaintStatus(complaint._id.toString(),{newStatus:parsed.data.status,remarks:parsed.data.remarks,actor:{id:req.user._id.toString(),name:req.user.name,role:UserRole.DEPARTMENT_STAFF,phone:req.user.phone,email:req.user.email,ipAddress:req.ip}});
    res.json(buildSuccess(updated,"Complaint status updated"));
  } catch(e){ if(e instanceof LifecycleError) return res.status(400).json(buildError(e.code,e.message)); throw e; }
}

export async function addStaffAction(req: Request, res: Response) {
  if (!req.user) return res.status(401).json(buildError("UNAUTHORIZED", "Authentication required"));
  const parsed=actionSchema.safeParse(req.body); if(!parsed.success) return res.status(400).json(buildError("VALIDATION_ERROR","Invalid action",parsed.error.flatten().fieldErrors));
  const complaint=await Complaint.findById(req.params.id); if(!complaint) return res.status(404).json(buildError("NOT_FOUND","Complaint not found"));
  const dept=department(req); if(!dept || (complaint.departmentCode || normalizeDepartmentCode(complaint.department))!==dept) return res.status(403).json(buildError("DEPARTMENT_ISOLATION_VIOLATION","Complaint is outside your department"));
  complaint.actions=complaint.actions||[]; complaint.actions.push({actionType:parsed.data.actionType,remarks:parsed.data.remarks,isInternalOnly:true,actorId:req.user._id,actorName:req.user.name,actorRole:UserRole.DEPARTMENT_STAFF,createdAt:new Date()});
  complaint.timeline.push({status:complaint.status,message:`Department Staff action: ${parsed.data.actionType}. ${parsed.data.remarks}`,actorId:req.user._id,actorRole:UserRole.DEPARTMENT_STAFF,actorName:req.user.name,timestamp:new Date()});
  await complaint.save();
  await logAuditEvent({entityType:"COMPLAINT",entityId:complaint._id.toString(),complaintNumber:complaint.complaintNumber,action:"FIELD_ACTION_RECORDED",actor:{id:req.user._id.toString(),name:req.user.name,role:req.user.role,phone:req.user.phone,email:req.user.email,ipAddress:req.ip},notes:parsed.data.remarks});
  res.json(buildSuccess(complaint,"Department action recorded"));
}
