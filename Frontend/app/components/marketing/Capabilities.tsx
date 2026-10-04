"use client";

import {
  BarChart3,
  Network,
  Compass,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";

export default function Capabilities() {
  const capabilities = [
    {
      title: "Interactive Chart & Dashboard Studio",
      desc: "Assemble responsive layouts with over 10 enterprise visualization types including Line, Bar, Donut, KPI, Area, and Tables. Seamlessly link filters to update all widgets in real-time.",
      icon: BarChart3,
      bullets: ["10+ Chart Types & KPI Cards", "Reactive Cross-Filtering", "Custom Drag & Drop Canvas"],
      badge: "Core Visuals",
    },
    {
      title: "Multi-Source Data Connection & Blending",
      desc: "Connect directly to PostgreSQL, MySQL, enterprise CSVs, or REST API endpoints. Automated type inference and DuckDB in-memory query processing handle complex transformations.",
      icon: Network,
      bullets: ["PostgreSQL & MySQL Drivers", "Automatic Schema Inferrer", "DuckDB Analytical Cache"],
      badge: "Unified Ingestion",
    },
    {
      title: "Self-Service Visual Exploration",
      desc: "Empower non-technical stakeholders to slice, dice, and drill into granular dimensional records without submitting data requests or writing SQL queries.",
      icon: Compass,
      bullets: ["One-Click Drill-Downs", "Dimensional Slice & Dice", "Time-Series Zooming"],
      badge: "Self-Service",
    },
    {
      title: "Governed Publishing & Multi-Tenant Sharing",
      desc: "Enterprise-grade authorization powered by 5 distinct RBAC roles. Protect sensitive operational records with complete audit trails and centralized tenant isolation.",
      icon: ShieldCheck,
      bullets: ["5-Tier RBAC Architecture", "Complete Audit Logging", "Multi-Tenant Workspaces"],
      badge: "Governance",
    },
    {
      title: "Scheduled Reports & High-Fidelity Exports",
      desc: "Distribute board-ready intelligence automatically. Generate high-resolution PDF summaries, full dataset CSV extracts, and configure scheduled report deliveries.",
      icon: FileSpreadsheet,
      bullets: ["Automated PDF & CSV Export", "Scheduled Recurring Delivery", "Secure Public/Private Tokens"],
      badge: "Distribution",
    },
  ];

  return (
    <section id="capabilities" className="py-20 md:py-28 bg-[#fafafb] border-t border-[#ececec]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-normal text-[#979799] uppercase tracking-wider block">
            Capabilities ›
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-serif font-normal text-[#17191c] tracking-[-0.66px] leading-[1.25]">
            Engineered for analytical scale <br />
            <span className="italic font-serif font-normal text-[#777b86]">&amp; editorial clarity</span>
          </h2>
          <p className="text-[17px] text-[#777b86] leading-relaxed pt-1">
            Five core capability pillars built from the ground up to replace fragmented BI stacks with a unified, high-velocity data intelligence platform.
          </p>
        </div>

        {/* Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className="p-8 rounded-[24px] bg-[#f2f2f3] flex flex-col justify-between space-y-6 hover:bg-[#ebebed] transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-full bg-[#ffffff] border border-[#ececec] flex items-center justify-center text-[#17191c] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-mono text-[#777b86]">
                      {cap.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium text-[#17191c] leading-snug">{cap.title}</h3>
                    <p className="text-xs text-[#777b86] mt-2 leading-relaxed">{cap.desc}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e5e5e7] space-y-2">
                  {cap.bullets.map((b) => (
                    <div key={b} className="flex items-center gap-2 text-xs text-[#17191c]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#17191c]" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
