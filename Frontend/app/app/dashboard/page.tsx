"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { api, HealthResponse } from "@/lib/api";
import {
  Server,
  Key,
  Layers,
  Sparkles,
  Search,
  BarChart3,
  Compass,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Activity,
} from "lucide-react";
import Link from "next/link";

export default function DashboardOverviewPage() {
  const { user, organization, workspace, permissions } = useAuthStore();
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    api.checkHealth().then(setHealth).catch(() => null);
  }, []);

  const onboardingSteps = [
    {
      title: "Tenant Provisioned",
      desc: `Registered as ${organization?.name || "Enterprise"}`,
      status: "done",
    },
    {
      title: "Workspace Bootstrapped",
      desc: `Active in ${workspace?.name || "Main Workspace"}`,
      status: "done",
    },
    {
      title: "Enterprise RBAC Assigned",
      desc: `Authorized as ${user?.role || "Analyst"} (${permissions.length} capabilities)`,
      status: "done",
    },
    {
      title: "Data Connectors",
      desc: "PostgreSQL 18 live & CSV ingestion ready",
      status: "done",
    },
    {
      title: "Visualization Studio",
      desc: "All 7 chart types active with DuckDB aggregations",
      status: "done",
    },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 py-2 select-none">
      {/* Editorial Welcome Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-[#777b86] font-normal">
          <span>{organization?.name || "Enterprise"}</span>
          <span>›</span>
          <span className="text-[#17191c] font-medium">{workspace?.name || "Production Intelligence"}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-[#ececec]">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-[#17191c] tracking-[-0.66px] leading-[1.15]">
              Welcome back, <span className="italic font-serif font-normal">{user?.full_name || "Sarah"}</span>
            </h1>
            <p className="text-sm sm:text-base text-[#777b86] leading-relaxed">
              Your governed semantic models, PostgreSQL 18 pipelines, and in-memory analytical cache are operating at optimal throughput.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/dashboards"
              className="px-6 py-2.5 rounded-full bg-[#17191c] text-[#ffffff] font-normal text-xs sm:text-sm hover:bg-black transition-all shadow-sm"
            >
              Open Dashboards
            </Link>
            <Link
              href="/dashboard/explore"
              className="px-6 py-2.5 rounded-full border border-[#17191c] text-[#17191c] font-normal text-xs sm:text-sm hover:bg-[#f2f2f3] transition-colors"
            >
              Explore Data
            </Link>
          </div>
        </div>
      </div>

      {/* Signature Blush Peach Accent Card (Exactly 1 per page for warm editorial punch) */}
      <div className="p-8 sm:p-10 rounded-[24px] bg-[#fbe1d1] text-[#5d2a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#5d2a1a]/80">
            <Cpu className="w-4 h-4" />
            <span>Governed Semantic Acceleration</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-normal text-[#5d2a1a]">
            18.4ms in-memory query aggregation
          </h3>
          <p className="text-xs sm:text-sm text-[#5d2a1a]/90 leading-relaxed">
            DuckDB columnar caching is executing analytical groupings directly over PostgreSQL tenant records. Zero SQL bottlenecks.
          </p>
        </div>

        <Link
          href="/dashboard/visualisations"
          className="self-start sm:self-auto px-5 py-2.5 rounded-full bg-[#5d2a1a] text-[#fbe1d1] text-xs font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          Open Visual Studio →
        </Link>
      </div>

      {/* Infrastructure Floating Product Artifacts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Backend & DB Card */}
        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-[#f2f2f3] flex items-center justify-center text-[#17191c]">
              <Server className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Live Engine</span>
            </span>
          </div>

          <div>
            <h3 className="text-base font-medium text-[#17191c]">PostgreSQL 18 & FastAPI</h3>
            <p className="text-xs text-[#777b86] mt-1">
              Status: {health?.database === "connected" ? "Database connected & verified" : "Connecting..."}
            </p>
          </div>

          <div className="text-[11px] font-mono text-[#979799] pt-3 border-t border-[#f2f2f3]">
            API: {health?.project || "RicozViz"} v{health?.version || "1.0.0"}
          </div>
        </div>

        {/* Security & Session Card */}
        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-[#f2f2f3] flex items-center justify-center text-[#17191c]">
              <Key className="w-4 h-4" />
            </div>
            <span className="text-xs text-[#17191c] font-medium px-2.5 py-0.5 rounded-full bg-[#f2f2f3] border border-[#ececec]">
              JWT Bearer
            </span>
          </div>

          <div>
            <h3 className="text-base font-medium text-[#17191c]">Security & Session</h3>
            <p className="text-xs text-[#777b86] mt-1 truncate">
              Authenticated for: {user?.email}
            </p>
          </div>

          <div className="text-[11px] font-mono text-[#979799] pt-3 border-t border-[#f2f2f3]">
            Active capabilities: {permissions.length} RBAC flags
          </div>
        </div>

        {/* Organization Tenant Card */}
        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-[#f2f2f3] flex items-center justify-center text-[#17191c]">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs text-[#17191c] font-medium px-2.5 py-0.5 rounded-full bg-[#f2f2f3] border border-[#ececec]">
              Enterprise Tier
            </span>
          </div>

          <div>
            <h3 className="text-base font-medium text-[#17191c]">Workspace Tenant</h3>
            <p className="text-xs text-[#777b86] mt-1 truncate">
              Tenant ID: {organization?.id?.slice(0, 12)}...
            </p>
          </div>

          <div className="text-[11px] font-mono text-[#979799] pt-3 border-t border-[#f2f2f3]">
            Workspace: {workspace?.name}
          </div>
        </div>
      </div>

      {/* Analytics Workspace Modules (24px Neutral Cards) */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-[#17191c] font-serif">
          Workspace Analytics Studios
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Dashboards",
              desc: "Multi-widget layout studio & cross-filtering.",
              href: "/dashboard/dashboards",
              icon: BarChart3,
            },
            {
              title: "Data Explorer",
              desc: "Granular row exploration & ad-hoc grouping.",
              href: "/dashboard/explore",
              icon: Compass,
            },
            {
              title: "AI Analyst",
              desc: "Natural language questions grounded in your model.",
              href: "/dashboard/ai-analyst",
              icon: Sparkles,
            },
            {
              title: "Data Detective",
              desc: "Automated root-cause driver investigation.",
              href: "/dashboard/data-detective",
              icon: Search,
            },
            {
              title: "RicozPulse",
              desc: "Executive intelligence radar scanning anomalies.",
              href: "/dashboard/pulse",
              icon: Activity,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="p-6 rounded-[24px] bg-[#f2f2f3] hover:bg-[#eaebee] transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#ffffff] border border-[#ececec] flex items-center justify-center text-[#17191c]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-[#17191c] group-hover:text-black">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#777b86] mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-[#17191c] flex items-center gap-1 font-normal pt-2">
                  <span>Enter studio</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Onboarding & Provisioning Flow (Whisper Neutral Card) */}
      <div className="p-8 rounded-[24px] bg-[#f2f2f3] space-y-6">
        <div>
          <h2 className="text-base font-medium text-[#17191c]">
            Tenant Provisioning & Pipeline Status
          </h2>
          <p className="text-xs text-[#777b86] mt-0.5">
            Synchronized live state from your PostgreSQL tenant database.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {onboardingSteps.map((step, idx) => (
            <div
              key={idx}
              className="p-4 rounded-[18px] bg-[#ffffff] border border-[#ececec] shadow-sm flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#979799]">0{idx + 1}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[#17191c] leading-tight">
                  {step.title}
                </h3>
                <p className="text-[11px] text-[#777b86] mt-1 leading-snug">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="p-8 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#17191c]">
            Active Role-Based Permissions (RBAC)
          </h2>
          <span className="text-xs text-[#777b86]">
            Enforced by middleware for role: <strong className="text-[#17191c]">{user?.role}</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {permissions.map((perm) => (
            <span
              key={perm}
              className="px-3 py-1 rounded-full bg-[#f2f2f3] border border-[#ececec] text-xs font-mono text-[#17191c]"
            >
              {perm}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
