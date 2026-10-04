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
    <div className="flex flex-col space-y-5 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              RicozPulse
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Executive Radar
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Automated intelligence radar monitoring statistical anomalies, shifts, and high-impact contributors across datasets.
          </p>
        </div>

        {canScan && (
          <button
            onClick={handleGenerateInsights}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
          >
            {isScanning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isScanning ? "Scanning Datasets..." : "Scan & Generate Insights"}</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filter and Overview Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-3.5 shadow-sm">
        {/* Severity Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSeverity("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeSeverity === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All Insights ({insights.length})
          </button>
          <button
            onClick={() => setActiveSeverity("critical")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSeverity === "critical"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Critical ({criticalCount})</span>
          </button>
          <button
            onClick={() => setActiveSeverity("warning")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSeverity === "warning"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Warning ({warningCount})</span>
          </button>
          <button
            onClick={() => setActiveSeverity("info")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSeverity === "info"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Information ({infoCount})</span>
          </button>
        </div>

        {/* Dataset Filter */}
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Workspace Datasets</option>
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Insights Stream */}
      {isLoading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-foreground">Loading executive pulse feed...</p>
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-base">No Insights Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {insights.length === 0
                ? "No intelligence movements scanned yet. Click 'Scan & Generate Insights' to trigger automated DuckDB anomaly detection."
                : "No insights matching the selected severity or dataset filter."}
            </p>
          </div>
          {canScan && insights.length === 0 && (
            <button
              onClick={handleGenerateInsights}
              disabled={isScanning}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm"
            >
              Scan Datasets Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInsights.map((ins) => {
            const isCritical = ins.severity.toLowerCase() === "critical";
            const isWarning = ins.severity.toLowerCase() === "warning";
            const isPositiveChange = ins.change_percentage > 0;

            return (
              <div
                key={ins.id}
                className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3.5 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div className="space-y-2.5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 border ${
                        isCritical
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : isWarning
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
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

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                      <Database className="w-3 h-3" />
                      <span className="truncate max-w-[140px]">
                        {ins.dataset_name || "Dataset"}
                      </span>
                    </div>
                  </div>

                  {/* Title & Metric Pill */}
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-foreground">
                      {ins.dimension_value && ins.dimension_value !== "All Segments"
                        ? `${ins.metric_name}: ${ins.dimension_value}`
                        : `${ins.metric_name} Anomaly`}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="text-muted-foreground">
                        Observed: <strong className="text-foreground">{ins.current_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Baseline: <strong className="text-foreground">{ins.previous_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                      </span>
                      {ins.change_percentage !== 0 && (
                        <span className={`font-semibold flex items-center gap-0.5 ${isPositiveChange ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {isPositiveChange ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isPositiveChange ? "+" : ""}{ins.change_percentage}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Explanation Narrative */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {ins.explanation}
                  </p>

                  {/* Recommended Action Callout */}
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                      Recommended Action:
                    </span>
                    <p className="text-muted-foreground">{ins.recommended_action}</p>
                  </div>
                </div>

                {/* Footer Link to Data Detective */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground">
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
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Investigate in Detective</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard/data-detective"
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Data Detective</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
