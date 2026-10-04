"use client";

import { useState } from "react";
import { X, Building2, Mail, User, Send, CheckCircle2, Shield, Loader2 } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [teamSize, setTeamSize] = useState("50-250");
  const [useCase, setUseCase] = useState("Executive & Operational Dashboards");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 700);
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-8 sm:p-10 bg-[#ffffff] border border-[#ececec] rounded-[24px] shadow-[0px_8px_40px_rgba(0,0,0,0.12)] text-[#17191c]">
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#fbe1d1] flex items-center justify-center text-[#5d2a1a]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-serif font-normal text-[#17191c]">Inquiry received</h3>
            <p className="text-xs text-[#777b86] max-w-sm mx-auto leading-relaxed">
              Thank you, <strong>{name}</strong>. Our enterprise solutions team has received your request for{" "}
              <strong>{company || "your organization"}</strong> and will contact you at <strong>{email}</strong> within 2 hours.
            </p>
            <div className="pt-4">
              <button
                onClick={handleResetAndClose}
                className="px-6 py-2.5 rounded-full bg-[#17191c] text-white text-xs font-normal hover:bg-black transition-colors cursor-pointer"
              >
                Close window
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1.5">
              <span className="text-xs text-[#979799] uppercase tracking-wider font-normal">
                Direct Consultation
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#17191c] tracking-tight">
                Talk to enterprise solutions
              </h3>
              <p className="text-xs text-[#777b86]">Schedule a personalized architectural walkthrough</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-[#a3a6af]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Marcus Vance"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#a3a6af]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marcus@enterprise.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-normal text-[#777b86] mb-1">Company</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-[#a3a6af]" />
                    <input
                      type="text"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Quantum Corp"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-normal text-[#777b86] mb-1">Team Size</label>
                  <select
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none transition-all"
                  >
                    <option value="1-50">1 - 50 team members</option>
                    <option value="50-250">50 - 250 team members</option>
                    <option value="250-1000">250 - 1,000 team members</option>
                    <option value="1000+">1,000+ team members</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1">Primary Focus</label>
                <select
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none transition-all"
                >
                  <option value="Executive & Operational Dashboards">Executive & Operational Dashboards</option>
                  <option value="Self-Service Business Intelligence">Self-Service Business Intelligence</option>
                  <option value="AI-Powered Root Cause Analytics">AI-Powered Root Cause Analytics</option>
                  <option value="PostgreSQL & DuckDB In-Memory Engine">PostgreSQL & DuckDB In-Memory Engine</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-6 bg-[#17191c] text-[#ffffff] hover:bg-black rounded-full text-xs font-normal transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Scheduling consultation...</span>
                  </>
                ) : (
                  <>
                    <span>Request Briefing</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
