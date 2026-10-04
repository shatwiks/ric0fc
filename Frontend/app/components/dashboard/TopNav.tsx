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
  const { user, organization, workspace, setActiveWorkspace, logout, permissions } = useAuthStore();

  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setIsWorkspaceMenuOpen(false);
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
            onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f2f2f3] hover:bg-[#eaebee] text-xs text-[#17191c] text-left transition-all cursor-pointer group"
          >
            <Building2 className="w-3.5 h-3.5 text-[#17191c] shrink-0" />
            <span className="font-medium text-[#17191c] max-w-[120px] sm:max-w-[160px] truncate">
              {organization?.name || "Ricoz Enterprise"}
            </span>
            <span className="text-[#979799] hidden sm:inline">/</span>
            <div className="hidden sm:flex items-center gap-1 text-[#777b86]">
              <Layers className="w-3 h-3 text-[#979799] shrink-0" />
              <span className="max-w-[100px] truncate">{workspace?.name || "Main Workspace"}</span>
            </div>
            <ChevronDown
              className={`w-3 h-3 text-[#777b86] transition-transform ${
                isWorkspaceMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Workspace Dropdown */}
          {isWorkspaceMenuOpen && (
            <div className="absolute left-0 mt-2 w-72 p-2 bg-[#ffffff] border border-[#ececec] rounded-[20px] shadow-artifact z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-[#f2f2f3]">
                <p className="text-[10px] font-normal text-[#979799] uppercase tracking-wider">
                  Organization Workspaces
                </p>
                <p className="text-xs font-semibold text-[#17191c] truncate mt-0.5">
                  {organization?.name}
                </p>
              </div>

              <div className="py-1 max-h-48 overflow-y-auto space-y-0.5">
                {workspacesList.map((ws) => {
                  const isSelected = workspace?.id === ws.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspace(ws);
                        setIsWorkspaceMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-[14px] text-xs transition-colors text-left cursor-pointer ${
                        isSelected
                          ? "bg-[#17191c] text-white font-medium"
                          : "text-[#17191c] hover:bg-[#f2f2f3]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers
                          className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-[#777b86]"}`}
                        />
                        <span className="truncate">{ws.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#f2f2f3]">
                <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] text-[#979799]">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Workspace provisioning enabled in Day 5</span>
                </div>
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
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
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
