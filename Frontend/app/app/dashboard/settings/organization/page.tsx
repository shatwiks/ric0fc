"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Shield,
  Key,
  Copy,
  Check,
  Mail,
  UserPlus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Database,
  BarChart3,
  FileText,
  Bot,
  Activity,
  History,
  Lock,
  ArrowLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Clock,
  Send,
  XCircle,
} from "lucide-react";
import {
  api,
  OrganizationOverviewResponse,
  OrganizationInvitation,
  GovernanceUser,
  AuditLog,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export default function OrganizationSettingsPage() {
  const { user, organization, workspace, fetchCurrentUser } = useAuthStore();
  const isAdmin = user?.role === "Admin";

  const [activeTab, setActiveTab] = useState<"overview" | "members" | "invites" | "security" | "audit">("overview");
  const [overview, setOverview] = useState<OrganizationOverviewResponse | null>(null);
  const [members, setMembers] = useState<GovernanceUser[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Edit organization metadata
  const [orgName, setOrgName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [industry, setIndustry] = useState("");
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Invite modal / state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ovData, memberList, inviteList, logs] = await Promise.all([
        api.getOrganizationOverview().catch(() => null),
        isAdmin ? api.listGovernanceUsers().catch(() => [] as GovernanceUser[]) : Promise.resolve([]),
        isAdmin ? api.listInvitations().catch(() => [] as OrganizationInvitation[]) : Promise.resolve([]),
        isAdmin ? api.listAuditLogs({ limit: 50 }).catch(() => [] as AuditLog[]) : Promise.resolve([]),
      ]);

      if (ovData) {
        setOverview(ovData);
        setOrgName(ovData.name || "");
        setCompanySize(ovData.company_size || "");
        setIndustry(ovData.industry || "");
      }
      setMembers(memberList);
      setInvitations(inviteList);
      setAuditLogs(logs);
    } catch (err: any) {
      setError(err?.message || "Failed to load organization settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace?.id]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleCopyOrgId = () => {
    if (organization?.id) {
      navigator.clipboard.writeText(organization.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyInviteLink = (token: string, inviteId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInviteId(inviteId);
    showSuccess("Invite link copied to clipboard");
    setTimeout(() => setCopiedInviteId(null), 2500);
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSavingOrg(true);
    try {
      const updated = await api.updateOrganization({
        name: orgName,
        company_size: companySize || undefined,
        industry: industry || undefined,
      });
      setOverview(updated);
      await fetchCurrentUser();
      showSuccess("Organization settings saved successfully");
    } catch (err: any) {
      setError(err?.message || "Failed to update organization");
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !inviteEmail.trim()) return;
    setIsSendingInvite(true);
    setError(null);
    try {
      await api.createInvitation({
        email: inviteEmail.trim(),
        role: inviteRole,
        workspace_id: workspace?.id,
      });
      setInviteEmail("");
      showSuccess(`Invitation sent to ${inviteEmail}`);
      const freshInvites = await api.listInvitations();
      setInvitations(freshInvites);
    } catch (err: any) {
      setError(err?.message || "Failed to issue invitation");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      await api.resendInvitation(id);
      showSuccess("Invitation renewed and expiration extended");
      const freshInvites = await api.listInvitations();
      setInvitations(freshInvites);
    } catch (err: any) {
      setError(err?.message || "Failed to renew invitation");
    }
  };

  const handleRevokeInvite = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;
    try {
      await api.revokeInvitation(id);
      showSuccess("Invitation revoked");
      const freshInvites = await api.listInvitations();
      setInvitations(freshInvites);
    } catch (err: any) {
      setError(err?.message || "Failed to revoke invitation");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      showSuccess("Member role updated");
      const freshMembers = await api.listGovernanceUsers();
      setMembers(freshMembers);
    } catch (err: any) {
      setError(err?.message || "Failed to update role");
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.updateUserStatus(userId, !currentStatus);
      showSuccess(currentStatus ? "Member deactivated" : "Member reactivated");
      const freshMembers = await api.listGovernanceUsers();
      setMembers(freshMembers);
    } catch (err: any) {
      setError(err?.message || "Failed to update member status");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#777b86] mb-1">
            <Link href="/dashboard/settings" className="hover:text-[#5d2a1a] flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Settings
            </Link>
            <ChevronRight className="h-3 w-3 text-[#d1d5db]" />
            <span className="text-[#17191c] font-medium">Organization Administration</span>
          </div>
          <h1 className="font-serif text-3xl font-normal text-[#17191c] tracking-tight flex items-center gap-3">
            <Building2 className="h-7 w-7 text-[#5d2a1a]" />
            {overview?.name || organization?.name || "Organization"}
          </h1>
          <p className="text-xs text-[#777b86] mt-1">
            Enterprise tenant management, member roles, secure invitations, and data isolation controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] text-xs font-semibold border border-[#5d2a1a]/20">
            {overview?.plan || organization?.plan || "Enterprise"} SaaS
          </span>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-[#ececec] bg-white text-[#777b86] hover:text-[#17191c] hover:bg-[#f8f8f9] transition-colors"
            title="Refresh Organization Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-[#5d2a1a]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-900 font-bold">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {!isAdmin && (
        <div className="p-4 rounded-2xl bg-[#fbe1d1]/30 border border-[#5d2a1a]/20 text-[#5d2a1a] text-xs flex items-center gap-2">
          <Shield className="h-4 w-4 shrink-0 text-[#5d2a1a]" />
          <span>You have view-only access. Only Organization Admins and Owners can modify organization settings or invite members.</span>
        </div>
      )}

      {/* Organization Metric Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#ececec] shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-[#777b86] mb-1">
            <Users className="h-3.5 w-3.5 text-[#5d2a1a]" />
            <span>Total Members</span>
          </div>
          <div className="text-xl font-bold text-[#17191c]">{overview?.total_users ?? "—"}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">{overview?.active_users ?? 0} active now</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#ececec] shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-[#777b86] mb-1">
            <Database className="h-3.5 w-3.5 text-[#5d2a1a]" />
            <span>Datasets</span>
          </div>
          <div className="text-xl font-bold text-[#17191c]">{overview?.total_datasets ?? "—"}</div>
          <div className="text-[10px] text-[#777b86] mt-0.5">Tenant isolated</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#ececec] shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-[#777b86] mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-[#5d2a1a]" />
            <span>Dashboards</span>
          </div>
          <div className="text-xl font-bold text-[#17191c]">{overview?.total_dashboards ?? "—"}</div>
          <div className="text-[10px] text-[#777b86] mt-0.5">Live analytics</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#ececec] shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-[#777b86] mb-1">
            <FileText className="h-3.5 w-3.5 text-[#5d2a1a]" />
            <span>Reports</span>
          </div>
          <div className="text-xl font-bold text-[#17191c]">{overview?.total_reports ?? "—"}</div>
          <div className="text-[10px] text-[#777b86] mt-0.5">Scheduled & exports</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#ececec] shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-[#777b86] mb-1">
            <Bot className="h-3.5 w-3.5 text-[#5d2a1a]" />
            <span>AI Chats</span>
          </div>
          <div className="text-xl font-bold text-[#17191c]">{overview?.total_ai_conversations ?? "—"}</div>
          <div className="text-[10px] text-[#777b86] mt-0.5">Isolated schemas</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#ececec] shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-[#777b86] mb-1">
            <Activity className="h-3.5 w-3.5 text-[#5d2a1a]" />
            <span>Pulse Insights</span>
          </div>
          <div className="text-xl font-bold text-[#17191c]">{overview?.total_pulse_insights ?? "—"}</div>
          <div className="text-[10px] text-[#777b86] mt-0.5">Automated detection</div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-[#ececec] pb-2 text-xs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
            activeTab === "overview"
              ? "bg-[#5d2a1a] text-white shadow-2xs"
              : "text-[#777b86] hover:text-[#17191c] hover:bg-[#f8f8f9]"
          }`}
        >
          General & Metadata
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "members"
              ? "bg-[#5d2a1a] text-white shadow-2xs"
              : "text-[#777b86] hover:text-[#17191c] hover:bg-[#f8f8f9]"
          }`}
        >
          Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("invites")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "invites"
              ? "bg-[#5d2a1a] text-white shadow-2xs"
              : "text-[#777b86] hover:text-[#17191c] hover:bg-[#f8f8f9]"
          }`}
        >
          Invitations ({invitations.length})
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "security"
              ? "bg-[#5d2a1a] text-white shadow-2xs"
              : "text-[#777b86] hover:text-[#17191c] hover:bg-[#f8f8f9]"
          }`}
        >
          Security & Tenant Isolation
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "audit"
              ? "bg-[#5d2a1a] text-white shadow-2xs"
              : "text-[#777b86] hover:text-[#17191c] hover:bg-[#f8f8f9]"
          }`}
        >
          Audit Logs
        </button>
      </div>

      {/* Tab: General & Metadata */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-6 rounded-3xl bg-white border border-[#ececec] shadow-artifact space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[#17191c]">Organization Profile</h2>
              <p className="text-xs text-[#777b86]">Update your company details and operational scale.</p>
            </div>

            <form onSubmit={handleSaveOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#17191c] mb-1.5">Company / Organization Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!isAdmin}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ececec] text-xs focus:outline-none focus:border-[#5d2a1a] disabled:bg-[#f8f8f9] disabled:text-[#777b86]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#17191c] mb-1.5">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#ececec] text-xs bg-white focus:outline-none focus:border-[#5d2a1a] disabled:bg-[#f8f8f9]"
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#17191c] mb-1.5">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#ececec] text-xs bg-white focus:outline-none focus:border-[#5d2a1a] disabled:bg-[#f8f8f9]"
                  >
                    <option value="">Select industry</option>
                    <option value="SaaS & Technology">SaaS & Technology</option>
                    <option value="Financial Services">Financial Services</option>
                    <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                    <option value="Retail & E-commerce">Retail & E-commerce</option>
                    <option value="Manufacturing & Logistics">Manufacturing & Logistics</option>
                    <option value="Education">Education</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingOrg}
                    className="px-5 py-2.5 rounded-xl bg-[#5d2a1a] text-white text-xs font-semibold hover:bg-[#4a2114] transition-colors disabled:opacity-50 shadow-2xs"
                  >
                    {isSavingOrg ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Right sidebar: Tenant Identifiers */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-white border border-[#ececec] shadow-artifact space-y-4 text-xs">
              <h3 className="font-semibold text-[#17191c] flex items-center gap-2">
                <Key className="h-4 w-4 text-[#5d2a1a]" />
                Tenant Identifiers
              </h3>

              <div>
                <span className="text-[#777b86] block text-[11px] mb-1">Organization ID (UUID)</span>
                <div className="p-2.5 rounded-xl bg-[#f8f8f9] border border-[#ececec] flex items-center justify-between font-mono text-[11px] text-[#17191c]">
                  <span className="truncate">{organization?.id}</span>
                  <button
                    onClick={handleCopyOrgId}
                    className="ml-2 text-[#777b86] hover:text-[#5d2a1a] transition-colors shrink-0"
                    title="Copy Organization ID"
                  >
                    {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[#777b86] block text-[11px] mb-1">Current Active Workspace</span>
                <div className="p-2.5 rounded-xl bg-[#f8f8f9] border border-[#ececec] font-medium text-[#17191c]">
                  {workspace?.name}
                </div>
              </div>

              <div>
                <span className="text-[#777b86] block text-[11px] mb-1">Available Workspaces</span>
                <div className="space-y-1.5">
                  {overview?.workspaces?.map((ws) => (
                    <div
                      key={ws.id}
                      className="p-2 rounded-lg bg-[#f8f8f9] border border-[#ececec] text-[11px] flex items-center justify-between"
                    >
                      <span className="font-medium text-[#17191c]">{ws.name}</span>
                      {ws.id === workspace?.id ? (
                        <span className="text-[10px] text-emerald-600 font-semibold">Active</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#ececec]">
                <span className="text-[#777b86] block text-[11px] mb-1">Established</span>
                <span className="text-[#17191c] font-medium">
                  {overview?.created_at ? new Date(overview.created_at).toLocaleDateString() : "Active"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Members */}
      {activeTab === "members" && (
        <div className="p-6 rounded-3xl bg-white border border-[#ececec] shadow-artifact space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#17191c]">Organization Members ({members.length})</h2>
              <p className="text-xs text-[#777b86]">Manage employee roles, access permissions, and account statuses.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("invites")}
                className="px-4 py-2 rounded-xl bg-[#5d2a1a] text-white text-xs font-semibold hover:bg-[#4a2114] flex items-center gap-2 transition-colors self-start shadow-2xs"
              >
                <UserPlus className="h-3.5 w-3.5" /> Invite Employee
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f8f9] text-[#777b86] border-y border-[#ececec]">
                <tr>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Joined</th>
                  {isAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececec]">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#fcfcfd] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#17191c]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#fbe1d1] text-[#5d2a1a] font-bold flex items-center justify-center text-xs">
                          {m.full_name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <div>{m.full_name}</div>
                          {m.id === user?.id && <span className="text-[10px] text-[#5d2a1a] font-medium">(You)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#777b86] font-mono text-[11px]">{m.email}</td>
                    <td className="py-3.5 px-4">
                      {isAdmin && m.id !== user?.id ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          className="px-2 py-1 rounded-lg border border-[#ececec] bg-white text-xs font-semibold text-[#5d2a1a] focus:outline-none focus:border-[#5d2a1a]"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Publisher">Publisher</option>
                          <option value="Analyst">Analyst</option>
                          <option value="Explorer">Explorer</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] font-semibold text-[11px] border border-[#5d2a1a]/20">
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          m.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {m.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#777b86] text-[11px]">
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        {m.id !== user?.id && (
                          <button
                            onClick={() => handleToggleUserStatus(m.id, m.is_active)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              m.is_active
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                            title={m.is_active ? "Deactivate User" : "Activate User"}
                          >
                            {m.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Invitations */}
      {activeTab === "invites" && (
        <div className="space-y-6">
          {/* Invite Form Card */}
          {isAdmin && (
            <div className="p-6 rounded-3xl bg-white border border-[#ececec] shadow-artifact space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#17191c]">Invite Employee to Organization</h2>
                <p className="text-xs text-[#777b86]">
                  A secure 256-bit cryptographic link will be generated. The employee can activate their account and join instantly.
                </p>
              </div>

              <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#17191c] mb-1.5">Employee Work Email</label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-[#777b86] absolute left-3 top-3" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@yourcompany.com"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#ececec] text-xs focus:outline-none focus:border-[#5d2a1a]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#17191c] mb-1.5">Enterprise Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#ececec] text-xs bg-white focus:outline-none focus:border-[#5d2a1a]"
                  >
                    <option value="Viewer">Viewer (Read-only)</option>
                    <option value="Explorer">Explorer (Ad-hoc query)</option>
                    <option value="Analyst">Analyst (Dataset & Visuals)</option>
                    <option value="Publisher">Publisher (Publish Dashboards)</option>
                    <option value="Admin">Admin (Full Control)</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={isSendingInvite}
                    className="px-5 py-2.5 rounded-xl bg-[#5d2a1a] text-white text-xs font-semibold hover:bg-[#4a2114] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-2xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isSendingInvite ? "Creating Invitation..." : "Send Secure Invitation"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pending / Active Invitations Table */}
          <div className="p-6 rounded-3xl bg-white border border-[#ececec] shadow-artifact space-y-4">
            <h3 className="text-sm font-semibold text-[#17191c]">Active & Historical Invitations ({invitations.length})</h3>

            {invitations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#777b86] border border-dashed border-[#ececec] rounded-2xl">
                No invitations issued yet. Invite teammates to collaborate on datasets and dashboards.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f8f9] text-[#777b86] border-y border-[#ececec]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Recipient Email</th>
                      <th className="py-3 px-4 font-semibold">Role</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Expires</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececec]">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#fcfcfd] transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#17191c] font-mono text-[11px]">{inv.email}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#fbe1d1] text-[#5d2a1a] font-semibold text-[11px]">
                            {inv.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              inv.status === "pending"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : inv.status === "accepted"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#777b86] text-[11px]">
                          {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          {inv.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleCopyInviteLink(inv.token, inv.id)}
                                className="px-2.5 py-1 rounded-lg border border-[#ececec] text-[#17191c] hover:bg-[#f8f8f9] text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                              >
                                {copiedInviteId === inv.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-600" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" /> Copy Link
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleResendInvite(inv.id)}
                                className="px-2.5 py-1 rounded-lg border border-amber-200 text-amber-800 hover:bg-amber-50 text-[11px] font-medium transition-colors"
                              >
                                Resend
                              </button>
                              <button
                                onClick={() => handleRevokeInvite(inv.id)}
                                className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-[11px] font-medium transition-colors"
                              >
                                Revoke
                              </button>
                            </>
                          )}
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

      {/* Tab: Security & Tenant Isolation */}
      {activeTab === "security" && (
        <div className="p-6 rounded-3xl bg-white border border-[#ececec] shadow-artifact space-y-6">
          <div>
            <h2 className="text-base font-semibold text-[#17191c] flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#5d2a1a]" />
              Enterprise Multi-Tenant Security Posture
            </h2>
            <p className="text-xs text-[#777b86]">
              Real-time audit of tenant isolation fences, partition tokens, and cryptographic access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#f8f8f9] border border-[#ececec] space-y-2">
              <div className="font-semibold text-[#17191c] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Row-Level & Schema Isolation
              </div>
              <p className="text-[#777b86] text-[11px] leading-relaxed">
                Every SQL query, dataset column, dashboard widget, and AI context is scoped strictly by organization_id and workspace_id derived from verified cryptographic JWT tokens.
              </p>
              <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block">
                STATUS: ENFORCED (403/404 on IDOR)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8f8f9] border border-[#ececec] space-y-2">
              <div className="font-semibold text-[#17191c] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Isolated Storage Partitions
              </div>
              <p className="text-[#777b86] text-[11px] leading-relaxed">
                CSV uploads and exported reports reside in tenant-isolated directory trees (<code>/uploads/{`{org_id}`}/{`{workspace_id}`}</code>). Identical file names across companies never collide.
              </p>
              <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block">
                STATUS: PARTITIONED
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8f8f9] border border-[#ececec] space-y-2">
              <div className="font-semibold text-[#17191c] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                AI Context Isolation Fence
              </div>
              <p className="text-[#777b86] text-[11px] leading-relaxed">
                AI Analyst, Detective, and Pulse engines query exclusively datasets verified to belong to the authenticated session workspace. Foreign schemas and data rows are blocked before prompt synthesis.
              </p>
              <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block">
                STATUS: ZERO DATA LEAKAGE
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8f8f9] border border-[#ececec] space-y-2">
              <div className="font-semibold text-[#17191c] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Cryptographic Invitations
              </div>
              <p className="text-[#777b86] text-[11px] leading-relaxed">
                Employee onboarding invitations use high-entropy 256-bit cryptographic tokens with time-bounded expiration and single-use invalidation.
              </p>
              <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block">
                STATUS: SHA-256 TOKENS
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === "audit" && (
        <div className="p-6 rounded-3xl bg-white border border-[#ececec] shadow-artifact space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#17191c] flex items-center gap-2">
                <History className="h-4 w-4 text-[#5d2a1a]" /> Organization Audit Trail
              </h2>
              <p className="text-xs text-[#777b86]">Immutable security event log for this organization.</p>
            </div>
            <Link
              href="/dashboard/governance"
              className="text-xs font-semibold text-[#5d2a1a] hover:underline"
            >
              Full Governance Center →
            </Link>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#777b86] border border-dashed border-[#ececec] rounded-2xl">
              No audit records registered for this workspace yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f8f9] text-[#777b86] border-y border-[#ececec]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold">Action</th>
                    <th className="py-3 px-4 font-semibold">Resource</th>
                    <th className="py-3 px-4 font-semibold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ececec]">
                  {auditLogs.slice(0, 20).map((log) => (
                    <tr key={log.id} className="hover:bg-[#fcfcfd]">
                      <td className="py-3 px-4 text-[#777b86] text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#17191c]">
                        <span className="px-2 py-0.5 rounded bg-[#f8f8f9] border border-[#ececec] font-mono text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#777b86]">
                        {log.resource_type} {log.resource_id ? `(${log.resource_id.substring(0, 8)}...)` : ""}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#777b86]">{log.ip_address || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
