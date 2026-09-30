/**
 * VCGIS Administrator Service (Phase 10)
 * Comprehensive administration service handling User Lifecycle,
 * Karnataka Department Hierarchy, SLA Configurations,
 * Volunteer/Official Jurisdictions, and Cross-System Audit Explorer.
 */

import mongoose from "mongoose";
import { User, IUserDocument } from "../models/user.model.js";
import { Department, IDepartmentDocument, ISlaConfig } from "../models/department.model.js";
import { Complaint } from "../models/complaint.model.js";
import { AuditLog, IAuditLogDocument, AuditAction } from "../models/audit-log.model.js";
import { UserRole, ComplaintStatus, SlaStatus, normalizeDepartmentCode, departmentDisplayName } from "../types/domain.js";
import { logAuditEvent } from "./audit.service.js";

export interface AdminActor {
  id: string;
  name: string;
  role: UserRole | "SYSTEM";
  email?: string;
  phone?: string;
}

export interface UserListFilter {
  role?: string;
  isActive?: boolean;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface VolunteerListFilter {
  district?: string;
  village?: string;
  ward?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OfficialListFilter {
  department?: string;
  district?: string;
  taluk?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogFilter {
  entityType?: "COMPLAINT" | "USER" | "DEPARTMENT" | "SYSTEM";
  action?: AuditAction;
  actorRole?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class AdminService {
  /**
   * System-wide aggregate statistics for Administrator Portal
   */
  async getSystemStats(): Promise<{
    users: {
      total: number;
      citizens: number;
      volunteers: number;
      officials: number;
      admins: number;
      active: number;
      inactive: number;
    };
    departments: {
      total: number;
      active: number;
    };
    complaints: {
      total: number;
      open: number;
      resolved: number;
      breached: number;
      escalated: number;
    };
    auditLogsTotal: number;
  }> {
    const [
      totalUsers,
      citizens,
      volunteers,
      officials,
      admins,
      activeUsers,
      totalDepartments,
      activeDepartments,
      totalComplaints,
      resolvedComplaints,
      breachedComplaints,
      escalatedComplaints,
      auditLogsTotal,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: UserRole.CITIZEN }),
      User.countDocuments({ role: UserRole.VOLUNTEER }),
      User.countDocuments({ role: UserRole.OFFICIAL }),
      User.countDocuments({ role: UserRole.ADMIN }),
      User.countDocuments({ isActive: true }),
      Department.countDocuments(),
      Department.countDocuments({ isActive: true }),
      Complaint.countDocuments(),
      Complaint.countDocuments({
        status: { $in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
      }),
      Complaint.countDocuments({
        "sla.status": SlaStatus.BREACHED,
      }),
      Complaint.countDocuments({
        status: ComplaintStatus.ESCALATED,
      }),
      AuditLog.countDocuments(),
    ]);

    const openComplaints = totalComplaints - resolvedComplaints;

    return {
      users: {
        total: totalUsers,
        citizens,
        volunteers,
        officials,
        admins,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      departments: {
        total: totalDepartments,
        active: activeDepartments,
      },
      complaints: {
        total: totalComplaints,
        open: Math.max(0, openComplaints),
        resolved: resolvedComplaints,
        breached: breachedComplaints,
        escalated: escalatedComplaints,
      },
      auditLogsTotal,
    };
  }

  /**
   * Paginated user directory with filters
   */
  async listUsers(filter: UserListFilter): Promise<{
    users: IUserDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filter.role && Object.values(UserRole).includes(filter.role as UserRole)) {
      query.role = filter.role;
    }

    if (typeof filter.isActive === "boolean") {
      query.isActive = filter.isActive;
    }

    if (filter.department) {
      query["officialProfile.department"] = filter.department;
    }

    if (filter.search && filter.search.trim().length > 0) {
      const term = filter.search.trim();
      query.$or = [
        { name: { $regex: term, $options: "i" } },
        { phone: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single user by ID
   */
  async getUserById(id: string): Promise<IUserDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return User.findById(id);
  }

  /**
   * Admin provisions a user account
   */
  async createUser(
    userData: {
      name: string;
      email?: string;
      phone: string;
      password?: string;
      role: UserRole;
      citizenProfile?: Record<string, unknown>;
      volunteerProfile?: Record<string, unknown>;
      officialProfile?: Record<string, unknown>;
      departmentStaffProfile?: Record<string, unknown>;
      adminProfile?: Record<string, unknown>;
    },
    actor: AdminActor
  ): Promise<IUserDocument> {
    if (userData.email) {
      const existingEmail = await User.findOne({ email: userData.email });
      if (existingEmail) {
        throw new Error("A user with this email already exists");
      }
    }

    const existingPhone = await User.findOne({ phone: userData.phone });
    if (existingPhone) {
      throw new Error("A user with this phone number already exists");
    }

    const normalizedUserData = { ...userData };
    if (normalizedUserData.officialProfile) {
      const profile = normalizedUserData.officialProfile as Record<string, unknown>;
      const code = normalizeDepartmentCode(String(profile.departmentCode || profile.department || ""));
      const name = departmentDisplayName(code);
      if (!code || !name) throw new Error("Official must be assigned to ROAD, ELECTRICITY, or WATER");
      normalizedUserData.officialProfile = { ...profile, department: name, departmentCode: code };
    }
    if (normalizedUserData.role === UserRole.DEPARTMENT_STAFF) {
      const profile = normalizedUserData.departmentStaffProfile as Record<string, unknown> | undefined;
      const code = normalizeDepartmentCode(String(profile?.departmentCode || ""));
      if (!code || code === "UNCERTAIN" || code === "OUT_OF_SCOPE") throw new Error("Department Staff requires a canonical department");
      normalizedUserData.departmentStaffProfile = { departmentCode: code };
    }

    const user = await User.create({
      ...normalizedUserData,
      isActive: true,
      isVerified: true,
    });

    await logAuditEvent({
      entityType: "USER",
      entityId: user.id,
      action: "USER_CREATED",
      actor: {
        id: mongoose.Types.ObjectId.isValid(actor.id) ? new mongoose.Types.ObjectId(actor.id) : undefined,
        name: actor.name,
        role: actor.role,
        email: actor.email,
        phone: actor.phone,
      },
      newState: user.role,
      notes: `Admin created new ${user.role} user: ${user.name} (${user.phone})`,
      metadata: { role: user.role, email: user.email },
    });

    return user;
  }

  /**
   * Update user details and profile
   */
  async updateUser(
    id: string,
    updateData: {
      name?: string;
      email?: string;
      phone?: string;
      role?: UserRole;
      citizenProfile?: Partial<NonNullable<IUserDocument["citizenProfile"]>>;
      volunteerProfile?: Partial<NonNullable<IUserDocument["volunteerProfile"]>>;
      officialProfile?: Partial<NonNullable<IUserDocument["officialProfile"]>>;
      adminProfile?: Partial<NonNullable<IUserDocument["adminProfile"]>>;
    },
    actor: AdminActor
  ): Promise<IUserDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const user = await User.findById(id);
    if (!user) return null;

    const previousRole = user.role;
    const previousName = user.name;

    if (updateData.name) user.name = updateData.name;
    if (updateData.email !== undefined) user.email = updateData.email;
    if (updateData.phone) user.phone = updateData.phone;
    if (updateData.role) user.role = updateData.role;

    if (updateData.citizenProfile) {
      user.citizenProfile = { ...(user.citizenProfile || {}), ...updateData.citizenProfile };
    }
    if (updateData.volunteerProfile) {
      user.volunteerProfile = {
        volunteerId: user.volunteerProfile?.volunteerId || "",
        assignedVillage: user.volunteerProfile?.assignedVillage || "",
        assignedWard: user.volunteerProfile?.assignedWard || "",
        district: user.volunteerProfile?.district || "",
        ...user.volunteerProfile,
        ...updateData.volunteerProfile,
      };
    }
    if (updateData.officialProfile) {
      user.officialProfile = {
        department: user.officialProfile?.department || "",
        designation: user.officialProfile?.designation || "",
        jurisdictionDistrict: user.officialProfile?.jurisdictionDistrict || "",
        ...user.officialProfile,
        ...updateData.officialProfile,
      };
    }
    if (updateData.adminProfile) {
      user.adminProfile = {
        superAdmin: user.adminProfile?.superAdmin ?? false,
        permissions: user.adminProfile?.permissions || [],
        ...user.adminProfile,
        ...updateData.adminProfile,
      };
    }

    await user.save();

    await logAuditEvent({
      entityType: "USER",
      entityId: user.id,
      action: updateData.role && updateData.role !== previousRole ? "ROLE_ASSIGNED" : "USER_UPDATED",
      actor: {
        id: mongoose.Types.ObjectId.isValid(actor.id) ? new mongoose.Types.ObjectId(actor.id) : undefined,
        name: actor.name,
        role: actor.role,
        email: actor.email,
        phone: actor.phone,
      },
      previousState: `${previousName} (${previousRole})`,
      newState: `${user.name} (${user.role})`,
      notes: `User ${user.id} updated by Admin`,
      metadata: { updateData },
    });

    return user;
  }

  /**
   * Toggle user active/inactive status
   */
  async updateUserStatus(
    id: string,
    isActive: boolean,
    actor: AdminActor
  ): Promise<IUserDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const user = await User.findById(id);
    if (!user) return null;

    const previousStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    await logAuditEvent({
      entityType: "USER",
      entityId: user.id,
      action: "USER_STATUS_CHANGED",
      actor: {
        id: mongoose.Types.ObjectId.isValid(actor.id) ? new mongoose.Types.ObjectId(actor.id) : undefined,
        name: actor.name,
        role: actor.role,
        email: actor.email,
        phone: actor.phone,
      },
      previousState: previousStatus ? "ACTIVE" : "INACTIVE",
      newState: isActive ? "ACTIVE" : "INACTIVE",
      notes: `User status changed to ${isActive ? "ACTIVE" : "INACTIVE"} by Admin`,
    });

    return user;
  }

  // ─── Department & SLA Management ──────────────────────────────

  /**
   * List all departments with categories and SLA thresholds
   */
  async listDepartments(): Promise<IDepartmentDocument[]> {
    return Department.find().sort({ name: 1 });
  }

  /**
   * Get single department by ID or Code
   */
  async getDepartment(identifier: string): Promise<IDepartmentDocument | null> {
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      const doc = await Department.findById(identifier);
      if (doc) return doc;
    }
    return Department.findOne({
      $or: [{ code: identifier.toUpperCase() }, { name: identifier }],
    });
  }

  /**
   * Create a new department
   */
  async createDepartment(
    deptData: Partial<IDepartmentDocument>,
    actor: AdminActor
  ): Promise<IDepartmentDocument> {
    const department = await Department.create(deptData);

    await logAuditEvent({
      entityType: "DEPARTMENT",
      entityId: department.id,
      action: "DEPARTMENT_UPDATED",
      actor: {
        id: mongoose.Types.ObjectId.isValid(actor.id) ? new mongoose.Types.ObjectId(actor.id) : undefined,
        name: actor.name,
        role: actor.role,
        email: actor.email,
        phone: actor.phone,
      },
      newState: department.name,
      notes: `Created department: ${department.name} (${department.code})`,
    });

    return department;
  }

  /**
   * Update department categories, details, or active state
   */
  async updateDepartment(
    id: string,
    updateData: Partial<IDepartmentDocument>,
    actor: AdminActor
  ): Promise<IDepartmentDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const department = await Department.findById(id);
    if (!department) return null;

    Object.assign(department, updateData);
    await department.save();

    await logAuditEvent({
      entityType: "DEPARTMENT",
      entityId: department.id,
      action: "DEPARTMENT_UPDATED",
      actor: {
        id: mongoose.Types.ObjectId.isValid(actor.id) ? new mongoose.Types.ObjectId(actor.id) : undefined,
        name: actor.name,
        role: actor.role,
        email: actor.email,
        phone: actor.phone,
      },
      newState: department.name,
      notes: `Updated department: ${department.name}`,
    });

    return department;
  }

  /**
   * Update department SLA resolution configurations
   */
  async updateDepartmentSla(
    id: string,
    slaConfig: ISlaConfig,
    actor: AdminActor
  ): Promise<IDepartmentDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const department = await Department.findById(id);
    if (!department) return null;

    const previousSla = { ...department.slaConfig };
    department.slaConfig = {
      criticalHours: slaConfig.criticalHours || department.slaConfig.criticalHours,
      highHours: slaConfig.highHours || department.slaConfig.highHours,
      mediumHours: slaConfig.mediumHours || department.slaConfig.mediumHours,
      lowHours: slaConfig.lowHours || department.slaConfig.lowHours,
    };

    await department.save();

    await logAuditEvent({
      entityType: "DEPARTMENT",
      entityId: department.id,
      action: "SLA_CONFIG_UPDATED",
      actor: {
        id: mongoose.Types.ObjectId.isValid(actor.id) ? new mongoose.Types.ObjectId(actor.id) : undefined,
        name: actor.name,
        role: actor.role,
        email: actor.email,
        phone: actor.phone,
      },
      previousState: JSON.stringify(previousSla),
      newState: JSON.stringify(department.slaConfig),
      notes: `Updated SLA configurations for ${department.name}`,
      metadata: { previousSla, newSla: department.slaConfig },
    });

    return department;
  }

