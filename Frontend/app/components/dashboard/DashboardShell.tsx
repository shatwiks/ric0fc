"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import Sidebar from "@/components/dashboard/Sidebar";
import TopNav from "@/components/dashboard/TopNav";
import { Loader2 } from "lucide-react";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isInitializing, fetchCurrentUser } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then((isAuthed) => {
      if (!isAuthed) {
        router.push("/auth/login");
      }
    });
  }, [fetchCurrentUser, router]);

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#fafafb] text-[#17191c]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#17191c] flex items-center justify-center text-white shadow-md">
            <span className="text-base font-serif font-bold italic">R</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#777b86]">
            <Loader2 className="w-4 h-4 animate-spin text-[#17191c]" />
            <span>Validating enterprise session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirects via useEffect
  }

  return (
    <div className="flex h-screen w-full bg-[#fafafb] text-[#17191c] overflow-hidden selection:bg-[#fbe1d1] selection:text-[#5d2a1a]">
      {/* Editorial Sidebar Navigation */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNav onOpenMobile={() => setIsMobileOpen(true)} />

        {/* Workspace Canvas — Calm Paper White / Fog White Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#fafafb]">
          {children}
        </main>
      </div>
    </div>
  );
}
