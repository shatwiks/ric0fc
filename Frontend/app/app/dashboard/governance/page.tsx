"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Users,
  KeyRound,
  History,
  Lock,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Info,
  X,
  UserCheck,
  UserX,
  FileCheck2,
  Shield,
  Layers,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  api,
  GovernanceUser,
  AuditLog,
  GovernanceOverview,
  RolePermissionInfo,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export default function GovernancePage() {
  const { user: currentLoggedInUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"users" | "audit" | "overview">("users");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ricozviz_gov_tab");
      if (saved === "audit" || saved === "overview" || saved === "users") {
        setActiveTab(saved as any);
      }
    }
  }, []);

  const handleTabSelect = (tab: "users" | "audit" | "overview") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("ricozviz_gov_tab", tab);
    }
  };

  // State
  const [users, setUsers] = useState<GovernanceUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [overview, setOverview] = useState<GovernanceOverview | null>(null);
  const [roles, setRoles] = useState<RolePermissionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Users Tab Search & Filters
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Audit Tab Search & Filters
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");

  // Invite User Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Role Permissions Matrix Modal State
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);

  const isAdmin = currentLoggedInUser?.role === "Admin";

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [userList, logs, ov, roleList] = await Promise.all([
        isAdmin ? api.listGovernanceUsers().catch(() => [] as GovernanceUser[]) : Promise.resolve([]),
        isAdmin ? api.listAuditLogs({ limit: 150 }).catch(() => [] as AuditLog[]) : Promise.resolve([]),
        isAdmin ? api.getGovernanceOverview().catch(() => null) : Promise.resolve(null),
        api.getRoleDefinitions().catch(() => [] as RolePermissionInfo[]),
      ]);
      setUsers(userList);
      setAuditLogs(logs);
      setOverview(ov);
      setRoles(roleList);
    } catch (err: any) {
      setError(err.message || "Failed to load governance information.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  // Invite / Create user
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim() || !invitePassword.trim()) return;
    setIsSubmittingInvite(true);
    setError(null);
    try {
      const created = await api.inviteUser({
        full_name: inviteName.trim(),
        email: inviteEmail.trim(),
        password: invitePassword.trim(),
        role: inviteRole,
      });
      setUsers([...users, created]);
      setIsInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      setActionSuccess(`User ${created.email} invited with role ${created.role}!`);
      setTimeout(() => setActionSuccess(null), 3500);

      // Refresh audit logs
      if (isAdmin) {
        api.listAuditLogs({ limit: 150 }).then(setAuditLogs).catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || "Failed to add user.");
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // Change user role
  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const updated = await api.updateUserRole(userId, newRole);
      setUsers(users.map((u) => (u.id === userId ? updated : u)));
      setActionSuccess(`Updated ${updated.email} to role: ${updated.role}`);
      setTimeout(() => setActionSuccess(null), 3000);

      // Refresh audit logs
      if (isAdmin) {
        api.listAuditLogs({ limit: 150 }).then(setAuditLogs).catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || "Failed to change user role.");
    }
  };

  // Toggle user active status
  const handleToggleStatus = async (u: GovernanceUser) => {
    try {
      const updated = await api.updateUserStatus(u.id, !u.is_active);
      setUsers(users.map((user) => (user.id === u.id ? updated : user)));
      setActionSuccess(`${updated.email} is now ${updated.is_active ? "Active" : "Deactivated"}`);
      setTimeout(() => setActionSuccess(null), 3000);

      if (isAdmin) {
        api.listAuditLogs({ limit: 150 }).then(setAuditLogs).catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || "Failed to update user status.");
    }
  };

  // Delete user
  const handleDeleteUser = async (u: GovernanceUser) => {
    if (!confirm(`Permanently remove ${u.email} from the workspace?`)) return;
    try {
      await api.deleteUser(u.id);
      setUsers(users.filter((user) => user.id !== u.id));
      setActionSuccess(`Removed ${u.email}`);
      setTimeout(() => setActionSuccess(null), 3000);

      if (isAdmin) {
        api.listAuditLogs({ limit: 150 }).then(setAuditLogs).catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || "Failed to remove user.");
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    const matchesSearch = u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (roleFilter !== "all" && u.role.toLowerCase() !== roleFilter.toLowerCase()) return false;
    return true;
  });

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter((l) => {
    const q = auditSearchQuery.toLowerCase();
    const matchesSearch =
      l.action.toLowerCase().includes(q) ||
      (l.user_email && l.user_email.toLowerCase().includes(q)) ||
      (l.resource_type && l.resource_type.toLowerCase().includes(q)) ||
      (l.resource_id && l.resource_id.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    if (auditActionFilter !== "all") {
      if (auditActionFilter === "auth" && !l.action.startsWith("auth:")) return false;
      if (auditActionFilter === "dataset" && !l.action.startsWith("dataset:")) return false;
      if (auditActionFilter === "dashboard" && !l.action.startsWith("dashboard:")) return false;
      if (auditActionFilter === "export" && !l.action.startsWith("export:")) return false;
      if (auditActionFilter === "governance" && !l.action.startsWith("governance:")) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 select-none">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#ececec]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#17191c] tracking-[-0.66px]">
              Governance & Access
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5d2a1a]" />
              <span>PostgreSQL Governed</span>
            </span>
          </div>
          <p className="text-sm text-[#777b86] max-w-2xl leading-relaxed">
            Manage enterprise role-based access control, enforce least-privilege boundaries, and monitor immutable security audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMatrixOpen(true)}
            id="view-role-matrix-btn"
            className="px-4 py-2.5 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] font-normal text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4 text-[#5d2a1a]" />
            <span>Permissions Matrix</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsInviteOpen(true)}
              id="invite-member-btn"
              className="px-5 py-2.5 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          )}

          <button
            onClick={loadData}
            id="refresh-governance-btn"
            className="p-2.5 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] transition-colors shadow-sm cursor-pointer"
            title="Refresh Governance Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#5d2a1a]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Non-admin Notice */}
      {!isAdmin && (
        <div className="p-4 rounded-[16px] bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-700 shrink-0" />
          <span>
            You are logged in with the <b>{currentLoggedInUser?.role}</b> role. Only <b>Admin</b> members can modify workspace users, update roles, or inspect full security audit trails.
          </span>
        </div>
      )}

      {/* Action Success Toast */}
      {actionSuccess && (
        <div className="p-4 rounded-[16px] bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in" id="governance-success-toast">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f2f2f3] text-[#17191c] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-normal text-[#979799] uppercase tracking-wider">
              Total Members
            </p>
            <p className="text-2xl font-serif font-normal text-[#17191c] tracking-tight mt-0.5" id="metric-total-members">
              {overview?.total_users ?? users.length}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#fbe1d1] text-[#5d2a1a] flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-normal text-[#979799] uppercase tracking-wider">
              Defined Roles
            </p>
            <p className="text-2xl font-serif font-normal text-[#17191c] tracking-tight mt-0.5">
              5 Tiers
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f2f2f3] text-[#17191c] flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-normal text-[#979799] uppercase tracking-wider">
              Audit Events
            </p>
            <p className="text-2xl font-serif font-normal text-[#17191c] tracking-tight mt-0.5" id="metric-audit-events">
              {overview?.total_audit_logs ?? auditLogs.length}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f2f2f3] text-[#17191c] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-normal text-[#979799] uppercase tracking-wider">
              Security Boundary
            </p>
            <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Isolated Multi-Tenant
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-6 border-b border-[#ececec] pb-2">
          <button
            onClick={() => handleTabSelect("users")}
            id="tab-members-rbac"
            className={`text-sm font-medium pb-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "users"
                ? "border-[#17191c] text-[#17191c]"
                : "border-transparent text-[#777b86] hover:text-[#17191c]"
            }`}
          >
            Workspace Members & Roles ({users.length})
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => handleTabSelect("audit")}
                id="tab-audit-trail"
                className={`text-sm font-medium pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === "audit"
                    ? "border-[#17191c] text-[#17191c]"
                    : "border-transparent text-[#777b86] hover:text-[#17191c]"
                }`}
              >
                Security Audit Trail ({auditLogs.length})
              </button>
              <button
                onClick={() => handleTabSelect("overview")}
                id="tab-security-overview"
                className={`text-sm font-medium pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === "overview"
                    ? "border-[#17191c] text-[#17191c]"
                    : "border-transparent text-[#777b86] hover:text-[#17191c]"
                }`}
              >
                Security Posture & Compliance
              </button>
            </>
          )}
        </div>

        {/* Tab 1: Workspace Members & Roles */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-[#a3a6af] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Filter members by name or email..."
                  id="search-members-input"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#ececec] rounded-full text-xs text-[#17191c] outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(["all", "Admin", "Publisher", "Analyst", "Explorer", "Viewer"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    id={`filter-role-${r.toLowerCase()}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize cursor-pointer ${
                      roleFilter.toLowerCase() === r.toLowerCase()
                        ? "bg-[#17191c] text-white shadow-sm"
                        : "bg-[#ffffff] text-[#777b86] border border-[#ececec] hover:bg-[#f2f2f3]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact overflow-hidden">
              {isLoading ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-12 bg-[#f2f2f3] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <Users className="w-10 h-10 text-[#777b86] mb-2" />
                  <h3 className="text-base font-serif font-normal text-[#17191c]">No members found</h3>
                  <p className="text-xs text-[#777b86] max-w-sm mt-1">
                    Try adjusting your search criteria or invite a new workspace member.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" id="members-table">
                    <thead className="bg-[#f9f9fa] border-b border-[#ececec] text-[#777b86] uppercase font-mono text-[10px]">
                      <tr>
                        <th className="py-3 px-6">Member</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Joined Date</th>
                        {isAdmin && <th className="py-3 px-6 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ececec]">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-[#f9f9fa] transition-colors" id={`user-row-${u.id}`}>
                          <td className="py-3.5 px-6 font-medium text-[#17191c]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#f2f2f3] text-[#17191c] flex items-center justify-center font-bold text-xs uppercase border border-[#ececec]">
                                {u.full_name?.charAt(0) || u.email.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-[#17191c]">{u.full_name}</p>
                                <p className="text-[11px] text-[#777b86] font-mono">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role Selector */}
                          <td className="py-3.5 px-4">
                            {isAdmin ? (
                              <select
                                value={u.role}
                                onChange={(e) => handleChangeRole(u.id, e.target.value)}
                                id={`select-role-${u.id}`}
                                className="px-2.5 py-1 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-white border border-[#ececec] rounded-full text-xs font-medium text-[#17191c] outline-none cursor-pointer"
                              >
                                <option value="Viewer">Viewer</option>
                                <option value="Explorer">Explorer</option>
                                <option value="Analyst">Analyst</option>
                                <option value="Publisher">Publisher</option>
                                <option value="Admin">Admin</option>
                              </select>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#f2f2f3] text-[#17191c] border border-[#ececec]">
                                {u.role}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                                u.is_active
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {u.is_active ? "Active" : "Deactivated"}
                            </span>
                          </td>

                          {/* Joined */}
                          <td className="py-3.5 px-4 text-[#979799]">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>

                          {/* Actions (Admin Only) */}
                          {isAdmin && (
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  id={`toggle-status-btn-${u.id}`}
                                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                    u.is_active
                                      ? "text-[#777b86] hover:text-amber-700 hover:bg-amber-50"
                                      : "text-emerald-700 hover:bg-emerald-50"
                                  }`}
                                  title={u.is_active ? "Deactivate user" : "Activate user"}
                                >
                                  {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  id={`delete-user-btn-${u.id}`}
                                  className="p-1.5 rounded-full text-[#979799] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Remove member"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Security Audit Trail */}
        {activeTab === "audit" && isAdmin && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-[#a3a6af] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  placeholder="Search logs by action, user, or resource..."
                  id="search-audit-input"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#ececec] rounded-full text-xs text-[#17191c] outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(["all", "auth", "dataset", "dashboard", "export", "governance"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAuditActionFilter(cat)}
                    id={`filter-audit-${cat}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize cursor-pointer ${
                      auditActionFilter === cat
                        ? "bg-[#17191c] text-white shadow-sm"
                        : "bg-[#ffffff] text-[#777b86] border border-[#ececec] hover:bg-[#f2f2f3]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact overflow-hidden">
              {filteredAuditLogs.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <History className="w-10 h-10 text-[#777b86] mb-2" />
                  <h3 className="text-base font-serif font-normal text-[#17191c]">No audit events found</h3>
                  <p className="text-xs text-[#777b86] max-w-sm mt-1">
                    Important user events (logins, exports, creations, role changes) will stream here in real time.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" id="audit-log-table">
                    <thead className="bg-[#f9f9fa] border-b border-[#ececec] text-[#777b86] uppercase font-mono text-[10px]">
                      <tr>
                        <th className="py-3 px-6">Timestamp</th>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Resource</th>
                        <th className="py-3 px-4">Details / Metadata</th>
                        <th className="py-3 px-6 text-right">Client IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ececec] font-mono text-[11px]">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#f9f9fa] transition-colors" id={`audit-row-${log.id}`}>
                          <td className="py-3 px-6 text-[#777b86] whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-sans font-medium text-[#17191c] whitespace-nowrap">
                            {log.user_name || log.user_email || "System"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#f2f2f3] text-[#17191c] border border-[#ececec]">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-sans text-[#777b86]">
                            <span className="capitalize">{log.resource_type}</span>
                            {log.resource_id && (
                              <span className="text-[10px] font-mono text-[#979799] ml-1">
                                ({log.resource_id.slice(0, 8)}...)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-[#555555]">
                            {JSON.stringify(log.details)}
                          </td>
                          <td className="py-3 px-6 text-right text-[#979799]">
                            {log.ip_address || "127.0.0.1"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Security Posture & Compliance */}
        {activeTab === "overview" && isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-7 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                Enterprise Posture
              </span>
              <h3 className="text-xl font-serif font-normal text-[#17191c]">
                Continuous Governance Status
              </h3>
              <p className="text-xs text-[#777b86] leading-relaxed">
                RicozViz operates with multi-tenant workspace isolation. Database transactions enforce ACID integrity on PostgreSQL, and every analytical extraction is audited in the security ledger.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-[16px] bg-[#f9f9fa] border border-[#ececec]">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-[#17191c]">SOC2 Type II Audit Logging</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-[16px] bg-[#f9f9fa] border border-[#ececec]">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-[#17191c]">FastAPI Strict RBAC Enforced</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Enforced
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-[16px] bg-[#f9f9fa] border border-[#ececec]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-[#17191c]">DuckDB Memory Sandbox</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Isolated
                  </span>
                </div>
              </div>
            </div>

            <div className="p-7 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                Role Distribution
              </span>
              <h3 className="text-xl font-serif font-normal text-[#17191c]">
                Active Member Tiers
              </h3>
              <p className="text-xs text-[#777b86]">
                Distribution of permission tiers across current organization users.
              </p>

              <div className="space-y-3 pt-2">
                {overview?.users_by_role &&
                  Object.entries(overview.users_by_role).map(([roleName, count]) => (
                    <div key={roleName} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-[#17191c]">{roleName}</span>
                        <span className="text-[#777b86]">
                          {count} ({Math.round((count / (overview.total_users || 1)) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#f2f2f3] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#17191c] h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.round((count / (overview.total_users || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-8 rounded-[24px] bg-[#ffffff] border border-[#ececec] text-[#17191c] shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsInviteOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                User Provisioning
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#17191c]">
                Add Workspace Member
              </h3>
              <p className="text-xs text-[#777b86] mt-1">
                Provision a new enterprise user account with immediate role-based permissions.
              </p>
            </div>

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Jordan Vance"
                  id="invite-name-input"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jordan@company.com"
                  id="invite-email-input"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  id="invite-password-input"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Assigned Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  id="invite-role-select"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] outline-none"
                >
                  <option value="Viewer">Viewer (Read-only)</option>
                  <option value="Explorer">Explorer (Ad-hoc Slicing)</option>
                  <option value="Analyst">Analyst (Authoring)</option>
                  <option value="Publisher">Publisher (Publishing & Sharing)</option>
                  <option value="Admin">Admin (Full Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f2f2f3]">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-5 py-2 rounded-full text-xs font-normal text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  id="confirm-invite-submit-btn"
                  className="px-6 py-2 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs sm:text-sm shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingInvite ? "Creating..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Matrix Modal */}
      {isMatrixOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div id="matrix-modal" className="w-full max-w-2xl p-8 rounded-[24px] bg-[#ffffff] border border-[#ececec] text-[#17191c] shadow-2xl space-y-5 relative max-h-[85vh] overflow-y-auto">
            <button
              id="close-matrix-modal-btn"
              onClick={() => setIsMatrixOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                Security Architecture
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#17191c]">
                Role-Based Access Control (RBAC) Matrix
              </h3>
              <p className="text-xs text-[#777b86] mt-1">
                The 5 defined enterprise tiers enforced strictly in the FastAPI backend service layer.
              </p>
            </div>

            <div className="space-y-4">
              {roles.map((r) => (
                <div key={r.role} className="p-4 rounded-[16px] bg-[#f9f9fa] border border-[#ececec] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#17191c]">{r.role}</span>
                    <span className="text-[11px] font-mono text-[#979799]">
                      {r.permissions.length} Permissions
                    </span>
                  </div>
                  <p className="text-xs text-[#777b86]">{r.description}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {r.permissions.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white border border-[#ececec] text-[#555555]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#ececec]">
              <button
                type="button"
                onClick={() => setIsMatrixOpen(false)}
                className="px-6 py-2.5 rounded-full bg-[#17191c] text-white hover:bg-black font-normal text-xs sm:text-sm cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
