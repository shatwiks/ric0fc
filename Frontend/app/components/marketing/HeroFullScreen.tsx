"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Database, Bot, Search, FileText, Layers, Cpu, ChevronDown } from "lucide-react";
import TextReveal from "./TextReveal";

interface HeroFullScreenProps {
  onOpenContact: () => void;
}

export default function HeroFullScreen({ onOpenContact }: HeroFullScreenProps) {
  return (
    <section className="relative w-full min-h-screen bg-[#111317] text-white flex flex-col justify-between pt-24 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
      {/* Background ambient radial illumination */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-gradient-to-r from-cyan-950/20 via-indigo-950/25 to-purple-950/15 blur-[120px] pointer-events-none rounded-full" />

      {/* Main Top / Center Editorial Content */}
      <div className="relative z-10 max-w-6xl mx-auto w-full pt-8 sm:pt-14 space-y-6">
        {/* Subtle Category Marker */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 text-xs text-[#a3a6af] font-normal tracking-wide"
        >
          <span>Semantic platform</span>
          <span className="text-slate-500">›</span>
        </motion.div>

        {/* Display Headline — Signifier Serif 400 with Italic Emphasis */}
        <div className="space-y-1">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[88px] font-serif font-normal tracking-[-2px] leading-[1.08] text-white max-w-5xl">
            <span className="block">Ship metrics,</span>
            <span className="block italic font-serif font-normal text-slate-300">
              not dashboards
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-base sm:text-lg text-[#979799] max-w-2xl leading-relaxed pt-2"
        >
          A complete semantic platform to govern and publish all your metrics. Connect once, define metrics in code, and power all downstream analysis. No more repeating yourself.
        </motion.p>

        {/* Action Pair: Filled Lozenge + Ghost Arrow Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="pt-3 flex flex-wrap items-center gap-5"
        >
          <Link
            href="/auth/signup"
            className="px-7 py-3 rounded-full bg-[#ffffff] text-[#17191c] font-medium text-sm hover:bg-slate-100 transition-all cursor-pointer shadow-lg shadow-white/5"
          >
            Get started
          </Link>

          <a
            href="#chapter-1"
            className="text-sm text-[#ffffff] hover:text-[#fbe1d1] transition-colors flex items-center gap-1.5 group cursor-pointer"
          >
            <span>Learn more</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        </motion.div>
      </div>

      {/* Center / Bottom Floating Architecture Node Map Artifact */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-5xl mx-auto my-8 p-6 sm:p-8 rounded-[24px] bg-[#1a1c22]/95 border border-[#2b2e36] shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#2b2e36] text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white tracking-wide">Ricoz Semantic Engine</span>
          </div>
          <span className="text-[#979799] font-mono text-[11px]">PostgreSQL 18 + DuckDB In-Memory</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 items-center">
          {/* Sources Column */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#777b86] uppercase tracking-wider block font-semibold">
              Connected Sources
            </span>
            {["BigQuery", "Snowflake", "Databricks", "PostgreSQL", "CSV Extracts"].map((s) => (
              <div
                key={s}
                className="px-3 py-2 rounded-xl bg-[#23262f] border border-[#323642] text-xs text-slate-300 flex items-center gap-2 hover:border-[#4f5568] transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-[#fbe1d1]" />
                <span>{s}</span>
              </div>
            ))}
          </div>

          {/* Central Semantic Model Core */}
          <div className="p-5 rounded-2xl bg-[#272a34] border border-[#444857] text-center space-y-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-[#fbe1d1]/10 border border-[#fbe1d1]/30 mx-auto flex items-center justify-center text-[#fbe1d1]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Semantic Model</div>
              <p className="text-[11px] text-[#979799] mt-0.5">Centralized Governance & Cache</p>
            </div>
            <div className="flex justify-center gap-1.5 pt-1 text-[10px] font-mono text-slate-400">
              <span className="px-2 py-0.5 rounded bg-[#1e2027]">Context</span>
              <span className="px-2 py-0.5 rounded bg-[#1e2027]">Caching</span>
              <span className="px-2 py-0.5 rounded bg-[#1e2027]">Control</span>
            </div>
          </div>

          {/* Destinations Column */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#777b86] uppercase tracking-wider block font-semibold">
              Downstream Consumers
            </span>
            {[
              { name: "AI Analyst", icon: Bot },
              { name: "Explore Studio", icon: Search },
              { name: "Shareable Reports", icon: FileText },
              { name: "API & Integrations", icon: Layers },
            ].map((d) => {
              const Icon = d.icon;
              return (
                <div
                  key={d.name}
                  className="px-3 py-2 rounded-xl bg-[#23262f] border border-[#323642] text-xs text-slate-300 flex items-center gap-2 hover:border-[#4f5568] transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{d.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Bottom Scroll Cue */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-1 text-slate-500 pt-2 pb-2">
        <a
          href="#chapter-1"
          className="flex items-center gap-1.5 text-xs text-[#777b86] hover:text-white transition-colors cursor-pointer"
        >
          <span>Scroll to explore</span>
          <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
        </a>
      </div>
    </section>
  );
}
