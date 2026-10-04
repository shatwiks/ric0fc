"use client";

import { useState } from "react";
import Navbar from "@/components/marketing/Navbar";
import Hero from "@/components/marketing/Hero";
import Workflow from "@/components/marketing/Workflow";
import Capabilities from "@/components/marketing/Capabilities";
import Features from "@/components/marketing/Features";
import AISection from "@/components/marketing/AISection";
import Benefits from "@/components/marketing/Benefits";
import UseCases from "@/components/marketing/UseCases";
import CTA from "@/components/marketing/CTA";
import Footer from "@/components/marketing/Footer";
import ContactModal from "@/components/marketing/ContactModal";

export default function MarketingLandingPage() {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#ffffff] text-[#17191c] flex flex-col selection:bg-[#fbe1d1] selection:text-[#5d2a1a]">
      {/* Top Editorial Navigation */}
      <Navbar onOpenContact={() => setIsContactOpen(true)} />

      {/* Main Marketing Narrative */}
      <main className="flex-1">
        {/* 1. Hero with Interactive Stepper Slider & Staggered Animations */}
        <Hero onOpenContact={() => setIsContactOpen(true)} />

        {/* 2. Product Overview & Connect -> Model -> Explore -> Publish Workflow */}
        <Workflow />

        {/* 3. 5 Enterprise Capabilities */}
        <Capabilities />

        {/* 4. Core Architecture Features with Editorial Artifacts */}
        <Features />

        {/* 5. AI Features (Ricoz AI, Reasoning, Semantic Guardrails) */}
        <AISection />

        {/* 6. Enterprise Value & Productivity Benefits */}
        <Benefits />

        {/* 7. Industry & Stakeholder Use Cases */}
        <UseCases />

        {/* 8. Conversion CTA */}
        <CTA onOpenContact={() => setIsContactOpen(true)} />
      </main>

      {/* Editorial Footer */}
      <Footer />

      {/* Interactive Contact / Briefing Request Modal */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
}
