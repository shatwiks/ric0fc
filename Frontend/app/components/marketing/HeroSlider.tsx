"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Database,
  Layers,
  FileText,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  Bot,
  Hash,
  Cpu,
  BarChart3,
  Calendar,
  Search,
} from "lucide-react";

export interface HeroSliderProps {
  onOpenContact: () => void;
}

const SLIDES = [
  {
    id: "1.00",
    numeral: "I",
    step: "ACT I",
    tabLabel: "Semantic Core",
    tagline: "Semantic platform",
    heading: "Ship metrics, not dashboards",
    italicWord: "not dashboards",
    description:
      "A complete semantic platform to govern and publish all your metrics. Connect once, define metrics in code, and power all downstream analysis. No more repeating yourself.",
    variant: "dark", // dark contrasted stage from refero screenshot
  },
  {
    id: "2.00",
    numeral: "II",
    step: "ACT II",
    tabLabel: "Governed Trust",
    tagline: "Steep AI & Reports",
    heading: "Answers you can trust",
    italicWord: "trust",
    description:
      "Steep and Ricoz AI are powered by your semantic model. Every answer, report, and calculation reflects governed, audited metrics across your business stack.",
    variant: "light", // 3 floating cards from screenshot 1
  },
  {
    id: "3.00",
    numeral: "III",
    step: "ACT III",
    tabLabel: "Deep Intelligence",
    tagline: "Steep AI",
    heading: "Unlock deep analysis",
    italicWord: "deep analysis",
    description:
      "Ricoz AI goes beyond simple answers to deliver deep, comprehensive analysis grounded in your semantic model with live interactive chart lenses.",
    variant: "light", // screenshot 2: floating window with Mary & Josephine avatars
  },
  {
    id: "4.00",
    numeral: "IV",
    step: "ACT IV",
    tabLabel: "Warm Editorial",
    tagline: "Editorial Analytics",
    heading: "Serif analytics on warm paper",
    italicWord: "warm paper",
    description:
      "Minimal, weightless, and calm. Built with generous breathing room, 24px soft-edged cards, and lozenge controls that treat data like high-end editorial print.",
    variant: "peach", // signature Blush Peach accent card
  },
];

