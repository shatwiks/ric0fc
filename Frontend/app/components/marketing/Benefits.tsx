"use client";

import { Zap, Users, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function Benefits() {
  const benefits = [
    {
      title: "Analyst Productivity",
      category: "Speed & Ergonomics",
      tagline: "Build 10x faster with zero repetitive SQL",
      desc: "Stop rebuilding identical quarterly queries. Modernize your workflow with a visual drag-and-drop studio, automatic type mapping, and DuckDB analytical caching that delivers sub-second metrics.",
      icon: Zap,
      points: [
        "Eliminate ad-hoc CSV reconciliation cycles",
        "Reusable metric definitions across all dashboards",
        "Automated PostgreSQL schema discovery",
        "Sub-second interactive aggregations",
      ],
    },
    {
      title: "Business User Access",
      category: "Empowerment",
      tagline: "Self-service exploration without the queue",
      desc: "Empower department heads and operational managers to answer their own strategic questions. Cross-filter charts, change date ranges, and inspect details without waiting on analyst ticket backlogs.",
      icon: Users,
      points: [
        "Zero SQL expertise or programming required",
        "Intuitive point-and-click dimensional slicing",
        "Conversational AI answers in natural language",
        "Personalized saved views and workspace filters",
      ],
    },
    {
      title: "Governed Distribution",
      category: "Security & Trust",
      tagline: "Bank-grade enterprise access control & auditability",
      desc: "Ensure sensitive financial, customer, and operational records remain strictly confidential. Enforce granular role-based permissions, isolated multi-tenant workspaces, and immutable audit logs.",
      icon: ShieldCheck,
      points: [
        "5-Tier RBAC (Viewer, Explorer, Analyst, Publisher, Admin)",
        "Immutable PostgreSQL audit trail for all events",
        "Granular export restrictions (PDF/CSV)",
        "Zero unauthorized data egress",
      ],
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-[#ffffff] border-t border-[#ececec]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Heading */}
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-normal text-[#979799] uppercase tracking-wider block">
            Enterprise Value ›
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-serif font-normal text-[#17191c] tracking-[-0.66px] leading-[1.25]">
            Designed for data teams, <br />
            <span className="italic font-serif font-normal text-[#777b86]">trusted by executives</span>
          </h2>
          <p className="text-[17px] text-[#777b86] leading-relaxed pt-1">
            RicozViz bridges the divide between technical creators and strategic decision-makers on a single, warm editorial canvas.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-8 rounded-[24px] bg-[#f2f2f3] flex flex-col justify-between space-y-6 hover:bg-[#ebebed] transition-colors"
              >
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-full bg-[#ffffff] border border-[#ececec] flex items-center justify-center text-[#17191c] shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#979799] font-normal uppercase tracking-wider block mb-1">
                      {item.category}
                    </span>
                    <h3 className="text-xl font-medium text-[#17191c]">{item.title}</h3>
                    <p className="text-xs text-[#5d2a1a] font-medium mt-1">{item.tagline}</p>
                  </div>
                  <p className="text-xs text-[#777b86] leading-relaxed">{item.desc}</p>
                </div>

                <div className="pt-4 border-t border-[#e5e5e7] space-y-2">
                  {item.points.map((pt) => (
                    <div key={pt} className="flex items-start gap-2 text-xs text-[#17191c]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#17191c] shrink-0 mt-1.5" />
                      <span>{pt}</span>
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
