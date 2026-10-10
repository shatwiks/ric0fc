"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, Building2, CheckCircle2 } from "lucide-react";

export default function LoginCard() {
  const router = useRouter();
  const { login, switchOrganization, organizations, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!email || !password) {
      setValidationError("Please enter both work email and password.");
      return;
    }

    try {
      await login({ email, password });
      const currentOrgs = useAuthStore.getState().organizations;
      if (currentOrgs && currentOrgs.length > 1) {
        setSelectedOrgId(currentOrgs[0].id);
        setShowOrgPicker(true);
      } else {
        router.push("/dashboard");
      }
    } catch {
      // Handled by store
    }
  };

  const handleSelectOrganization = async () => {
    if (!selectedOrgId) return;
    try {
      await switchOrganization(selectedOrgId);
      router.push("/dashboard");
    } catch {
      // Handled by store
    }
  };

  const handleQuickRole = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setValidationError(null);
    clearError();
  };

  return (
    <div className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-[#ffffff] border border-[#ececec] rounded-[24px] shadow-artifact">
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-[#17191c] flex items-center justify-center text-white">
            <span className="text-sm font-serif font-bold italic leading-none">R</span>
          </div>
          <span className="text-base font-semibold tracking-tight text-[#17191c]">
            Ricoz<span className="font-serif italic font-normal text-[#5d2a1a]">Viz</span>
          </span>
        </Link>

        {/* Editorial Accent Badge */}
        <span className="px-2.5 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] text-[11px] font-medium tracking-wide">
          Governed Session
        </span>
      </div>

      {showOrgPicker ? (
        /* Multi-Org Selection View */
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h1 className="text-2xl font-serif font-normal text-[#17191c] tracking-[-0.66px]">
              Choose your organization
            </h1>
            <p className="text-xs text-[#777b86] mt-1">
              Your account has access to multiple enterprise organizations.
            </p>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {organizations.map((org) => {
              const isSelected = selectedOrgId === org.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedOrgId(org.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "border-[#17191c] bg-[#faf8f5] shadow-xs"
                      : "border-[#ececec] bg-white hover:border-[#cfcfd2]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#f2f2f3] flex items-center justify-center text-[#5d2a1a]">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#17191c]">{org.name}</h4>
                      <p className="text-[11px] text-[#777b86]">
                        Role: <span className="font-medium text-[#17191c]">{org.role}</span> &bull; {org.workspaces?.length || 1} Workspace(s)
                      </p>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#5d2a1a]" />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSelectOrganization}
            disabled={isLoading || !selectedOrgId}
            className="w-full py-3 px-6 bg-[#17191c] text-[#ffffff] hover:bg-black font-normal rounded-full text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Switching organization...</span>
              </>
            ) : (
              <>
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      ) : (
        /* Standard Sign In Form */
        <>
          <div className="mb-6 space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#17191c] tracking-[-0.66px]">
              Sign in to your account
            </h1>
            <p className="text-xs sm:text-sm text-[#777b86]">
              Access your interactive dashboards and analytics workspace.
            </p>
          </div>

          {(validationError || error) && (
            <div className="mb-5 p-3 rounded-[16px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{validationError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-normal text-[#777b86] mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#a3a6af]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@enterprise.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-normal text-[#777b86] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#a3a6af]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-6 bg-[#17191c] text-[#ffffff] hover:bg-black font-normal rounded-full text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign in to workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Test Demo Roles — Neutral Pill Palette */}
          <div className="mt-8 pt-5 border-t border-[#f2f2f3]">
            <p className="text-[11px] font-normal text-[#979799] mb-2 uppercase tracking-wider">
              Demo Enterprise Roles (1-Click Fill)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickRole("admin@ricozviz.com", "admin123")}
                className="px-3 py-1.5 bg-[#f2f2f3] hover:bg-[#17191c] hover:text-white rounded-full text-xs text-[#17191c] font-normal transition-colors text-center cursor-pointer border border-[#ececec]"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickRole("analyst@ricozviz.com", "analyst123")}
                className="px-3 py-1.5 bg-[#f2f2f3] hover:bg-[#17191c] hover:text-white rounded-full text-xs text-[#17191c] font-normal transition-colors text-center cursor-pointer border border-[#ececec]"
              >
                Analyst
              </button>
              <button
                type="button"
                onClick={() => handleQuickRole("viewer@ricozviz.com", "viewer123")}
                className="px-3 py-1.5 bg-[#f2f2f3] hover:bg-[#17191c] hover:text-white rounded-full text-xs text-[#17191c] font-normal transition-colors text-center cursor-pointer border border-[#ececec]"
              >
                Viewer
              </button>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="mt-6 text-center text-xs text-[#777b86]">
            New to RicozViz?{" "}
            <Link href="/auth/signup" className="text-[#17191c] font-medium hover:underline">
              Create organization account
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
