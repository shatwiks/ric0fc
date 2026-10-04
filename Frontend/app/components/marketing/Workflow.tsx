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
          <span className="text-xs font-normal text-[#979799] uppercase tracking-wider block">
            Workflow ›
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-serif font-normal text-[#17191c] tracking-[-0.66px] leading-[1.25]">
            Enterprise analytics <br />
            <span className="italic font-serif font-normal text-[#777b86]">without the complexity</span>
          </h2>
          <p className="text-[17px] text-[#777b86] leading-relaxed pt-1">
            RicozViz eliminates disconnected spreadsheets and rigid legacy BI pipelines. Connect, model, and publish with complete semantic integrity.
          </p>
        </div>

        {/* 4 Neutral Cards Grid — 24px radius, #f2f2f3 background */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="p-7 rounded-[24px] bg-[#f2f2f3] flex flex-col justify-between space-y-6 hover:bg-[#ebebed] transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-full bg-[#ffffff] border border-[#ececec] flex items-center justify-center text-[#17191c] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-mono font-medium text-[#979799]">
                      {step.number}
                    </span>
                  </div>

                  <div>
                    <span className="text-[13px] text-[#979799] font-normal block mb-1">
                      {step.category}
                    </span>
                    <h3 className="text-xl font-medium text-[#17191c] tracking-tight">{step.title}</h3>
                  </div>

                  <p className="text-sm text-[#777b86] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#e5e5e7] flex items-center text-xs text-[#17191c] font-normal group cursor-pointer">
                  <span>Explore step</span>
                  <span className="ml-1 text-[#979799] group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
