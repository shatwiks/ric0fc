"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

interface NavbarProps {
  onOpenContact: () => void;
}

export default function Navbar({ onOpenContact }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      // Past full-screen hero (~600px)
      setIsPastHero(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Product", href: "#chapter-1" },
    { label: "Trust", href: "#chapter-2" },
    { label: "Analysis", href: "#chapter-3" },
    { label: "Overview", href: "#overview" },
    { label: "Capabilities", href: "#capabilities" },
    { label: "Use Cases", href: "#use-cases" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-colors duration-300 ${
        isPastHero
          ? "bg-[#ffffff]/90 backdrop-blur-md border-b border-[#f2f2f3] text-[#17191c]"
          : "bg-[#111317]/85 backdrop-blur-md border-b border-white/10 text-white"
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
              isPastHero ? "bg-[#17191c] text-white" : "bg-white text-[#111317]"
            }`}
          >
            <span className="text-[13px] font-serif font-bold italic leading-none">R</span>
          </div>
          <span
            className={`text-base font-semibold tracking-[-0.3px] transition-colors ${
              isPastHero ? "text-[#17191c]" : "text-white"
            }`}
          >
            Ricoz
            <span
              className={`font-serif italic font-normal ${
                isPastHero ? "text-[#5d2a1a]" : "text-[#fbe1d1]"
              }`}
            >
              Viz
            </span>
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav
          className={`hidden md:flex items-center gap-7 text-[14px] font-normal transition-colors ${
            isPastHero ? "text-[#17191c]" : "text-slate-300"
          }`}
        >
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`transition-colors py-1 ${
                isPastHero ? "hover:text-[#777b86]" : "hover:text-white"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right CTAs */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={onOpenContact}
            className={`px-5 py-2 rounded-full border text-sm font-normal transition-all cursor-pointer ${
              isPastHero
                ? "border-[#17191c] text-[#17191c] hover:bg-[#f2f2f3]"
                : "border-white/40 text-white hover:bg-white/10"
            }`}
          >
            Book a demo
          </button>

          {mounted && isAuthenticated ? (
            <Link
              href="/dashboard"
              className={`px-5 py-2 rounded-full text-sm font-normal transition-all flex items-center gap-1.5 shadow-sm ${
                isPastHero
                  ? "bg-[#17191c] text-[#ffffff] hover:bg-black"
                  : "bg-[#ffffff] text-[#17191c] hover:bg-slate-100"
              }`}
            >
              <span>Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              href="/auth/signup"
              className={`px-5 py-2 rounded-full text-sm font-normal transition-all flex items-center gap-1.5 shadow-sm ${
                isPastHero
                  ? "bg-[#17191c] text-[#ffffff] hover:bg-black"
                  : "bg-[#ffffff] text-[#17191c] hover:bg-slate-100"
              }`}
            >
              <span>Get started</span>
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          {mounted && isAuthenticated ? (
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-full text-xs font-normal ${
                isPastHero ? "bg-[#17191c] text-white" : "bg-white text-[#111317]"
              }`}
            >
              Workspace
            </Link>
          ) : (
            <Link
              href="/auth/signup"
              className={`px-3 py-1.5 rounded-full text-xs font-normal ${
                isPastHero ? "bg-[#17191c] text-white" : "bg-white text-[#111317]"
              }`}
            >
              Get started
            </Link>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-1.5 rounded-lg transition-colors ${
              isPastHero ? "text-[#17191c] hover:bg-[#f2f2f3]" : "text-white hover:bg-white/10"
            }`}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          className={`md:hidden px-4 py-4 space-y-3 ${
            isPastHero
              ? "bg-[#ffffff] border-b border-[#ececec] text-[#17191c]"
              : "bg-[#111317] border-b border-white/10 text-white"
          }`}
        >
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm py-1 opacity-90 hover:opacity-100"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-2 border-t border-slate-700/50 flex flex-col gap-2">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenContact();
              }}
              className="w-full text-center py-2.5 rounded-full border border-current text-sm"
            >
              Book a demo
            </button>
            <Link
              href="/auth/login"
              className="text-center text-xs opacity-75 py-1"
            >
              Sign in to account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