  // ─── Volunteer & Official Jurisdiction Management ─────────────

  /**
   * List field volunteers with cluster jurisdictions and workload metrics
   */
  async listVolunteers(filter: VolunteerListFilter): Promise<{
    volunteers: Array<{
      user: IUserDocument;
      totalComplaintsLogged: number;
      verifiedComplaintsCount: number;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { role: UserRole.VOLUNTEER };

    if (filter.district) {
      query["volunteerProfile.district"] = filter.district;
    }
    if (filter.village) {
      query["volunteerProfile.assignedVillage"] = { $regex: filter.village, $options: "i" };
    }
    if (filter.ward) {
      query["volunteerProfile.assignedWard"] = { $regex: filter.ward, $options: "i" };
    }
    if (filter.search && filter.search.trim().length > 0) {
      const term = filter.search.trim();
      query.$or = [
        { name: { $regex: term, $options: "i" } },
        { phone: { $regex: term, $options: "i" } },
        { "volunteerProfile.volunteerId": { $regex: term, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    // Gather basic metrics for each volunteer
    const results = await Promise.all(
      users.map(async (user) => {
        const [totalComplaintsLogged, verifiedComplaintsCount] = await Promise.all([
          Complaint.countDocuments({
            "citizen.phone": user.phone,
            source: "VOLUNTEER_ASSISTED",
          }),
          Complaint.countDocuments({
            "verification.verifiedBy": user.id,
          }),
        ]);

        return {
          user,
          totalComplaintsLogged,
          verifiedComplaintsCount,
        };
      })
    );

    return {
      volunteers: results,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Reassign volunteer jurisdiction (Village, Ward, Panchayat, District)
   */
  async updateVolunteerJurisdiction(
    id: string,
    jurisdiction: {
      assignedVillage: string;
      assignedWard: string;
      assignedPanchayat?: string;
      district: string;
    },
    actor: AdminActor
  ): Promise<IUserDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const user = await User.findOne({ _id: id, role: UserRole.VOLUNTEER });
    if (!user) return null;

    const previousJurisdiction = user.volunteerProfile ? { ...user.volunteerProfile } : null;

    user.volunteerProfile = {
      volunteerId: user.volunteerProfile?.volunteerId || `VOL-${Date.now().toString().slice(-4)}`,
      assignedVillage: jurisdiction.assignedVillage,
      assignedWard: jurisdiction.assignedWard,
      assignedPanchayat: jurisdiction.assignedPanchayat,
      district: jurisdiction.district,
    };

    await user.save();

    await logAuditEvent({
      entityType: "USER",
      entityId: user.id,
      action: "JURISDICTION_ASSIGNED",
      actor: {
        id: mongoose.Types.ObjectId.isValid(actor.id) ? new mongoose.Types.ObjectId(actor.id) : undefined,
        name: actor.name,
        role: actor.role,
        email: actor.email,
        phone: actor.phone,
      },
      previousState: JSON.stringify(previousJurisdiction),
      newState: JSON.stringify(user.volunteerProfile),
      notes: `Reassigned volunteer ${user.name} to ${jurisdiction.assignedVillage}, ${jurisdiction.district}`,
      metadata: { jurisdiction },
    });

    return user;
  }

  /**
   * List department officials with department and jurisdiction
   */
  async listOfficials(filter: OfficialListFilter): Promise<{
    officials: IUserDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { role: UserRole.OFFICIAL };

    if (filter.department) {
      query["officialProfile.department"] = filter.department;
    }
    if (filter.district) {
      query["officialProfile.jurisdictionDistrict"] = filter.district;
    }
    if (filter.taluk) {
      query["officialProfile.jurisdictionTaluk"] = { $regex: filter.taluk, $options: "i" };
    }
    if (filter.search && filter.search.trim().length > 0) {
      const term = filter.search.trim();
      query.$or = [
        { name: { $regex: term, $options: "i" } },
        { phone: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
      ];
    }

    const [officials, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    return {
      officials,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Reassign official department, designation, and jurisdiction (District & Taluk)
   */
  async updateOfficialAssignment(
    id: string,
    assignment: {
      department: string;
      departmentCode?: "ROAD" | "ELECTRICITY" | "WATER";
      designation: string;
      jurisdictionDistrict: string;
      jurisdictionTaluk?: string;
    },
    actor: AdminActor
  ): Promise<IUserDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const user = await User.findOne({ _id: id, role: UserRole.OFFICIAL });
    if (!user) return null;

    const normalizedCode = assignment.departmentCode || normalizeDepartmentCode(assignment.department);
    const normalizedName = departmentDisplayName(normalizedCode);
    if (!normalizedCode || !normalizedName) {
      throw new Error("Official must be assigned to ROAD, ELECTRICITY, or WATER");
    }
    const previousAssignment = user.officialProfile ? { ...user.officialProfile } : null;

    user.officialProfile = {
      department: normalizedName,
      departmentCode: normalizedCode as "ROAD" | "ELECTRICITY" | "WATER",
      designation: assignment.designation,
      jurisdictionDistrict: assignment.jurisdictionDistrict,
      jurisdictionTaluk: assignment.jurisdictionTaluk,
    };

    await user.save();

    await logAuditEvent({
      entityType: "USER",
      entityId: user.id,
      action: "OFFICIAL_REASSIGNED",
      actor: {
        id: mongoose.Types.ObjectId.isValid(actor.id) ? new mongoose.Types.ObjectId(actor.id) : undefined,
        name: actor.name,
        role: actor.role,
        email: actor.email,
        phone: actor.phone,
      },
      previousState: JSON.stringify(previousAssignment),
      newState: JSON.stringify(user.officialProfile),
      notes: `Reassigned official ${user.name} to ${assignment.department} (${assignment.designation}) in ${assignment.jurisdictionDistrict}`,
      metadata: { assignment },
    });

    return user;
  }

  // ─── Cross-System Audit Log Explorer ──────────────────────────

  /**
   * Comprehensive audit trail queryable by filters
   */
  async listAuditLogs(filter: AuditLogFilter): Promise<{
    logs: IAuditLogDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 30));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filter.entityType) {
      query.entityType = filter.entityType;
    }

    if (filter.action) {
      query.action = filter.action;
    }

    if (filter.actorRole) {
      query["actor.role"] = filter.actorRole;
    }

    if (filter.startDate || filter.endDate) {
      const dateQuery: Record<string, Date> = {};
      if (filter.startDate) dateQuery.$gte = new Date(filter.startDate);
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.$lte = end;
      }
      query.timestamp = dateQuery;
    }

    if (filter.search && filter.search.trim().length > 0) {
      const term = filter.search.trim();
      query.$or = [
        { complaintNumber: { $regex: term, $options: "i" } },
        { entityId: { $regex: term, $options: "i" } },
        { "actor.name": { $regex: term, $options: "i" } },
        { notes: { $regex: term, $options: "i" } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const adminService = new AdminService();
