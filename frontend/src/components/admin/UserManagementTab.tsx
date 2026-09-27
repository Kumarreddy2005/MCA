import React, { useState, useEffect, useCallback } from "react";
import { IUser, UserRole } from "@/types/auth";
import { adminService, CreateStaffPayload } from "@/services/api/admin.service";
import {
  Search,
  UserPlus,
  Shield,
  HeartHandshake,
  Building,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Edit2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [search, setSearch] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<IUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<UserRole>(UserRole.CITIZEN);
  const [savingEdit, setSavingEdit] = useState(false);

  // Provision Modal State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionName, setProvisionName] = useState("");
  const [provisionEmail, setProvisionEmail] = useState("");
  const [provisionPhone, setProvisionPhone] = useState("");
  const [provisionPassword, setProvisionPassword] = useState("");
  const [provisionRole, setProvisionRole] = useState<UserRole>(UserRole.VOLUNTEER);
  const [provVillage, setProvVillage] = useState("Rampura");
  const [provWard, setProvWard] = useState("Ward 4");
  const [provDistrict, setProvDistrict] = useState("Mysuru");
  const [provDept, setProvDept] = useState("Rural Water Supply");
  const [provDesignation, setProvDesignation] = useState("Assistant Engineer");
  const [savingProvision, setSavingProvision] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.listUsers({
        role: roleFilter !== "ALL" ? roleFilter : undefined,
        isActive: statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE",
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load users";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user: IUser) => {
    try {
      const updated = await adminService.updateUserStatus(user.id, !user.isActive);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setActionMessage({
        type: "success",
        text: `User ${user.name} is now ${updated.isActive ? "ACTIVE" : "INACTIVE"}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change user status";
      setActionMessage({ type: "error", text: msg });
    }
  };

  const handleOpenEdit = (user: IUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email || "");
    setEditPhone(user.phone);
    setEditRole(user.role);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setActionMessage(null);

    try {
      const updated = await adminService.updateUser(editingUser.id, {
        name: editName,
        email: editEmail || undefined,
        phone: editPhone,
        role: editRole,
      });
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
      setEditingUser(null);
      setActionMessage({ type: "success", text: `Updated user profile for ${updated.name}.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update user";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProvision(true);
    setActionMessage(null);

    try {
      const payload: CreateStaffPayload = {
        name: provisionName,
        email: provisionEmail || undefined,
        phone: provisionPhone,
        password: provisionPassword || "Admin@12345",
        role: provisionRole,
      };

      if (provisionRole === UserRole.VOLUNTEER) {
        payload.volunteerProfile = {
          volunteerId: `VOL-${Date.now().toString().slice(-4)}`,
          assignedVillage: provVillage,
          assignedWard: provWard,
          district: provDistrict,
        };
      } else if (provisionRole === UserRole.OFFICIAL) {
        payload.officialProfile = {
          department: provDept,
          designation: provDesignation,
          jurisdictionDistrict: provDistrict,
        };
      } else if (provisionRole === UserRole.ADMIN) {
        payload.adminProfile = {
          superAdmin: false,
          permissions: ["MANAGE_USERS", "VIEW_AUDIT"],
        };
      }

      await adminService.createUser(payload);
      setShowProvisionModal(false);
      setProvisionName("");
      setProvisionEmail("");
      setProvisionPhone("");
      setProvisionPassword("");
      setActionMessage({ type: "success", text: `Successfully provisioned ${payload.role} user: ${payload.name}` });
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setSavingProvision(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case UserRole.OFFICIAL:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Building className="w-3 h-3" /> Official
          </span>
        );
      case UserRole.VOLUNTEER:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <HeartHandshake className="w-3 h-3" /> Volunteer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
            <UserIcon className="w-3 h-3" /> Citizen
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 outline-hidden"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-purple-600 outline-hidden"
          >
            <option value="ALL">All Roles</option>
            <option value={UserRole.CITIZEN}>Citizens</option>
            <option value={UserRole.VOLUNTEER}>Volunteers</option>
            <option value={UserRole.OFFICIAL}>Officials</option>
            <option value={UserRole.ADMIN}>Administrators</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE");
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-purple-600 outline-hidden"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Deactivated</option>
          </select>

          <button
            onClick={fetchUsers}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div>
          <button
            onClick={() => setShowProvisionModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Provision Staff User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Profile & Jurisdiction</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    Loading system users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.phone}</div>
                      {u.email && <div className="text-xs text-purple-700 font-mono">{u.email}</div>}
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {u.role === UserRole.VOLUNTEER && u.volunteerProfile && (
                        <div>
                          <div className="font-medium text-slate-800">ID: {u.volunteerProfile.volunteerId}</div>
                          <div>Village: {u.volunteerProfile.assignedVillage}, {u.volunteerProfile.assignedWard}</div>
                          <div>District: {u.volunteerProfile.district}</div>
                        </div>
                      )}
                      {u.role === UserRole.OFFICIAL && u.officialProfile && (
                        <div>
                          <div className="font-medium text-slate-800">{u.officialProfile.designation}</div>
                          <div className="text-emerald-700 font-semibold">{u.officialProfile.department}</div>
                          <div>{u.officialProfile.jurisdictionTaluk || "District-level"}, {u.officialProfile.jurisdictionDistrict}</div>
                        </div>
                      )}
                      {u.role === UserRole.CITIZEN && u.citizenProfile && (
                        <div>
                          <div>{u.citizenProfile.village || "Karnataka"}, {u.citizenProfile.district}</div>
                        </div>
                      )}
                      {u.role === UserRole.ADMIN && (
                        <div className="text-purple-700 font-semibold">
                          {u.adminProfile?.superAdmin ? "Super Administrator" : "Department Administrator"}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                            u.isActive
                              ? "text-red-700 hover:bg-red-50 border border-red-200"
                              : "text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                          }`}
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{users.length}</span> of{" "}
            <span className="font-semibold text-slate-700">{total}</span> users
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit User Details</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">System Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-purple-600"
                >
                  <option value={UserRole.CITIZEN}>Citizen</option>
                  <option value={UserRole.VOLUNTEER}>Village Volunteer</option>
                  <option value={UserRole.OFFICIAL}>Department Official</option>
                  <option value={UserRole.ADMIN}>Administrator</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold transition"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision Staff Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-600" />
                Provision Staff Account
              </h3>
              <button
                type="button"
                onClick={() => setShowProvisionModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Role</label>
                <select
                  value={provisionRole}
                  onChange={(e) => setProvisionRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-purple-600"
                >
                  <option value={UserRole.VOLUNTEER}>Village Volunteer</option>
                  <option value={UserRole.OFFICIAL}>Department Official</option>
                  <option value={UserRole.ADMIN}>Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Officer / Volunteer Name"
                  value={provisionName}
                  onChange={(e) => setProvisionName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="user@vcgis.karnataka.gov.in"
                    value={provisionEmail}
                    onChange={(e) => setProvisionEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10 digits"
                    value={provisionPhone}
                    onChange={(e) => setProvisionPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  value={provisionPassword}
                  onChange={(e) => setProvisionPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {provisionRole === UserRole.VOLUNTEER && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wide block">
                    Volunteer Cluster Assignment
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Village"
                      value={provVillage}
                      onChange={(e) => setProvVillage(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Ward"
                      value={provWard}
                      onChange={(e) => setProvWard(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="District"
                      value={provDistrict}
                      onChange={(e) => setProvDistrict(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-white"
                    />
                  </div>
                </div>
              )}

              {provisionRole === UserRole.OFFICIAL && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide block">
                    Official Assignment & Jurisdiction
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Department"
                      value={provDept}
                      onChange={(e) => setProvDept(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-emerald-300 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Designation"
                      value={provDesignation}
                      onChange={(e) => setProvDesignation(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-emerald-300 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProvision}
                  className="flex-1 py-2 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold transition"
                >
                  {savingProvision ? "Provisioning..." : "Confirm & Provision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
