"use client";

import { useAuthStore } from "@/store/auth-store";
import { Settings, User, Building2, Shield, Key } from "lucide-react";

export default function SettingsPage() {
  const { user, organization, workspace, permissions } = useAuthStore();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-normal text-[#17191c] tracking-tight flex items-center gap-3">
          <Settings className="h-6 w-6 text-[#5d2a1a]" />
          Workspace & Profile Settings
        </h1>
        <p className="text-xs text-[#777b86] mt-1.5">
          Review your enterprise identity and role permissions.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-5">
        <h2 className="text-sm font-semibold text-[#17191c] flex items-center gap-2">
          <User className="h-4 w-4 text-[#5d2a1a]" /> User Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#f8f8f9] border border-[#ececec]">
            <span className="text-[#777b86] block mb-1">Full Name</span>
            <span className="text-[#17191c] font-semibold text-sm">{user?.full_name}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#f8f8f9] border border-[#ececec]">
            <span className="text-[#777b86] block mb-1">Work Email</span>
            <span className="text-[#17191c] font-semibold text-sm">{user?.email}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#f8f8f9] border border-[#ececec]">
            <span className="text-[#777b86] block mb-1">Assigned Role</span>
            <span className="px-3 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] font-semibold text-xs border border-[#5d2a1a]/20 inline-block">
              {user?.role}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#f8f8f9] border border-[#ececec]">
            <span className="text-[#777b86] block mb-1">Account Status</span>
            <span className="px-3 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] font-semibold text-xs border border-[#5d2a1a]/20 inline-block shadow-2xs">
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-5">
        <h2 className="text-sm font-semibold text-[#17191c] flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[#5d2a1a]" /> Organization & Workspace
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#f8f8f9] border border-[#ececec]">
            <span className="text-[#777b86] block mb-1">Organization</span>
            <span className="text-[#17191c] font-semibold text-sm">{organization?.name}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#f8f8f9] border border-[#ececec]">
            <span className="text-[#777b86] block mb-1">Active Workspace</span>
            <span className="text-[#17191c] font-semibold text-sm">{workspace?.name}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#f8f8f9] border border-[#ececec]">
            <span className="text-[#777b86] block mb-1">Subscription Tier</span>
            <span className="text-[#17191c] font-semibold uppercase">{organization?.plan || "Enterprise"}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#f8f8f9] border border-[#ececec]">
            <span className="text-[#777b86] block mb-1">Security Model</span>
            <span className="text-[#17191c] font-semibold">PostgreSQL RBAC + JWT</span>
          </div>
        </div>

        <div className="pt-2">
          <a
            href="/dashboard/settings/organization"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5d2a1a] text-white text-xs font-semibold hover:bg-[#4a2114] transition-colors shadow-2xs"
          >
            <Building2 className="h-3.5 w-3.5" />
            Manage Organization, Members & Invites →
          </a>
        </div>
      </div>
    </div>
  );
}
