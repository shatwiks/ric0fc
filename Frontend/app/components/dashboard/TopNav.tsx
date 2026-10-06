"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import {
  Building2,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Menu,
  ChevronDown,
  Check,
  Plus,
  Settings,
  ShieldCheck,
  ExternalLink,
  User as UserIcon,
} from "lucide-react";

interface TopNavProps {
  onOpenMobile?: () => void;
}

const routeTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/dashboards": "Dashboards",
  "/dashboard/explore": "Data Explorer",
  "/dashboard/datasets": "Datasets & Sources",
  "/dashboard/visualisations": "Visualisation Studio",
  "/dashboard/ai-analyst": "AI Analyst",
  "/dashboard/data-detective": "Data Detective",
  "/dashboard/pulse": "RicozPulse",
  "/dashboard/marketplace": "Data Marketplace",
  "/dashboard/reports": "Reports & Schedules",
  "/dashboard/governance": "Governance & Audit",
  "/dashboard/settings": "Workspace Settings",
};

export default function TopNav({ onOpenMobile }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, organization, workspace, setActiveWorkspace, addWorkspace, logout, permissions } = useAuthStore();

  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // New workspace creation state
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isSubmittingWs, setIsSubmittingWs] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setIsWorkspaceMenuOpen(false);
        setIsCreatingWorkspace(false);
        setNewWorkspaceName("");
        setWorkspaceError(null);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    api
      .checkHealth()
      .then((res) => {
        if (isMounted) {
          setBackendStatus(res.database === "connected" ? "online" : "offline");
        }
      })
      .catch(() => {
        if (isMounted) setBackendStatus("offline");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await logout();
    router.push("/auth/login");
  };

  const currentSection = routeTitles[pathname] || "Dashboard";
  const workspacesList = organization?.workspaces || (workspace ? [workspace] : []);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name) return;

    setIsSubmittingWs(true);
    setWorkspaceError(null);
    try {
      const created = await api.createWorkspace(name);
      addWorkspace(created);
      setIsCreatingWorkspace(false);
      setNewWorkspaceName("");
      setIsWorkspaceMenuOpen(false);
    } catch (err: any) {
      setWorkspaceError(err.message || "Failed to create workspace.");
    } finally {
      setIsSubmittingWs(false);
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case "Admin":
        return "bg-[#fbe1d1] text-[#5d2a1a] border-[#5d2a1a]/20";
      case "Analyst":
        return "bg-[#f2f2f3] text-[#17191c] border-[#ececec]";
      case "Publisher":
        return "bg-[#f2f2f3] text-[#17191c] border-[#ececec]";
      default:
        return "bg-[#f2f2f3] text-[#777b86] border-[#ececec]";
    }
  };

  return (
    <header className="h-16 z-30 flex items-center justify-between px-4 md:px-8 bg-[#ffffff] border-b border-[#ececec] shrink-0 select-none">
      {/* Left Area: Mobile hamburger & Workspace Switcher + Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenMobile}
          className="p-2 rounded-full bg-[#f2f2f3] hover:bg-[#eaebee] text-[#17191c] md:hidden transition-colors cursor-pointer"
          title="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Workspace Switcher Popover Pill */}
        <div className="relative" ref={workspaceRef}>
          <button
            onClick={() => {
              setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen);
              if (isWorkspaceMenuOpen) {
                setIsCreatingWorkspace(false);
                setNewWorkspaceName("");
                setWorkspaceError(null);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#faf8f5] hover:bg-[#f2eee7] border border-[#e8e4db] text-xs text-[#17191c] text-left transition-all cursor-pointer group shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5 text-[#5d2a1a] shrink-0" />
            <span className="font-medium text-[#17191c] max-w-[130px] sm:max-w-[180px] lg:max-w-[220px] truncate">
              {organization?.name || "Ricoz Enterprise"}
            </span>
            <span className="text-[#c4bfb6] hidden sm:inline">/</span>
            <div className="hidden sm:flex items-center gap-1.5 text-[#595551]">
              <Layers className="w-3.5 h-3.5 text-[#5d2a1a]/70 shrink-0" />
              <span className="max-w-[180px] md:max-w-[260px] truncate font-medium text-[#2c2a29]">
                {workspace?.name || "Main Workspace"}
              </span>
            </div>
            <ChevronDown
              className={`w-3 h-3 text-[#777b86] transition-transform duration-200 ${
                isWorkspaceMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Workspace Dropdown */}
          {isWorkspaceMenuOpen && (
            <div className="absolute left-0 mt-2 w-80 p-2.5 bg-[#ffffff] border border-[#eceae5] rounded-[20px] shadow-xl shadow-black/8 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Organization Header */}
              <div className="px-3.5 py-2.5 bg-[#fbf9f5] rounded-[16px] border border-[#eee9df] mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#7c7771]">
                    Organization
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20">
                    {organization?.plan || "Enterprise"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#5d2a1a] shrink-0" />
                  <p className="text-xs font-semibold text-[#17191c] truncate">
                    {organization?.name || "Ricoz Enterprise Analytics"}
                  </p>
                </div>
              </div>

              {/* Workspaces List */}
              <div className="px-1 py-1">
                <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-medium text-[#7c7771] uppercase tracking-wider">
                  <span>Workspaces</span>
                  <span>{workspacesList.length} total</span>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                  {workspacesList.map((ws) => {
                    const isSelected = workspace?.id === ws.id;
                    return (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setActiveWorkspace(ws);
                          setIsWorkspaceMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-[14px] text-xs transition-all text-left cursor-pointer group ${
                          isSelected
                            ? "bg-[#201d1a] text-[#fbf9f5] font-medium shadow-2xs"
                            : "text-[#2c2a29] hover:bg-[#f8f6f1]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div
                            className={`w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-[#ffffff]/12 text-[#fbe1d1]"
                                : "bg-[#f2eee7] text-[#5d2a1a] group-hover:bg-[#ebe5d9]"
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate flex flex-col min-w-0">
                            <span className="truncate text-xs font-medium leading-snug">
                              {ws.name}
                            </span>
                            <span
                              className={`text-[10px] leading-none mt-0.5 ${
                                isSelected ? "text-[#e2ded6]" : "text-[#7c7771]"
                              }`}
                            >
                              {isSelected ? "Active workspace" : "Switch workspace"}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#fbe1d1] flex items-center justify-center shrink-0 ml-2 shadow-2xs">
                            <Check className="w-3 h-3 text-[#5d2a1a] stroke-[2.5]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-2 mt-2 border-t border-[#eee9df]">
                {!isCreatingWorkspace ? (
                  <div className="space-y-1">
                    <button
                      onClick={() => setIsCreatingWorkspace(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-xs font-medium text-[#5d2a1a] hover:bg-[#fbe1d1]/30 transition-colors cursor-pointer text-left group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-[#fbe1d1]/50 group-hover:bg-[#fbe1d1] flex items-center justify-center shrink-0 transition-colors">
                        <Plus className="w-3.5 h-3.5 text-[#5d2a1a]" />
                      </div>
                      <span>Create New Workspace</span>
                    </button>

                    <Link
                      href="/dashboard/settings"
                      onClick={() => setIsWorkspaceMenuOpen(false)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-[12px] text-[11px] text-[#7c7771] hover:text-[#17191c] hover:bg-[#f8f6f1] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Settings className="w-3 h-3" />
                        <span>Manage Workspaces</span>
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 text-[#a3a099]" />
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleCreateWorkspace} className="p-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#17191c]">New Workspace</span>
                      <span className="text-[10px] text-[#7c7771]">Press Enter to create</span>
                    </div>
                    <input
                      type="text"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      placeholder="e.g. Executive Analytics"
                      autoFocus
                      maxLength={50}
                      className="w-full px-3 py-1.5 text-xs rounded-[10px] bg-[#fbf9f5] border border-[#d8d2c5] focus:outline-none focus:border-[#5d2a1a] focus:ring-1 focus:ring-[#5d2a1a] text-[#17191c] placeholder:text-[#979799]"
                    />
                    {workspaceError && (
                      <p className="text-[10px] text-rose-600">{workspaceError}</p>
                    )}
                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingWorkspace(false);
                          setNewWorkspaceName("");
                          setWorkspaceError(null);
                        }}
                        className="px-2.5 py-1 text-[11px] text-[#7c7771] hover:text-[#17191c] rounded-md transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newWorkspaceName.trim() || isSubmittingWs}
                        className="px-3 py-1 text-[11px] font-medium bg-[#5d2a1a] text-white rounded-md hover:bg-[#461e12] disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        {isSubmittingWs ? "Creating..." : "Create Workspace"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Breadcrumbs in Signifier Serif */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-[#777b86] pl-3 border-l border-[#ececec]">
          <Link href="/dashboard" className="hover:text-[#17191c] transition-colors">
            Workspace
          </Link>
          <span className="text-[#a3a6af]">/</span>
          <span className="text-[#17191c] font-medium font-serif">{currentSection}</span>
        </div>
      </div>

      {/* Right Area: DB Health indicator & Profile Dropdown */}
      <div className="flex items-center gap-3">
        {/* PostgreSQL Health Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f2f2f3] text-[11px] text-[#17191c]">
          {backendStatus === "online" ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-[#5d2a1a] animate-pulse" />
              <span className="font-normal text-[#17191c]">PostgreSQL 18 Live</span>
            </>
          ) : backendStatus === "checking" ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[#777b86]">Verifying DB...</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span className="text-rose-700 font-medium">Database Offline</span>
            </>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-full bg-[#f2f2f3] hover:bg-[#eaebee] transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-[#17191c] text-white font-bold flex items-center justify-center text-xs shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-medium text-[#17191c] leading-tight max-w-[120px] truncate">
                {user?.full_name}
              </p>
              <p className="text-[10px] text-[#777b86] font-normal leading-none mt-0.5">
                {user?.role}
              </p>
            </div>
            <ChevronDown
              className={`w-3 h-3 text-[#777b86] transition-transform ${
                isProfileMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Profile Dropdown Popover */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 p-2 bg-[#ffffff] border border-[#ececec] rounded-[20px] shadow-artifact z-50 animate-in fade-in duration-150">
              <div className="p-3 bg-[#f2f2f3] rounded-[16px] mb-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#17191c] truncate">{user?.full_name}</p>
                  <span
                    className={`px-2 py-0.5 text-[9px] font-medium rounded-full border ${getRoleBadgeStyle(
                      user?.role
                    )}`}
                  >
                    {user?.role}
                  </span>
                </div>
                <p className="text-[11px] text-[#777b86] truncate mt-0.5">{user?.email}</p>
                <div className="mt-2 pt-2 border-t border-[#e2e4e8] text-[10px] text-[#777b86] flex items-center justify-between">
                  <span>Tenant: {organization?.name}</span>
                  <span className="text-[#17191c] font-medium">Enterprise</span>
                </div>
              </div>

              <div className="space-y-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[14px] text-xs text-[#17191c] hover:bg-[#f2f2f3] transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-[#777b86]" />
                  <span>Workspace Settings</span>
                </Link>

                {(permissions.includes("*") || permissions.includes("view:audit_logs")) && (
                  <Link
                    href="/dashboard/governance"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[14px] text-xs text-[#17191c] hover:bg-[#f2f2f3] transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#17191c]" />
                    <span>Governance & Audit Logs</span>
                  </Link>
                )}

                <a
                  href="http://127.0.0.1:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-[14px] text-xs text-[#17191c] hover:bg-[#f2f2f3] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <UserIcon className="w-3.5 h-3.5 text-[#777b86]" />
                    <span>FastAPI Swagger Docs</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-[#979799]" />
                </a>
              </div>

              <div className="pt-2 mt-2 border-t border-[#f2f2f3]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[14px] text-xs font-normal text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of RicozViz</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
