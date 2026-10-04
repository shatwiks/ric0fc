"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Lock, Mail, User, Building2, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function SignupCard() {
  const router = useRouter();
  const { signup, isLoading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState("Admin");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!fullName || !email || !password || !orgName) {
      setValidationError("All fields are required to create an enterprise account.");
      return;
    }

    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters.");
      return;
    }

    try {
      await signup({
        full_name: fullName,
        email,
        password,
        organization_name: orgName,
        role,
      });
      router.push("/dashboard");
    } catch {
      // Handled by store
    }
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

        <span className="px-2.5 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] text-[11px] font-medium tracking-wide">
          Enterprise Access
        </span>
      </div>

      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#17191c] tracking-[-0.66px]">
          Create enterprise workspace
        </h1>
        <p className="text-xs sm:text-sm text-[#777b86]">
          Start modeling and exploring data on your governed semantic canvas.
        </p>
      </div>

      {(validationError || error) && (
        <div className="mb-5 p-3 rounded-[16px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{validationError || error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-normal text-[#777b86] mb-1">Organization Name</label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-2.5 w-4 h-4 text-[#a3a6af]" />
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Global Corporation"
              className="w-full pl-10 pr-4 py-2 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-normal text-[#777b86] mb-1">Full Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-2.5 w-4 h-4 text-[#a3a6af]" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full pl-10 pr-4 py-2 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-normal text-[#777b86] mb-1">Work Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-[#a3a6af]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@acme.com"
              className="w-full pl-10 pr-4 py-2 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-normal text-[#777b86] mb-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-[#a3a6af]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full pl-10 pr-4 py-2 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-normal text-[#777b86] mb-1">Initial User Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] outline-none transition-all"
          >
            <option value="Admin">Administrator (Full Access)</option>
            <option value="Analyst">Data Analyst (Create & Edit)</option>
            <option value="Explorer">Data Explorer (View & Filter)</option>
            <option value="Viewer">Dashboard Viewer (Read Only)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-3 py-3 px-6 bg-[#17191c] text-[#ffffff] hover:bg-black font-normal rounded-full text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Provisioning workspace...</span>
            </>
          ) : (
            <>
              <span>Create account & workspace</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[#777b86]">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#17191c] font-medium hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