export default function HeroSlider({ onOpenContact }: HeroSliderProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Auto-advance every 9 seconds if not interacted
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIdx((prev) => (prev + 1) % SLIDES.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [isAutoPlay]);

  const goToSlide = (idx: number) => {
    setIsAutoPlay(false);
    setDirection(idx > currentIdx ? 1 : -1);
    setCurrentIdx(idx);
  };

  const handlePrev = () => {
    setIsAutoPlay(false);
    setDirection(-1);
    setCurrentIdx((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const handleNext = () => {
    setIsAutoPlay(false);
    setDirection(1);
    setCurrentIdx((prev) => (prev + 1) % SLIDES.length);
  };

  const slide = SLIDES[currentIdx];

  // Motion variants for slider transitions
  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.35 },
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 50 : -50,
      opacity: 0,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.25 },
      },
    }),
  };

  // Staggered children animation variants
  const itemFadeUp: Variants = {
    hidden: { opacity: 0, y: 22 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.12,
        duration: 0.5,
        ease: "easeOut" as const,
      },
    }),
  };

  return (
    <section className="relative w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 overflow-hidden">
      {/* Top Slider Navigation & Stepper Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Step Tabs / Navigation Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#f2f2f3] max-w-fit overflow-x-auto">
          {SLIDES.map((s, idx) => {
            const isActive = idx === currentIdx;
            return (
              <button
                key={s.id}
                onClick={() => goToSlide(idx)}
                className={`relative px-4 py-1.5 rounded-full text-xs font-normal transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-[#17191c] text-[#ffffff] shadow-sm"
                    : "text-[#777b86] hover:text-[#17191c] hover:bg-[#ffffff]/60"
                }`}
              >
                <span className="font-mono text-[11px] opacity-75">{s.step}</span>
                <span>{s.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Stepper Controls: Step Indicator + Arrows */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#777b86]">
            <span className="text-[#17191c] font-semibold">{slide.step}</span>
            <span>/</span>
            <span>ACT IV</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              aria-label="Previous slide"
              className="w-8 h-8 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next slide"
              className="w-8 h-8 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Slider Display Stage with AnimatePresence */}
      <div className="relative min-h-[580px] lg:min-h-[640px] w-full rounded-[28px] overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full h-full"
          >
            {/* Slide 1.00: Semantic Platform (Dark Stage from Screenshot 3 & 4) */}
            {slide.id === "1.00" && (
              <div className="relative rounded-[28px] bg-[#121417] text-[#ffffff] p-8 sm:p-12 lg:p-16 overflow-hidden min-h-[580px] lg:min-h-[640px] flex flex-col justify-between">
                {/* Background ambient radial illumination */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-cyan-900/10 via-indigo-900/15 to-purple-900/10 blur-3xl pointer-events-none rounded-full" />

                <div className="relative z-10 max-w-xl space-y-4">
                  <motion.div
                    custom={0}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center gap-1.5 text-xs text-[#a3a6af] font-normal"
                  >
                    <span>{slide.tagline}</span>
                    <span>›</span>
                  </motion.div>

                  <motion.h1
                    custom={1}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal tracking-[-1.5px] leading-[1.12]"
                  >
                    Ship metrics, <br />
                    <span className="italic font-serif font-normal text-slate-300">not dashboards</span>
                  </motion.h1>

                  <motion.p
                    custom={2}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="text-sm sm:text-base text-[#979799] leading-relaxed max-w-lg pt-1"
                  >
                    {slide.description}
                  </motion.p>

                  <motion.div
                    custom={3}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="pt-3 flex items-center gap-4"
                  >
                    <Link
                      href="/auth/signup"
                      className="px-6 py-2.5 rounded-full bg-[#ffffff] text-[#17191c] font-normal text-sm hover:bg-slate-100 transition-all cursor-pointer shadow-sm"
                    >
                      Get started
                    </Link>

                    <Link
                      href="/dashboard/dashboards"
                      className="text-sm text-[#ffffff] hover:text-[#fbe1d1] transition-colors flex items-center gap-1 group"
                    >
                      <span>Learn more</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                  </motion.div>
                </div>

                {/* Floating Semantic Architecture Node Map Artifact */}
                <motion.div
                  custom={4}
                  variants={itemFadeUp}
                  initial="hidden"
                  animate="visible"
                  className="mt-8 lg:mt-0 relative z-10 w-full max-w-2xl mx-auto p-6 sm:p-8 rounded-[24px] bg-[#1a1c22]/90 border border-[#2b2e36] shadow-2xl backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-[#2b2e36] text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold text-white tracking-wide">Ricoz Semantic Engine</span>
                    </div>
                    <span className="text-[#979799] font-mono text-[11px]">PostgreSQL 18 + DuckDB</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 items-center">
                    {/* Sources Column */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-[#777b86] uppercase tracking-wider block font-semibold">
                        Connected Sources
                      </span>
                      {["BigQuery", "Snowflake", "Databricks", "PostgreSQL", "CSV Extracts"].map((s, i) => (
                        <div
                          key={s}
                          className="px-3 py-1.5 rounded-xl bg-[#23262f] border border-[#323642] text-xs text-slate-300 flex items-center gap-2"
                        >
                          <Database className="w-3 h-3 text-[#fbe1d1]" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>

                    {/* Central Semantic Model Core */}
                    <div className="p-4 rounded-2xl bg-[#272a34] border border-[#444857] text-center space-y-3 shadow-lg">
                      <div className="w-9 h-9 rounded-xl bg-[#fbe1d1]/10 border border-[#fbe1d1]/30 mx-auto flex items-center justify-center text-[#fbe1d1]">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Semantic Model</div>
                        <p className="text-[11px] text-[#979799] mt-0.5">Centralized Governance</p>
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
                            className="px-3 py-1.5 rounded-xl bg-[#23262f] border border-[#323642] text-xs text-slate-300 flex items-center gap-2"
                          >
                            <Icon className="w-3 h-3 text-cyan-400" />
                            <span>{d.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Slide 2.00: Governed Trust (The 3 Floating Cards from Screenshot 1) */}
            {slide.id === "2.00" && (
              <div className="relative rounded-[28px] bg-[#fafafb] border border-[#ececec] p-8 sm:p-12 lg:p-16 min-h-[580px] lg:min-h-[640px] flex flex-col justify-between">
                <div className="max-w-2xl space-y-3">
                  <motion.div
                    custom={0}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center gap-1.5 text-xs text-[#777b86] font-normal"
                  >
                    <span>{slide.tagline}</span>
                    <span>›</span>
                  </motion.div>

                  <motion.h1
                    custom={1}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal text-[#17191c] tracking-[-1.5px] leading-[1.12]"
                  >
                    Answers you can <span className="italic font-serif font-normal">trust</span>
                  </motion.h1>

                  <motion.p
                    custom={2}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="text-sm sm:text-base text-[#777b86] leading-relaxed max-w-xl"
                  >
                    {slide.description}
                  </motion.p>
                </div>

                {/* 3 Editorial Cards Grid Matching Refero Screenshot 1 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
                  {/* Card 1: Answers you can trust */}
                  <motion.div
                    custom={3}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
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
                    custom={4}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
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
                    custom={5}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
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
            )}

            {/* Slide 3.00: Deep Analysis (From Screenshot 2) */}
            {slide.id === "3.00" && (
              <div className="relative rounded-[28px] bg-[#ffffff] border border-[#ececec] p-8 sm:p-12 lg:p-16 min-h-[580px] lg:min-h-[640px] flex flex-col justify-between">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Editorial Headline & Copy */}
                  <div className="lg:col-span-5 space-y-4">
                    <motion.div
                      custom={0}
                      variants={itemFadeUp}
                      initial="hidden"
                      animate="visible"
                      className="flex items-center gap-1.5 text-xs text-[#777b86] font-normal"
                    >
                      <span>{slide.tagline}</span>
                      <span>›</span>
                    </motion.div>

                    <motion.h1
                      custom={1}
                      variants={itemFadeUp}
                      initial="hidden"
                      animate="visible"
                      className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal text-[#17191c] tracking-[-1.5px] leading-[1.12]"
                    >
                      Unlock <span className="italic font-serif font-normal">deep analysis</span>
                    </motion.h1>

                    <motion.p
                      custom={2}
                      variants={itemFadeUp}
                      initial="hidden"
                      animate="visible"
                      className="text-sm sm:text-base text-[#777b86] leading-relaxed"
                    >
                      {slide.description}
                    </motion.p>

                    <motion.div
                      custom={3}
                      variants={itemFadeUp}
                      initial="hidden"
                      animate="visible"
                      className="pt-2 flex items-center gap-4"
                    >
                      <Link
                        href="/dashboard/ai-analyst"
                        className="px-6 py-2.5 rounded-full bg-[#17191c] text-[#ffffff] font-normal text-sm hover:bg-black transition-all cursor-pointer shadow-sm"
                      >
                        Try Ricoz AI
                      </Link>

                      <Link
                        href="/dashboard/explore"
                        className="text-sm text-[#17191c] hover:text-[#777b86] transition-colors flex items-center gap-1 group"
                      >
                        <span>Learn more</span>
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </Link>
                    </motion.div>
                  </div>

                  {/* Right Column: Floating Window with Avatar Badges Matching Screenshot 2 */}
                  <div className="lg:col-span-7 relative">
                    <motion.div
                      custom={4}
                      variants={itemFadeUp}
                      initial="hidden"
                      animate="visible"
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
              </div>
            )}

            {/* Slide 4.00: Warm Editorial (The Signature Blush Peach Accent Card) */}
            {slide.id === "4.00" && (
              <div className="relative rounded-[28px] bg-[#fbe1d1] text-[#5d2a1a] p-8 sm:p-12 lg:p-16 min-h-[580px] lg:min-h-[640px] flex flex-col justify-between overflow-hidden">
                <div className="max-w-2xl space-y-4">
                  <motion.div
                    custom={0}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center gap-1.5 text-xs text-[#5d2a1a]/80 font-normal uppercase tracking-wider"
                  >
                    <span>{slide.tagline}</span>
                    <span>›</span>
                  </motion.div>

                  <motion.h1
                    custom={1}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal text-[#5d2a1a] tracking-[-1.5px] leading-[1.12]"
                  >
                    Serif analytics on <br />
                    <span className="italic font-serif font-normal text-[#5d2a1a]">warm paper</span>
                  </motion.h1>

                  <motion.p
                    custom={2}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="text-sm sm:text-base text-[#5d2a1a]/90 leading-relaxed max-w-lg"
                  >
                    {slide.description}
                  </motion.p>
                </div>

                {/* Editorial Callout & Metrics Artifact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
                  <motion.div
                    custom={3}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="p-6 rounded-[20px] bg-[#ffffff]/80 border border-[#5d2a1a]/20 shadow-sm"
                  >
                    <span className="text-xs text-[#5d2a1a]/70 uppercase tracking-wider font-semibold block">
                      Sub-second Aggregations
                    </span>
                    <div className="text-3xl font-serif text-[#5d2a1a] mt-2">18.4ms</div>
                    <p className="text-xs text-[#5d2a1a]/80 mt-1">Average DuckDB in-memory query time</p>
                  </motion.div>

                  <motion.div
                    custom={4}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="p-6 rounded-[20px] bg-[#ffffff]/80 border border-[#5d2a1a]/20 shadow-sm"
                  >
                    <span className="text-xs text-[#5d2a1a]/70 uppercase tracking-wider font-semibold block">
                      Typography
                    </span>
                    <div className="text-3xl font-serif text-[#5d2a1a] mt-2">Signifier 400</div>
                    <p className="text-xs text-[#5d2a1a]/80 mt-1">Authority without shouting in bold</p>
                  </motion.div>

                  <motion.div
                    custom={5}
                    variants={itemFadeUp}
                    initial="hidden"
                    animate="visible"
                    className="p-6 rounded-[20px] bg-[#ffffff]/80 border border-[#5d2a1a]/20 shadow-sm flex flex-col justify-between"
                  >
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
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
