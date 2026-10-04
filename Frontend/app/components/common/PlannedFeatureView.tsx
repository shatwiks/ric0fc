import { LucideIcon, Clock, CheckCircle2 } from "lucide-react";

interface PlannedFeatureViewProps {
  title: string;
  description: string;
  day: string;
  icon: LucideIcon;
  features: string[];
}

export default function PlannedFeatureView({
  title,
  description,
  day,
  icon: Icon,
  features,
}: PlannedFeatureViewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-8 rounded-3xl bg-[#ffffff] border border-[#ececec] shadow-artifact">
        <div className="flex items-center gap-4 mb-5">
          <div className="h-12 w-12 rounded-2xl bg-[#fbe1d1] border border-[#5d2a1a]/20 flex items-center justify-center text-[#5d2a1a]">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-2xl font-normal text-[#17191c] tracking-tight">{title}</h1>
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#5d2a1a] bg-[#fbe1d1] px-3 py-0.5 rounded-full border border-[#5d2a1a]/20">
                <Clock className="h-3 w-3" /> Scheduled for {day}
              </span>
            </div>
            <p className="text-xs text-[#777b86] mt-1.5">{description}</p>
          </div>
        </div>

        <div className="pt-5 border-t border-[#ececec]">
          <h2 className="text-xs font-semibold text-[#17191c] uppercase tracking-wider mb-3">
            Core Scope for this module:
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#f8f8f9] border border-[#ececec] text-xs text-[#17191c]"
              >
                <CheckCircle2 className="h-4 w-4 text-[#5d2a1a] shrink-0" />
                <span className="font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
