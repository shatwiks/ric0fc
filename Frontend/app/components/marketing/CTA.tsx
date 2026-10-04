"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Database, Zap } from "lucide-react";

interface CTAProps {
  onOpenContact: () => void;
}

export default function CTA({ onOpenContact }: CTAProps) {
  return (
    <section className="py-24 md:py-32 bg-[#ffffff] border-t border-[#ececec] relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
        {/* Category tag */}
        <span className="text-xs text-[#979799] uppercase tracking-wider font-normal">
          Enterprise Deployment
        </span>

        {/* Serif Headline */}
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-normal text-[#17191c] tracking-[-1.5px] max-w-2xl mx-auto leading-[1.15]">
          Your data is already there. <br />
          <span className="italic font-serif font-normal text-[#17191c]">Start exploring it.</span>
        </h2>

        {/* Subhead */}
        <p className="text-sm sm:text-base text-[#777b86] max-w-xl mx-auto leading-relaxed">
          Deploy RicozViz in minutes. Connect your PostgreSQL database, query datasets with DuckDB,
          and empower your entire enterprise with governed visual intelligence.
        </p>

        {/* Paired Pill Buttons: Filled + Ghost Pair */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/auth/signup"
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#17191c] text-[#ffffff] hover:bg-black font-normal text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Get started free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={onOpenContact}
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-transparent hover:bg-[#f2f2f3] border border-[#17191c] text-[#17191c] font-normal text-sm transition-colors cursor-pointer"
          >
            Book a demo
          </button>
        </div>

        {/* Feature whisper badges */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-xs text-[#979799]">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#17191c]" />
            PostgreSQL 18 & In-Memory DuckDB
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#17191c]" />
            5-Tier RBAC & Audit Trails
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#17191c]" />
            Zero-Lockin Architecture
          </span>
        </div>
      </div>
    </section>
  );
}
