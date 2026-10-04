"use client";

import Link from "next/link";
import { Shield, Lock, Server } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#ffffff] border-t border-[#ececec] text-[#777b86] text-xs">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand info */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#17191c] flex items-center justify-center text-white">
                <span className="font-serif text-xs font-normal">R</span>
              </div>
              <span className="text-base font-medium tracking-tight text-[#17191c]">
                Ricoz<span className="text-[#979799]">Viz</span>
              </span>
            </Link>

            <p className="text-xs text-[#777b86] max-w-sm leading-relaxed">
              Editorial data platform empowering product and executive teams with governed semantic intelligence.
            </p>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-[#777b86]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>All Systems Operational • PostgreSQL 18 Live</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-[#17191c] tracking-wide">Product</h4>
            <ul className="space-y-2 text-[#777b86]">
              <li>
                <a href="#overview" className="hover:text-[#17191c] transition-colors">
                  Overview
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-[#17191c] transition-colors">
                  Capabilities
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#17191c] transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#ai" className="hover:text-[#17191c] transition-colors">
                  AI Analyst
                </a>
              </li>
              <li>
                <Link href="/auth/signup" className="hover:text-[#17191c] transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Solutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-[#17191c] tracking-wide">Solutions</h4>
            <ul className="space-y-2 text-[#777b86]">
              <li>
                <a href="#use-cases" className="hover:text-[#17191c] transition-colors">
                  Executive Dashboards
                </a>
              </li>
              <li>
                <a href="#use-cases" className="hover:text-[#17191c] transition-colors">
                  Operational BI
                </a>
              </li>
              <li>
                <a href="#use-cases" className="hover:text-[#17191c] transition-colors">
                  Root Cause Analytics
                </a>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#17191c] transition-colors">
                  Workspace Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-[#17191c] tracking-wide">Security & Trust</h4>
            <ul className="space-y-2 text-[#777b86]">
              <li className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#17191c]" /> SOC2 Compliant
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#17191c]" /> 5-Tier RBAC
              </li>
              <li className="flex items-center gap-1.5">
                <Server className="w-3 h-3 text-[#17191c]" /> PostgreSQL 18
              </li>
              <li>
                <a
                  href="http://127.0.0.1:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#17191c] transition-colors"
                >
                  API Swagger Docs
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#ececec] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#979799]">
          <p>© {new Date().getFullYear()} RicozViz Enterprise Data Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[#17191c] transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-[#17191c] transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-[#17191c] transition-colors">
              Security Whitepaper
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
