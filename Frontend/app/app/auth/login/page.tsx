import LoginCard from "@/components/auth/LoginCard";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#fafafb] text-[#17191c] overflow-hidden select-none">
      {/* Subtle warm ambient wash */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#fbe1d1]/30 blur-[100px] rounded-full pointer-events-none" />

      {/* Editorial Floating Login Card */}
      <LoginCard />
    </div>
  );
}
