"use client";

import { Database, BarChart3, Compass, Share2 } from "lucide-react";

export default function Workflow() {
  const steps = [
    {
      number: "01",
      title: "Connect",
      category: "Data Ingestion",
      desc: "Connect PostgreSQL, Snowflake, BigQuery, or CSV extracts. Automated type inference and schema discovery map your data in seconds.",
      icon: Database,
    },
    {
      number: "02",
      title: "Build",
      category: "Visualization Studio",
      desc: "Compose multi-chart interactive dashboards without SQL. Drag-and-drop dimensions, measures, formulas, and reactive filter bars.",
      icon: BarChart3,
    },
    {
      number: "03",
      title: "Explore",
      category: "Self-Service",
      desc: "Empower business users to drill into outliers, cross-filter charts dynamically, and interrogate data without filing analyst tickets.",
      icon: Compass,
    },
    {
      number: "04",
      title: "Publish",
      category: "Governed Distribution",
      desc: "Share executive reports with bank-grade RBAC. Automate scheduled PDF/CSV deliveries and maintain complete audit traceability.",
      icon: Share2,
    },
  ];

  return (
    <section id="workflow" className="py-20 md:py-28 bg-[#fafafb] border-t border-[#ececec]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Heading */}
        <div id="overview" className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fbe1d1]/60 border border-[#5d2a1a]/15 text-[10px] uppercase tracking-[0.2em] font-medium text-[#5d2a1a]">
            <span>Architecture &amp; Flow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-serif font-normal text-[#17191c] tracking-[-0.66px] leading-[1.25]">
            Enterprise analytics <br />
            <span className="italic font-serif font-normal text-[#777b86]">without the complexity</span>
          </h2>
          <p className="text-[17px] text-[#777b86] leading-relaxed pt-1">
            RicozViz eliminates disconnected spreadsheets and rigid legacy BI pipelines. Connect, model, and publish with complete semantic integrity.
          </p>
        </div>

        {/* 4 Double-Bezel Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="p-1 rounded-[26px] bg-black/[0.03] ring-1 ring-black/[0.04]"
              >
                <div className="p-6 rounded-[22px] bg-[#ffffff] border border-[#ececec] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] hover:border-[#5d2a1a]/30 transition-all flex flex-col justify-between space-y-6 h-full active:scale-[0.985]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-full bg-[#fbfbfb] border border-[#ececec] flex items-center justify-center text-[#17191c] shadow-xs">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-mono font-medium text-[#979799]">
                        {step.number}
                      </span>
                    </div>

                    <div>
                      <span className="text-[12px] text-[#979799] font-normal block mb-1">
                        {step.category}
                      </span>
                      <h3 className="text-lg font-medium text-[#17191c] tracking-tight">{step.title}</h3>
                    </div>

                    <p className="text-xs text-[#777b86] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#f2f2f3] flex items-center text-xs text-[#17191c] font-normal group cursor-pointer hover:text-[#5d2a1a] transition-colors">
                    <span>Explore step</span>
                    <span className="ml-1 text-[#979799] group-hover:text-[#5d2a1a] group-hover:translate-x-1 transition-all">→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
