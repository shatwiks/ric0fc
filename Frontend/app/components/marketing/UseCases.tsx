"use client";

import Link from "next/link";
import { TrendingUp, Layers, Compass, CheckCircle2, ArrowRight } from "lucide-react";

export default function UseCases() {
  const useCases = [
    {
      category: "C-Suite & Board",
      title: "Executive Performance Dashboards",
      desc: "Unified mission-control towers for leadership teams. Consolidate ARR growth, EBITDA margin, and forward predictive targets with board-ready presentation exports.",
      icon: TrendingUp,
      benchmarkLabel: "Sample Benchmark",
      benchmarkValue: "€48.2M ARR (+14.2% YoY)",
      metrics: ["Quarterly ARR Trajectory", "Gross Margin Analysis", "Executive Anomaly Feed"],
      link: "/dashboard/dashboards",
    },
    {
      category: "Operations & Supply",
      title: "Operational & Transactional Reporting",
      desc: "Real-time visibility into high-volume business activities. Track order volumes, regional warehouse throughput, and resolve operational bottlenecks.",
      icon: Layers,
      benchmarkLabel: "Sample Benchmark",
      benchmarkValue: "99.8% On-Time Fulfillment",
      metrics: ["Daily Transaction Throughput", "Regional Order Fulfillment", "SLA Adherence Tracking"],
      link: "/dashboard/visualisations",
    },
    {
      category: "Growth & Product",
      title: "Analytical & Customer Diagnostics",
      desc: "Uncover hidden behavioral drivers behind customer expansion and attrition. Map cohort retention curves and deconstruct root causes with governed metrics.",
      icon: Compass,
      benchmarkLabel: "Sample Benchmark",
      benchmarkValue: "118.4% Net Retention Rate",
      metrics: ["Cohort Retention Curves", "Multi-Touch Attribution", "Customer Lifetime Value"],
      link: "/dashboard/explore",
    },
  ];

  return (
    <section id="use-cases" className="py-24 bg-[#fafafb] border-t border-[#ececec]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs text-[#979799] uppercase tracking-wider font-normal">
            Disciplines & Applications
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-[#17191c] tracking-[-0.66px] leading-[1.2]">
            Engineered for <span className="italic font-serif font-normal">clarity</span> across every discipline
          </h2>
          <p className="text-sm sm:text-base text-[#777b86] leading-relaxed pt-1">
            From the boardroom to front-line operational hubs, explore how RicozViz delivers quiet confidence and measurable intelligence.
          </p>
        </div>

        {/* Use Cases Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {useCases.map((uc) => {
            const Icon = uc.icon;
            return (
              <div
                key={uc.title}
                className="p-8 rounded-[24px] bg-[#f2f2f3] flex flex-col justify-between space-y-6 hover:bg-[#eaebee] transition-colors"
              >
                <div className="space-y-4">
                  {/* Category marker: whisper quiet, no background badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#979799] font-normal tracking-wide">
                      {uc.category}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#ffffff] border border-[#ececec] flex items-center justify-center text-[#17191c]">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-[#17191c] leading-snug">{uc.title}</h3>
                    <p className="text-xs text-[#777b86] mt-2 leading-relaxed">{uc.desc}</p>
                  </div>

                  {/* Floating product artifact fragment */}
                  <div className="p-3.5 rounded-[16px] bg-[#ffffff] border border-[#ececec] shadow-artifact">
                    <span className="text-[10px] text-[#979799] uppercase tracking-wider block font-normal">
                      {uc.benchmarkLabel}
                    </span>
                    <span className="text-xs font-semibold text-[#17191c] font-mono mt-0.5 block">
                      {uc.benchmarkValue}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 pt-3 border-t border-[#e2e4e8]">
                  <div className="space-y-1.5">
                    {uc.metrics.map((m) => (
                      <div key={m} className="flex items-center gap-2 text-xs text-[#777b86]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#17191c] shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={uc.link}
                    className="pt-2 text-xs text-[#17191c] hover:text-[#777b86] transition-colors flex items-center gap-1 group font-normal"
                  >
                    <span>Read the story</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
