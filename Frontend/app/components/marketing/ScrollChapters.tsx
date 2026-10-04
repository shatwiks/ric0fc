"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  Sparkles,
  Bot,
  Hash,
  ArrowRight,
  Database,
  Layers,
  Search,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import TextReveal from "./TextReveal";

const CHAPTERS = [
  {
    id: "chapter-1",
    numeral: "I",
    badgeLabel: "CHAPTER I",
    title: "THE SEMANTIC CORE",
    label: "Semantic Layer",
    dotColor: "bg-emerald-500",
  },
  {
    id: "chapter-2",
    numeral: "II",
    badgeLabel: "CHAPTER II",
    title: "GOVERNED TRUST",
    label: "Governed Trust",
    dotColor: "bg-sky-500",
  },
  {
    id: "chapter-3",
    numeral: "III",
    badgeLabel: "CHAPTER III",
    title: "DEEP INTELLIGENCE",
    label: "Deep Analysis",
    dotColor: "bg-violet-500",
  },
  {
    id: "chapter-4",
    numeral: "IV",
    badgeLabel: "CHAPTER IV",
    title: "WARM EDITORIAL PRINT",
    label: "Warm Editorial",
    dotColor: "bg-amber-600",
  },
];

export default function ScrollChapters() {
  const [activeChapter, setActiveChapter] = useState("chapter-1");

  // Track active chapter on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight * 0.4;
      for (const ch of CHAPTERS) {
        const el = document.getElementById(ch.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveChapter(ch.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative w-full bg-[#ffffff] text-[#17191c] overflow-hidden">
      {/* Sticky Scroll Progress Double-Bezel Floating Dock */}
      <div className="sticky top-20 z-30 flex justify-center pointer-events-none py-3">
        <nav
          aria-label="Story Chapters"
          className="pointer-events-auto p-1.5 rounded-full bg-white/80 backdrop-blur-2xl border border-black/[0.08] shadow-[0_12px_36px_-6px_rgba(23,25,28,0.08),0_2px_6px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] flex items-center gap-1"
        >
          {CHAPTERS.map((ch) => {
            const isActive = activeChapter === ch.id;
            return (
              <a
                key={ch.id}
                href={`#${ch.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(ch.id);
                  if (el) {
                    const yOffset = -90;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: "smooth" });
                    setActiveChapter(ch.id);
                  }
                }}
                className={`relative px-4 py-1.5 rounded-full text-xs font-normal transition-colors duration-200 flex items-center gap-2 cursor-pointer select-none ${
                  isActive ? "text-white" : "text-[#777b86] hover:text-[#17191c]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeChapterPill"
                    className="absolute inset-0 rounded-full bg-[#17191c] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.12)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-transform ${ch.dotColor} ${
                      isActive ? "scale-110 shadow-[0_0_8px_currentColor]" : "opacity-60"
                    }`}
                  />
                  <span className="font-mono text-[10px] tracking-wider uppercase opacity-80">{ch.numeral}</span>
                  <span className="hidden sm:inline font-medium tracking-tight text-[12px]">{ch.label}</span>
                </span>
              </a>
            );
          })}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* CHAPTER 1: SEMANTIC PLATFORM                                              */}
      {/* ========================================================================= */}
      <section
        id="chapter-1"
        className="py-24 sm:py-32 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12"
      >
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#f2f2f3] border border-[#e4e4e7] text-[11px] font-mono tracking-widest uppercase text-[#17191c] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-[#5d2a1a]">CHAPTER I</span>
            <span className="text-[#a1a1aa]">/</span>
            <span className="text-[#52525b] font-medium tracking-[0.16em]">THE SEMANTIC CORE</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal text-[#17191c] tracking-[-1.5px] leading-[1.15]">
            <TextReveal text="Define metrics once in code." italicWord="code." /> <br />
            <TextReveal text="Power every downstream insight." delay={0.2} />
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-base sm:text-lg text-[#777b86] leading-relaxed max-w-2xl pt-2"
          >
            RicozViz consolidates business logic into a single governed semantic layer.
            PostgreSQL schemas and DuckDB in-memory caching eliminate metric discrepancies between teams forever.
          </motion.p>
        </div>

        {/* 3 Architecture Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {[
            {
              icon: Database,
              title: "Unified Metric Layer",
              desc: "Write dimensions and formulas once. Downstream BI and AI models query the exact same business logic.",
              metric: "0% Logic Drift",
            },
            {
              icon: Layers,
              title: "In-Memory DuckDB Engine",
              desc: "Columnar in-memory aggregation executes analytical aggregations over millions of rows in milliseconds.",
              metric: "18.4ms Avg Speed",
            },
            {
              icon: Search,
              title: "Full Audit Traceability",
              desc: "Every query, report export, and AI answer links directly to its underlying database lineage and tenant permissions.",
              metric: "100% Governed",
            },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                className="p-8 rounded-[24px] bg-[#f2f2f3] flex flex-col justify-between space-y-6 hover:bg-[#ebecee] transition-colors"
              >
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#ffffff] border border-[#ececec] flex items-center justify-center text-[#17191c]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-[#17191c]">{card.title}</h3>
                    <p className="text-xs text-[#777b86] mt-2 leading-relaxed">{card.desc}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e2e4e8] flex items-center justify-between">
                  <span className="text-[11px] text-[#979799] uppercase tracking-wider font-mono">
                    Performance
                  </span>
                  <span className="text-xs font-semibold text-[#17191c] font-mono">
                    {card.metric}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 2.00: GOVERNED TRUST (SCREENSHOT 1)                               */}
      {/* ========================================================================= */}
      <section
        id="chapter-2"
        className="py-24 sm:py-32 bg-[#fafafb] border-t border-[#ececec]"
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#ffffff] border border-[#e4e4e7] text-[11px] font-mono tracking-widest uppercase text-[#17191c] shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              <span className="font-semibold text-[#5d2a1a]">CHAPTER II</span>
              <span className="text-[#a1a1aa]">/</span>
              <span className="text-[#52525b] font-medium tracking-[0.16em]">GOVERNED TRUST</span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal text-[#17191c] tracking-[-1.5px] leading-[1.15]">
              <TextReveal text="Answers you can trust" italicWord="trust" />
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-[#777b86] leading-relaxed max-w-2xl pt-2"
            >
              Steep and Ricoz AI are powered by your semantic model. Every answer, report, and calculation reflects audited, verified metrics across your company stack.
            </motion.p>
          </div>

          {/* 3 Floating Editorial Product Artifact Cards Matching Refero Screenshot 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {/* Card 1: Answers you can trust */}
            <motion.div
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.6 }}
              className="p-6 rounded-[24px] bg-[#f2f2f3] flex flex-col justify-between space-y-6"
            >
              {/* Floating Product Table Artifact */}
              <div className="p-4 rounded-[20px] bg-[#ffffff] shadow-artifact border border-[#ececec] space-y-3">
                <div className="text-[11px] text-[#777b86] border-b border-[#f2f2f3] pb-2">
                  Quarter closed above plan with solid month-over-month growth.
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#979799] uppercase tracking-wider block">
                    Key metrics
                  </span>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-[#f8f8f9]">
                    <span className="text-[#17191c]">Revenue</span>
                    <span className="font-mono font-medium text-[#17191c]">€4.6M</span>
                    <span className="text-emerald-600 font-mono text-[11px]">+9%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-[#f8f8f9]">
                    <span className="text-[#17191c]">Sales volume</span>
                    <span className="font-mono font-medium text-[#17191c]">12,800</span>
                    <span className="text-emerald-600 font-mono text-[11px]">+7%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-[#17191c]">Avg deal size</span>
                    <span className="font-mono font-medium text-[#17191c]">€360</span>
                    <span className="text-emerald-600 font-mono text-[11px]">+2%</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#f2f2f3] text-[11px] text-[#777b86]">
                  <strong className="text-[#17191c]">What stands out:</strong> Mid-Market accounts contributed 46% of total revenue.
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-[#17191c]">Answers you can trust</h3>
                <p className="text-xs text-[#777b86] mt-1 leading-relaxed">
                  Steep AI is powered by your semantic model and answers reflect governed metrics.
                </p>
              </div>
            </motion.div>

            {/* Card 2: Generate reports */}
            <motion.div
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="p-6 rounded-[24px] bg-[#f2f2f3] flex flex-col justify-between space-y-6"
            >
              {/* Floating Report Document Artifact */}
              <div className="p-4 rounded-[20px] bg-[#ffffff] shadow-artifact border border-[#ececec] space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-[#777b86] border-b border-[#f2f2f3] pb-2 font-mono text-[11px]">
                  <FileText className="w-3.5 h-3.5 text-[#5d2a1a]" />
                  <span>January performance review</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-[#979799] uppercase tracking-wider block">
                    Executive summary
                  </span>
                  <p className="text-[11px] text-[#777b86] leading-snug">
                    Overall strong performance for January, with strong YoY growth for Active customers.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded-xl bg-[#fafafb] border border-[#ececec]">
                    <span className="text-[10px] text-[#777b86] block">Active customers</span>
                    <span className="text-sm font-semibold text-[#17191c] font-mono">6,034</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#fafafb] border border-[#ececec]">
                    <span className="text-[10px] text-[#777b86] block">Revenue</span>
                    <span className="text-sm font-semibold text-[#17191c] font-mono">€56K</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-[#17191c]">Generate reports</h3>
                <p className="text-xs text-[#777b86] mt-1 leading-relaxed">
                  Turn any conversation into a shareable report, ready to share, edit, and build on.
                </p>
              </div>
            </motion.div>

            {/* Card 3: Support teams where they work */}
            <motion.div
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="p-6 rounded-[24px] bg-[#f2f2f3] flex flex-col justify-between space-y-6"
            >
              {/* Floating Ecosystem Logos Artifact */}
              <div className="p-5 rounded-[20px] bg-[#ffffff] shadow-artifact border border-[#ececec] flex flex-col items-center justify-center min-h-[190px] space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-[#f8f8f9] border border-[#ececec] flex items-center justify-center text-[#17191c]">
                      <Hash className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] text-[#777b86]">Slack</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-[#f8f8f9] border border-[#ececec] flex items-center justify-center text-[#17191c]">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="text-[10px] text-[#777b86]">Claude</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-[#f8f8f9] border border-[#ececec] flex items-center justify-center text-[#17191c]">
                      <Bot className="w-5 h-5 text-cyan-600" />
                    </div>
                    <span className="text-[10px] text-[#777b86]">ChatGPT</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#f2f2f3] w-full text-center">
                  <span className="px-3 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] text-[11px] font-medium">
                    Governed MCP Engine
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-[#17191c]">Support teams where they work</h3>
                <p className="text-xs text-[#777b86] mt-1 leading-relaxed">
                  Agents across your stack work from the same governed metrics, through Ricoz API and MCP.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 3.00: DEEP ANALYSIS (SCREENSHOT 2)                                 */}
      {/* ========================================================================= */}
      <section
        id="chapter-3"
        className="py-24 sm:py-32 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#ececec]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Text Reveal */}
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#f2f2f3] border border-[#e4e4e7] text-[11px] font-mono tracking-widest uppercase text-[#17191c] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="font-semibold text-[#5d2a1a]">CHAPTER III</span>
              <span className="text-[#a1a1aa]">/</span>
              <span className="text-[#52525b] font-medium tracking-[0.16em]">DEEP INTELLIGENCE</span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal text-[#17191c] tracking-[-1.5px] leading-[1.12]">
              <TextReveal text="Unlock deep analysis" italicWord="deep" />
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-[#777b86] leading-relaxed pt-2"
            >
              Ricoz AI goes beyond simple answers to deliver deep, comprehensive analysis grounded in your semantic model with live interactive charts and presence pins.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="pt-4 flex items-center gap-4"
            >
              <Link
                href="/dashboard/ai-analyst"
                className="px-6 py-2.5 rounded-full bg-[#17191c] text-[#ffffff] font-normal text-sm hover:bg-black transition-all cursor-pointer shadow-sm"
              >
                Try Ricoz AI
              </Link>
              <Link
                href="/dashboard/explore"
                className="text-sm text-[#17191c] hover:text-[#777b86] transition-colors flex items-center gap-1 group font-normal"
              >
                <span>Explore Studio</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </motion.div>
          </div>

          {/* Right Column: Floating Window with Avatar Badges from Screenshot 2 */}
          <div className="lg:col-span-7 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative p-6 sm:p-8 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact"
            >
              {/* Window Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#f2f2f3] text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#e2e4e8]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#e2e4e8]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#e2e4e8]" />
                  </div>
                  <span className="text-[#777b86] font-mono text-[11px] ml-2">Revenue vs last year</span>
                </div>
                <span className="text-[11px] text-[#777b86]">+ New chat</span>
              </div>

              {/* Chat / Analysis Conversation Flow */}
              <div className="py-4 space-y-4">
                {/* User Question */}
                <div className="flex justify-end">
                  <div className="px-4 py-2.5 rounded-[16px] bg-[#f2f2f3] text-xs text-[#17191c] max-w-sm">
                    Why were registrations up last month compared to the month before?
                  </div>
                </div>

                {/* Reasoning & Semantic Breakdown */}
                <div className="p-4 rounded-[16px] bg-[#fafafb] border border-[#ececec] space-y-2 text-xs">
                  <div className="text-[10px] text-[#979799] uppercase tracking-wider font-semibold">
                    Reasoning ›
                  </div>
                  <p className="text-[#17191c] leading-relaxed">
                    <span className="text-emerald-700 font-semibold">Registrations went 44k → 60k (+36%)</span> month-over-month. Three dimensions tell the story:
                  </p>
                  <ul className="text-[#777b86] space-y-1 pl-1 list-disc list-inside text-[11px]">
                    <li><strong>Organic is the biggest driver:</strong> Nearly doubled (11k → 25k)</li>
                    <li><strong>Product Hunt feature:</strong> Net gain was almost entirely organic-driven</li>
                  </ul>
                </div>

                {/* Live Registration Trend Sparkline */}
                <div className="p-4 rounded-[16px] bg-[#ffffff] border border-[#ececec] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#17191c]">Registration trend</span>
                    <span className="text-[10px] text-[#777b86]">Last 30 days</span>
                  </div>
                  <div className="h-24 w-full flex items-end gap-1.5 pt-2">
                    {[24, 30, 28, 35, 42, 38, 50, 48, 62, 75, 88, 94].map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-[#17191c] rounded-t-sm transition-all hover:bg-[#5d2a1a]"
                          style={{ height: `${v}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Avatar Monogram Pins from Screenshot 2 */}
              <div className="absolute -top-3 -left-3 px-3 py-1 rounded-full bg-[#ffffff] border border-[#ececec] shadow-md flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                  MF
                </div>
                <span className="text-[11px] font-medium text-[#17191c]">Mary Finance</span>
              </div>

              <div className="absolute -bottom-3 -right-3 px-3 py-1 rounded-full bg-[#ffffff] border border-[#ececec] shadow-md flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                  JM
                </div>
                <span className="text-[11px] font-medium text-[#17191c]">Josephine Marketing</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 4.00: WARM EDITORIAL (PEACH ACCENT CARD)                          */}
      {/* ========================================================================= */}
      <section
        id="chapter-4"
        className="py-24 sm:py-32 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#ececec]"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[28px] bg-[#fbe1d1] text-[#5d2a1a] p-8 sm:p-12 lg:p-16 overflow-hidden space-y-10"
        >
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#5d2a1a]/10 border border-[#5d2a1a]/20 text-[11px] font-mono tracking-widest uppercase text-[#5d2a1a] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5d2a1a] animate-pulse" />
              <span className="font-semibold text-[#5d2a1a]">CHAPTER IV</span>
              <span className="text-[#5d2a1a]/40">/</span>
              <span className="text-[#5d2a1a]/90 font-medium tracking-[0.16em]">WARM EDITORIAL PRINT</span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal text-[#5d2a1a] tracking-[-1.5px] leading-[1.12]">
              <TextReveal text="Serif analytics on warm paper" italicWord="warm" />
            </h2>

            <p className="text-base sm:text-lg text-[#5d2a1a]/90 leading-relaxed max-w-xl">
              Minimal, weightless, and calm. Built with generous breathing room, 24px soft-edged cards, and lozenge controls that treat data like high-end editorial print.
            </p>
          </div>

          {/* Editorial Callout & Metrics Artifact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="p-6 rounded-[20px] bg-[#ffffff]/80 border border-[#5d2a1a]/20 shadow-sm">
              <span className="text-xs text-[#5d2a1a]/70 uppercase tracking-wider font-semibold block">
                Sub-second Aggregations
              </span>
              <div className="text-3xl font-serif text-[#5d2a1a] mt-2">18.4ms</div>
              <p className="text-xs text-[#5d2a1a]/80 mt-1">Average DuckDB in-memory query time</p>
            </div>

            <div className="p-6 rounded-[20px] bg-[#ffffff]/80 border border-[#5d2a1a]/20 shadow-sm">
              <span className="text-xs text-[#5d2a1a]/70 uppercase tracking-wider font-semibold block">
                Typography
              </span>
              <div className="text-3xl font-serif text-[#5d2a1a] mt-2">Signifier 400</div>
              <p className="text-xs text-[#5d2a1a]/80 mt-1">Authority without shouting in bold</p>
            </div>

            <div className="p-6 rounded-[20px] bg-[#ffffff]/80 border border-[#5d2a1a]/20 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs text-[#5d2a1a]/70 uppercase tracking-wider font-semibold block">
                  Live Workspace
                </span>
                <div className="text-base font-semibold text-[#5d2a1a] mt-2">Ready to explore</div>
              </div>
              <Link
                href="/dashboard"
                className="mt-4 px-4 py-2 rounded-full bg-[#5d2a1a] text-[#fbe1d1] text-xs font-semibold text-center hover:opacity-90 transition-opacity"
              >
                Open Live Dashboard →
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
