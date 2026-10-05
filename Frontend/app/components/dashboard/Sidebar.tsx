"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import {
  LayoutDashboard,
  BarChart3,
  Compass,
  Database,
  LineChart,
  Sparkles,
  Search,
  Activity,
  Store,
  FileText,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LucideIcon,
  LogOut,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: "analytics" | "intelligence" | "platform";
  requiredPermission?: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Analytics",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Dashboards", href: "/dashboard/dashboards", icon: BarChart3 },
      { label: "Explore", href: "/dashboard/explore", icon: Compass },
      { label: "Datasets", href: "/dashboard/datasets", icon: Database },
      { label: "Visualisations", href: "/dashboard/visualisations", icon: LineChart },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "AI Analyst", href: "/dashboard/ai-analyst", icon: Sparkles, badge: "AI" },
      { label: "Data Detective", href: "/dashboard/data-detective", icon: Search, badge: "Root Cause" },
      { label: "RicozPulse", href: "/dashboard/pulse", icon: Activity, badge: "Live" },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Data Marketplace", href: "/dashboard/marketplace", icon: Store },
      { label: "Reports", href: "/dashboard/reports", icon: FileText },
      { label: "Governance", href: "/dashboard/governance", icon: ShieldCheck, requiredPermission: "view:audit_logs" },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, permissions, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const hasPermission = (item: NavItem) => {
    if (!item.requiredPermission) return true;
    if (permissions.includes("*")) return true;
    return permissions.includes(item.requiredPermission);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#ffffff] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[#ececec] shrink-0">
        <Link
          href="/dashboard"
          onClick={onCloseMobile}
          className={`flex items-center gap-3 overflow-hidden ${
            isCollapsed && !isMobileOpen ? "justify-center w-full" : ""
          }`}
          title="RicozViz Analytics"
        >
          <div className="w-8 h-8 rounded-full bg-[#17191c] flex items-center justify-center shrink-0 text-white shadow-sm">
            <span className="text-sm font-serif font-bold italic leading-none">R</span>
          </div>

          {(!isCollapsed || isMobileOpen) && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-semibold tracking-tight text-[#17191c] leading-none">
                Ricoz<span className="font-serif italic font-normal text-[#5d2a1a]">Viz</span>
              </span>
              <span className="text-[10px] text-[#777b86] font-normal tracking-wider uppercase mt-1 truncate">
                Editorial Analytics
              </span>
            </div>
          )}
        </Link>

        {/* Mobile close or desktop toggle button */}
        {isMobileOpen ? (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-full hover:bg-[#f2f2f3] text-[#777b86] hover:text-[#17191c] transition-colors md:hidden cursor-pointer"
            title="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          !isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-full hover:bg-[#f2f2f3] text-[#777b86] hover:text-[#17191c] transition-colors hidden md:flex items-center justify-center cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* When collapsed on desktop: quick expand trigger bar */}
      {isCollapsed && !isMobileOpen && (
        <div className="py-2 flex justify-center border-b border-[#ececec]">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1.5 rounded-full hover:bg-[#f2f2f3] text-[#777b86] hover:text-[#17191c] transition-colors cursor-pointer"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(hasPermission);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              {/* Section Header */}
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-3 py-1 text-[11px] font-normal text-[#979799] uppercase tracking-wider">
                  {section.title}
                </div>
              )}

              {/* Items */}
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <div key={item.href} className="relative group">
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      className={`flex items-center gap-3 px-3 py-2 rounded-full text-xs font-normal transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] cursor-pointer ${
                        isCollapsed && !isMobileOpen ? "justify-center px-0 h-10 w-full" : ""
                      } ${
                        isActive
                          ? "bg-[#17191c] text-[#ffffff] shadow-xs font-medium"
                          : "text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3]"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-[#ffffff]" : "text-[#777b86] group-hover:text-[#17191c]"
                        }`}
                      />

                      {/* Label when expanded */}
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}

                      {/* Subtle Active Indicator Dot */}
                      {(!isCollapsed || isMobileOpen) && isActive && !item.badge && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#fbe1d1] shrink-0" />
                      )}

                      {/* Badge when expanded */}
                      {(!isCollapsed || isMobileOpen) && item.badge && (
                        <span
                          className={`px-2 py-0.5 text-[9px] font-medium rounded-full ${
                            isActive
                              ? "bg-[#ffffff]/20 text-[#ffffff]"
                              : item.badge === "AI"
                              ? "bg-[#fbe1d1] text-[#5d2a1a]"
                              : "bg-[#f2f2f3] text-[#777b86]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>

                    {/* Tooltip on hover when collapsed */}
                    {isCollapsed && !isMobileOpen && (
                      <div className="fixed left-[76px] ml-1 px-3 py-1.5 rounded-[12px] bg-[#17191c] text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-white/20 text-white">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User & Session Footer Card */}
      <div className="p-3 border-t border-[#ececec] shrink-0">
        <div
          className={`flex items-center gap-3 p-2.5 rounded-[18px] bg-[#f2f2f3] ${
            isCollapsed && !isMobileOpen ? "justify-center px-0" : ""
          }`}
        >
          <div
            className="w-8 h-8 rounded-full bg-[#17191c] text-white font-bold flex items-center justify-center text-xs shrink-0"
            title={user?.full_name || "User"}
          >
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
          </div>

          {(!isCollapsed || isMobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#17191c] truncate">
                {user?.full_name || "User"}
              </p>
              <span className="text-[10px] text-[#777b86] font-normal block truncate">
                {user?.role || "Viewer"}
              </span>
            </div>
          )}

          {(!isCollapsed || isMobileOpen) && (
            <button
              onClick={() => logout()}
              className="p-1 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#eaebee] transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar with Paper White surface and hairline border */}
      <aside
        className={`hidden md:flex flex-col border-r border-[#ececec] bg-[#ffffff] transition-all duration-200 ease-in-out shrink-0 z-30 ${
          isCollapsed ? "w-[72px] min-w-[72px] max-w-[72px]" : "w-64 min-w-[256px] max-w-[256px]"
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer (Visible when isMobileOpen is true) */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          isMobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          onClick={onCloseMobile}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        />

        {/* Drawer panel */}
        <aside
          className={`relative z-10 w-72 h-full bg-[#ffffff] border-r border-[#ececec] transform transition-transform duration-300 ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {navContent}
        </aside>
      </div>
    </>
  );
}
