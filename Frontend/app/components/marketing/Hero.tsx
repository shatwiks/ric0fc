"use client";

import HeroFullScreen from "./HeroFullScreen";
import ScrollChapters from "./ScrollChapters";

interface HeroProps {
  onOpenContact: () => void;
}

export default function Hero({ onOpenContact }: HeroProps) {
  return (
    <div className="w-full">
      {/* 1. Full-Screen Black Hero Section */}
      <HeroFullScreen onOpenContact={onOpenContact} />

      {/* 2. Four Chapters (1.00 to 4.00) with Appearing Text on Scroll */}
      <ScrollChapters />
    </div>
  );
}
