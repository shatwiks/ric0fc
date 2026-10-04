"use client";

import {
  Sparkles,
  Search,
  Activity,
  LineChart,
  Bot,
  User,
  ArrowRight,
  TrendingDown,
  Layers,
  Info,
  AtSign,
} from "lucide-react";
import Link from "next/link";

export default function AISection() {
  const aiFeatures = [
    {
      title: "Ricoz AI Analyst",
      badge: "Conversational BI",
      desc: "Ask natural language questions like 'What caused churn to spike in Q2?' The AI understands your schema, compiles safe DuckDB queries, and generates supporting charts.",
      icon: Sparkles,
    },
    {
      title: "AI Dashboard Generator",
      badge: "Zero-Code Synthesis",
      desc: "Select a dataset and generate a dashboard. RicozViz automatically selects relevant KPI cards, dimensions, and optimal layouts in seconds.",
      icon: Layers,
    },
    {
      title: "Data Detective",
      badge: "Root-Cause Paths",
      desc: "One-click variance deconstruction. Follow the exact causal chain from high-level metric drops down to specific region, product, and customer cohort drivers.",
      icon: Search,
    },
    {
      title: "Anomaly Radar",
      badge: "Continuous Surveillance",
      desc: "Proactive telemetry scans statistical boundaries for unusual revenue dips, volume spikes, or cohort attrition before they affect monthly targets.",
      icon: Activity,
    },
    {
      title: "Predictive Analytics",
      badge: "Forecasting",
      desc: "Forward-looking time-series models project future trajectory while clearly demarcating audited historical facts from statistical confidence bounds.",
      icon: LineChart,
    },
  ];

  return (
    <section id="ai" className="py-20 md:py-28 bg-[#fafafb] border-t border-[#ececec]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Heading */}
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-normal text-[#979799] uppercase tracking-wider block">
            Intelligence Layer ›
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-serif font-normal text-[#17191c] tracking-[-0.66px] leading-[1.25]">
            Conversational analysis <br />
            <span className="italic font-serif font-normal text-[#777b86]">meets causal explanation</span>
          </h2>
          <p className="text-[17px] text-[#777b86] leading-relaxed pt-1">
            Move beyond static descriptive charts. RicozViz integrates intelligent conversational agents and automated root-cause detectives grounded in your semantic model.
          </p>
        </div>

        {/* AI Composer Input Fragment (From Steep Style Reference) */}
        <div className="max-w-2xl mx-auto p-4 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#a3a6af]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f2f2f3] cursor-pointer">
              <AtSign className="w-4 h-4 text-[#777b86]" />
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f2f2f3] cursor-pointer">
              <Info className="w-4 h-4 text-[#777b86]" />
            </div>
            <span className="text-base text-[#a3a6af] font-normal ml-1">
              Ask anything about your metrics…
            </span>
          </div>

          <Link
            href="/dashboard/ai-analyst"
            className="w-10 h-10 rounded-full bg-[#17191c] text-[#ffffff] flex items-center justify-center hover:bg-black transition-colors shrink-0 shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 5 AI Features Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="p-7 rounded-[24px] bg-[#f2f2f3] flex flex-col justify-between space-y-4 hover:bg-[#ebebed] transition-colors"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#ffffff] border border-[#ececec] flex items-center justify-center text-[#17191c] shadow-sm">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-normal text-[#979799] uppercase tracking-wider block">
                    {f.badge}
                  </span>
                  <h3 className="text-xl font-medium text-[#17191c]">{f.title}</h3>
                  <p className="text-xs text-[#777b86] leading-relaxed">{f.desc}</p>
                </div>

                <div className="pt-2 border-t border-[#e5e5e7] flex items-center text-xs text-[#17191c] group cursor-pointer">
                  <span>Learn more</span>
                  <span className="ml-1 text-[#979799] group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            );
          })}

          {/* Signature Accent Blush Peach Card (#fbe1d1) from Steep Reference */}
          <div className="p-8 rounded-[24px] bg-[#fbe1d1] text-[#5d2a1a] flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-semibold text-[#5d2a1a]/80 uppercase tracking-wider block">
                Editorial Spotlight
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#5d2a1a] leading-snug">
                “Answers are only as good as the underlying semantic model.”
              </h3>
              <p className="text-xs text-[#5d2a1a]/85 leading-relaxed pt-1">
                RicozViz guarantees that every agent query, chart, and export resolves directly against governed PostgreSQL & DuckDB pipelines with full audit logs.
              </p>
            </div>

            <div className="pt-3 border-t border-[#5d2a1a]/20 flex items-center justify-between text-xs text-[#5d2a1a] font-medium">
              <span>Governance Architecture</span>
              <span className="font-mono">100% Governed</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
