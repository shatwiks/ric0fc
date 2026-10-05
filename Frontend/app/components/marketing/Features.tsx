"use client";

import {
  BarChart3,
  Database,
  Compass,
  Share2,
  CheckCircle2,
  Sliders,
  Calendar,
  Layers,
  FileText,
  Lock,
  Download,
  Filter,
} from "lucide-react";

export default function Features() {
  const features = [
    {
      id: "studio",
      title: "Visualisation Studio",
      category: "Canvas & Layout",
      description:
        "Compose high-impact executive dashboards with fine-grained control over dimensions, measures, and styling. Select from over 10 optimized chart types and preview changes instantly with sub-second feedback.",
      bullets: [
        "Interactive grid with auto-snapping and resizing",
        "Unified dimension & measure selector",
        "Synchronized cross-filtering across all widgets",
      ],
      mockup: (
        <div className="p-5 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between border-b border-[#f2f2f3] pb-2 text-[11px] text-[#777b86]">
            <span className="flex items-center gap-1.5 text-[#17191c] font-medium">
              <BarChart3 className="h-3.5 w-3.5 text-[#5d2a1a]" /> Widget Configurator
            </span>
            <span className="font-mono text-[10px] bg-[#f2f2f3] px-2 py-0.5 rounded-full">Chart: Multi-Bar</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-[#fafafb] border border-[#ececec]">
              <span className="text-[#979799] block text-[9px] uppercase tracking-wider">Dimension</span>
              <span className="text-[#17191c] font-medium">dim_sales_region</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#fafafb] border border-[#ececec]">
              <span className="text-[#979799] block text-[9px] uppercase tracking-wider">Measure</span>
              <span className="text-[#5d2a1a] font-medium">SUM(gross_revenue)</span>
            </div>
          </div>
          <div className="h-24 flex items-end justify-between gap-2 pt-3 px-1">
            {[45, 65, 85, 55, 95].map((h, i) => (
              <div key={i} className="flex-1 bg-[#17191c] rounded-t-sm transition-all hover:bg-[#5d2a1a]" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "connector",
      title: "Enterprise Data Connector",
      category: "Data Ingestion",
      description:
        "Bridge PostgreSQL, MySQL, CSV uploads, and REST APIs into one unified semantic data layer. Automated schema inferrers analyze data types, date formats, and foreign key relationships with zero manual configuration.",
      bullets: [
        "Live PostgreSQL connection with async connection pooling",
        "Automated CSV ingestion with intelligent header and type detection",
        "DuckDB in-memory analytical query engine for fast aggregations",
      ],
      mockup: (
        <div className="p-5 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between border-b border-[#f2f2f3] pb-2 text-[11px]">
            <span className="text-[#17191c] font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#5d2a1a]" /> PostgreSQL 18 Live
            </span>
            <span className="text-[#777b86] font-mono text-[10px]">127.0.0.1:5432</span>
          </div>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between p-2 rounded-xl bg-[#fafafb] border border-[#ececec]">
              <span className="text-[#17191c] font-medium">tbl_enterprise_sales</span>
              <span className="text-[#777b86] font-mono">1.4M rows • 18 cols</span>
            </div>
            <div className="flex justify-between p-2 rounded-xl bg-[#fafafb] border border-[#ececec]">
              <span className="text-[#17191c] font-medium">tbl_customer_profiles</span>
              <span className="text-[#777b86] font-mono">340k rows • 12 cols</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#f2f2f3] flex items-center justify-between text-[11px] text-[#777b86]">
            <span>Latency</span>
            <span className="font-mono text-[#5d2a1a] font-semibold">12ms avg</span>
          </div>
        </div>
      ),
    },
    {
      id: "explorer",
      title: "Interactive Data Explorer",
      category: "Self-Service Analytics",
      description:
        "Slice and dice live dataset records with zero latency. Switch between raw tabular exploration and multi-dimensional pivot tables, then save custom analytical views directly to existing dashboards.",
      bullets: [
        "Ad-hoc regex searching and instant multi-column sorting",
        "Dynamic group-by and aggregation across all measures",
        "Direct-to-dashboard visualization export",
      ],
      mockup: (
        <div className="p-5 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between border-b border-[#f2f2f3] pb-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-[#17191c] font-medium">
              <Compass className="h-3.5 w-3.5 text-[#17191c]" /> Ad-Hoc Explorer Stage
            </span>
            <span className="font-mono text-[10px] text-[#5d2a1a] bg-[#fbe1d1] px-2.5 py-0.5 rounded-full border border-[#5d2a1a]/20">Mode: Pivot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] text-[11px] font-medium">
              region = West
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#f2f2f3] text-[#17191c] text-[11px]">
              Group by: product
            </span>
          </div>
          <div className="space-y-1.5 border-t border-[#f2f2f3] pt-2 text-[11px]">
            <div className="flex justify-between py-1 border-b border-[#fafafb]">
              <span className="text-[#17191c]">Atlas Pro</span>
              <span className="font-mono font-medium text-[#17191c]">€394,830</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#fafafb]">
              <span className="text-[#17191c]">Vertex Core</span>
              <span className="font-mono font-medium text-[#17191c]">€322,358</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#17191c]">Nimbus Edge</span>
              <span className="font-mono font-medium text-[#17191c]">€263,026</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "publishing",
      title: "Publishing & Governance Centre",
      category: "Enterprise Distribution",
      description:
        "Manage workspace permissions, share real-time analytical reports, and audit every interaction. Role-based access control guarantees security from individual database records to public-facing boards.",
      bullets: [
        "5 tiered roles: Admin, Publisher, Analyst, Explorer, Viewer",
        "Full audit trails logging logins, modifications, and exports",
        "Scheduled automated distributions directly to stakeholder inboxes",
      ],
      mockup: (
        <div className="p-5 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between border-b border-[#f2f2f3] pb-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-[#17191c] font-medium">
              <Lock className="h-3.5 w-3.5 text-[#5d2a1a]" /> RBAC Security Matrix
            </span>
            <span className="text-[10px] font-mono text-[#777b86]">Enterprise Audit Active</span>
          </div>
          <div className="space-y-2">
            {[
              { role: "Executive Board", perm: "View Only • Governed", badge: "Viewer" },
              { role: "Product Strategy", perm: "Interactive Slice & Dice", badge: "Explorer" },
              { role: "Data Platform Team", perm: "Full Schema & Publish", badge: "Admin" },
            ].map((r) => (
              <div key={r.role} className="flex items-center justify-between p-2 rounded-xl bg-[#fafafb] border border-[#ececec] text-[11px]">
                <div>
                  <span className="text-[#17191c] font-medium block">{r.role}</span>
                  <span className="text-[#777b86] text-[10px]">{r.perm}</span>
                </div>
                <span className="text-[10px] font-mono font-medium text-[#17191c] bg-[#f2f2f3] px-2 py-0.5 rounded-full">
                  {r.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-[#ffffff]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Section Heading */}
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fbe1d1]/60 border border-[#5d2a1a]/15 text-[10px] uppercase tracking-[0.2em] font-medium text-[#5d2a1a]">
            <span>Deep Dive</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-serif font-normal text-[#17191c] tracking-[-0.66px] leading-[1.25]">
            Engineered for analysts, <br />
            <span className="italic font-serif font-normal text-[#777b86]">built for executives</span>
          </h2>
          <p className="text-[17px] text-[#777b86] leading-relaxed pt-1">
            Every feature is designed with editorial clarity. High-performance data pipelines, DuckDB aggregation, and pure typography.
          </p>
        </div>

        {/* Feature Cards Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((f) => (
            <div
              key={f.id}
              className="p-1 rounded-[28px] bg-black/[0.03] ring-1 ring-black/[0.04]"
            >
              <div className="p-8 sm:p-10 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] hover:border-[#5d2a1a]/30 transition-all flex flex-col justify-between space-y-8 h-full active:scale-[0.985]">
                <div className="space-y-4">
                  <span className="text-[10px] text-[#5d2a1a] font-mono uppercase tracking-widest block bg-[#fbe1d1] px-2.5 py-0.5 rounded-full w-max border border-[#5d2a1a]/20">
                    {f.category}
                  </span>
                  <h3 className="text-2xl font-serif font-normal text-[#17191c] tracking-tight">{f.title}</h3>
                  <p className="text-xs text-[#777b86] leading-relaxed">{f.description}</p>

                  <ul className="space-y-2 pt-2">
                    {f.bullets.map((b, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-[#17191c]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5d2a1a] shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Floating Product UI Artifact Mockup */}
                <div className="pt-2">{f.mockup}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
