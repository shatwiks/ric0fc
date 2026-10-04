"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  AlertOctagon,
  Info,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Database,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { api, PulseInsight, Dataset } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export default function PulsePage() {
  const { user } = useAuthStore();
  const canScan = user?.role !== "Viewer";

  const [insights, setInsights] = useState<PulseInsight[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filters
  const [activeSeverity, setActiveSeverity] = useState<string>("all");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("all");

  const loadInsightsAndDatasets = async () => {
    setIsLoading(true);
    try {
      const [insList, dsList] = await Promise.all([
        api.listPulseInsights(),
        api.listDatasets(),
      ]);
      setInsights(insList);
      setDatasets(dsList);
    } catch (err: any) {
      console.error("Failed to load pulse data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsightsAndDatasets();
  }, []);

  const handleGenerateInsights = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setStatusMessage(null);
    try {
      const targetDs = selectedDatasetId !== "all" ? selectedDatasetId : undefined;
      const resp = await api.generatePulseInsights(targetDs);
      setStatusMessage(`Scan completed: ${resp.message}`);
      // Refresh list
      const insList = await api.listPulseInsights();
      setInsights(insList);
    } catch (err: any) {
      setStatusMessage(`Scan failed: ${err.message || "An error occurred"}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Filtered insights
  const filteredInsights = insights.filter((ins) => {
    if (activeSeverity !== "all" && ins.severity.toLowerCase() !== activeSeverity.toLowerCase()) {
      return false;
    }
    if (selectedDatasetId !== "all" && ins.dataset_id !== selectedDatasetId) {
      return false;
    }
    return true;
  });

  const criticalCount = insights.filter((i) => i.severity.toLowerCase() === "critical").length;
  const warningCount = insights.filter((i) => i.severity.toLowerCase() === "warning").length;
  const infoCount = insights.filter((i) => i.severity.toLowerCase() === "info" || i.severity.toLowerCase() === "opportunity").length;

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* Editorial Header with Warm Wood/Musky Accents */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#ececec]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#17191c] tracking-[-0.66px]">
              RicozPulse
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 flex items-center gap-1.5 shadow-2xs">
              <Activity className="w-3.5 h-3.5 text-[#5d2a1a]" />
              <span>Executive Radar</span>
            </span>
          </div>
          <p className="text-sm text-[#777b86] max-w-2xl leading-relaxed">
            Automated intelligence radar monitoring statistical anomalies, shifts, and high-impact contributors across datasets.
          </p>
        </div>

        {canScan && (
          <button
            onClick={handleGenerateInsights}
            disabled={isScanning}
            className="py-2.5 px-6 rounded-full bg-[#17191c] hover:bg-black text-[#ffffff] font-normal text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isScanning ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#ffffff]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#ffffff]" />
            )}
            <span>{isScanning ? "Scanning Datasets..." : "Scan & Generate Insights"}</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-4 rounded-[20px] bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 flex items-center gap-2.5 text-xs sm:text-sm font-medium shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#5d2a1a]" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filter and Overview Controls Bar */}
      <div className="p-4 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Severity Tabs Pill Container */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 bg-[#fafafb] p-1.5 rounded-full border border-[#ececec]">
          <button
            onClick={() => setActiveSeverity("all")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer whitespace-nowrap ${
              activeSeverity === "all"
                ? "bg-[#17191c] text-[#ffffff] shadow-xs"
                : "text-[#777b86] hover:text-[#17191c]"
            }`}
          >
            All Insights ({insights.length})
          </button>
          <button
            onClick={() => setActiveSeverity("critical")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSeverity === "critical"
                ? "bg-[#5d2a1a] text-[#fbe1d1] shadow-xs"
                : "text-[#5d2a1a] hover:bg-[#fbe1d1]/50"
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Critical ({criticalCount})</span>
          </button>
          <button
            onClick={() => setActiveSeverity("warning")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSeverity === "warning"
                ? "bg-[#b45309] text-[#ffffff] shadow-xs"
                : "text-[#b45309] hover:bg-amber-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Warning ({warningCount})</span>
          </button>
          <button
            onClick={() => setActiveSeverity("info")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSeverity === "info"
                ? "bg-[#1e293b] text-[#ffffff] shadow-xs"
                : "text-[#777b86] hover:bg-[#f2f2f3]"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Information ({infoCount})</span>
          </button>
        </div>

        {/* Dataset Filter */}
        <div className="flex items-center gap-2 bg-[#fafafb] border border-[#ececec] rounded-full px-4 py-2 shadow-sm">
          <Database className="w-4 h-4 text-[#5d2a1a] shrink-0" />
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="bg-transparent text-xs text-[#17191c] font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Workspace Datasets</option>
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id} className="bg-[#ffffff] text-[#17191c]">
                {ds.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Insights Stream */}
      {isLoading ? (
        <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#5d2a1a] animate-spin" />
          <p className="text-sm font-medium text-[#777b86]">Loading executive pulse feed...</p>
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="bg-[#ffffff] border border-[#ececec] rounded-[24px] p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-artifact">
          <div className="w-14 h-14 rounded-2xl bg-[#f2f2f3] flex items-center justify-center text-[#777b86]">
            <Activity className="w-7 h-7 text-[#5d2a1a]" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-normal text-[#17191c]">No Insights Found</h3>
            <p className="text-xs text-[#777b86] mt-1 max-w-sm leading-relaxed">
              {insights.length === 0
                ? "No intelligence movements scanned yet. Click 'Scan & Generate Insights' to trigger automated DuckDB anomaly detection."
                : "No insights matching the selected severity or dataset filter."}
            </p>
          </div>
          {canScan && insights.length === 0 && (
            <button
              onClick={handleGenerateInsights}
              disabled={isScanning}
              className="py-2 px-5 bg-[#17191c] hover:bg-black text-[#ffffff] text-xs font-normal rounded-full shadow-sm transition-colors cursor-pointer"
            >
              Scan Datasets Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredInsights.map((ins) => {
            const isCritical = ins.severity.toLowerCase() === "critical";
            const isWarning = ins.severity.toLowerCase() === "warning";
            const isPositiveChange = ins.change_percentage > 0;

            return (
              <div
                key={ins.id}
                className="bg-[#ffffff] border border-[#ececec] rounded-[24px] p-6 shadow-artifact space-y-4 flex flex-col justify-between hover:border-[#5d2a1a]/40 transition-all"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 border ${
                        isCritical
                          ? "bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]"
                          : isWarning
                          ? "bg-[#fef3c7] text-[#92400e] border-[#fde68a]"
                          : "bg-[#f2f2f3] text-[#17191c] border-[#ececec]"
                      }`}
                    >
                      {isCritical ? (
                        <AlertOctagon className="w-3.5 h-3.5" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <Info className="w-3.5 h-3.5" />
                      )}
                      <span>{ins.severity.toUpperCase()}</span>
                    </span>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#777b86] font-mono">
                      <Database className="w-3.5 h-3.5 text-[#5d2a1a]" />
                      <span className="truncate max-w-[150px]">
                        {ins.dataset_name || "Dataset"}
                      </span>
                    </div>
                  </div>

                  {/* Title & Metric Pill */}
                  <div>
                    <h3 className="text-base sm:text-lg font-serif font-normal text-[#17191c] tracking-tight">
                      {ins.dimension_value && ins.dimension_value !== "All Segments"
                        ? `${ins.metric_name}: ${ins.dimension_value}`
                        : `${ins.metric_name} Anomaly`}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className="text-[#777b86]">
                        Observed: <strong className="text-[#17191c] font-medium">{ins.current_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                      </span>
                      <span className="text-[#777b86]">
                        Baseline: <strong className="text-[#17191c] font-medium">{ins.previous_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                      </span>
                      {ins.change_percentage !== 0 && (
                        <span className={`font-mono text-xs font-semibold flex items-center gap-0.5 ${isPositiveChange ? "text-[#137333]" : "text-[#c5221f]"}`}>
                          {isPositiveChange ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isPositiveChange ? "+" : ""}{ins.change_percentage}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Explanation Narrative */}
                  <p className="text-xs sm:text-sm text-[#777b86] leading-relaxed">
                    {ins.explanation}
                  </p>

                  {/* Recommended Action Callout */}
                  <div className="p-3.5 rounded-[14px] bg-[#fafafb] border border-[#ececec] text-xs space-y-1">
                    <span className="font-medium text-[#17191c] flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#5d2a1a]" />
                      Recommended Action:
                    </span>
                    <p className="text-[#777b86] leading-relaxed">{ins.recommended_action}</p>
                  </div>
                </div>

                {/* Footer Link to Data Detective */}
                <div className="pt-3 border-t border-[#f2f2f3] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#979799] font-mono">
                    {new Date(ins.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                  {ins.investigation_link ? (
                    <Link
                      href={ins.investigation_link}
                      className="text-[#5d2a1a] hover:underline font-medium flex items-center gap-1 group"
                    >
                      <span>Investigate in Detective</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard/data-detective"
                      className="text-[#5d2a1a] hover:underline font-medium flex items-center gap-1 group"
                    >
                      <span>Data Detective</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
