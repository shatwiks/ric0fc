"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  User,
  Mail,
  Sparkles,
} from "lucide-react";
import { api, InvitationPublicDetails } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { acceptInvitation } = useAuthStore();

  const [invitation, setInvitation] = useState<InvitationPublicDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchInvite = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const details = await api.getPublicInvitation(token);
        setInvitation(details);
      } catch (err: any) {
        setFetchError(err?.message || "Invitation link is invalid, expired, or already used.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await acceptInvitation(token, {
        full_name: fullName,
        password: password,
      });

      router.push("/dashboard");
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to accept invitation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
        <div className="p-8 rounded-3xl bg-white border border-[#ececec] shadow-artifact text-center max-w-md w-full space-y-4">
          <div className="w-10 h-10 border-3 border-[#5d2a1a] border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-sm font-semibold text-[#17191c]">Verifying invitation token...</h2>
          <p className="text-xs text-[#777b86]">Validating enterprise workspace security credentials.</p>
        </div>
      </div>
    );
  }

  if (fetchError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
        <div className="p-8 rounded-3xl bg-white border border-[#ececec] shadow-artifact text-center max-w-md w-full space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#17191c]">Invalid or Expired Invitation</h2>
            <p className="text-xs text-[#777b86] leading-relaxed">
              {fetchError || "This invitation link may have been revoked, expired, or previously redeemed."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#5d2a1a] text-white text-xs font-semibold hover:bg-[#4a2114] transition-colors w-full shadow-2xs"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-[#ececec] shadow-artifact space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#fbe1d1] text-[#5d2a1a] flex items-center justify-center mx-auto border border-[#5d2a1a]/20 shadow-2xs">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-normal text-[#17191c] tracking-tight">
            Join {invitation.organization_name}
          </h1>
          <p className="text-xs text-[#777b86]">
            You have been invited to join RicozViz as an enterprise{" "}
            <span className="font-semibold text-[#5d2a1a]">{invitation.role}</span>.
          </p>
        </div>

        {/* Invited Info Banner */}
        <div className="p-3.5 rounded-2xl bg-[#f8f8f9] border border-[#ececec] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#777b86]">Organization</span>
            <span className="font-semibold text-[#17191c]">{invitation.organization_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#777b86]">Invited Email</span>
            <span className="font-mono text-[11px] font-semibold text-[#17191c]">{invitation.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#777b86]">Assigned Role</span>
            <span className="px-2 py-0.5 rounded-full bg-[#fbe1d1] text-[#5d2a1a] font-semibold text-[10px]">
              {invitation.role}
            </span>
          </div>
        </div>

        {submitError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Acceptance Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#17191c] mb-1.5">Your Full Name</label>
            <div className="relative">
              <User className="h-4 w-4 text-[#777b86] absolute left-3 top-3" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#ececec] text-xs focus:outline-none focus:border-[#5d2a1a]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#17191c] mb-1.5">Create Secure Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-[#777b86] absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#ececec] text-xs focus:outline-none focus:border-[#5d2a1a]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#17191c] mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-[#777b86] absolute left-3 top-3" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#ececec] text-xs focus:outline-none focus:border-[#5d2a1a]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-[#5d2a1a] text-white text-xs font-semibold hover:bg-[#4a2114] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xs"
            >
              {isSubmitting ? "Activating Account..." : "Accept Invitation & Enter Workspace"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        <div className="text-center pt-2 border-t border-[#ececec]">
          <Link href="/login" className="text-xs text-[#777b86] hover:text-[#5d2a1a] transition-colors">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
