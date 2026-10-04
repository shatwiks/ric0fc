"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Layers,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Filter,
  FileSpreadsheet,
} from "lucide-react";
import {
  api,
  Dataset,
  DetectiveAnalyzeResponse,
  ContributorItem,
  WaterfallItem,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export default function DataDetectivePage() {
  const searchParams = useSearchParams();
  const initialDatasetId = searchParams.get("dataset_id") || "";
  const initialMetric = searchParams.get("metric") || "";
  const initialDimension = searchParams.get("dimension") || "";

  // Datasets state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(initialDatasetId);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState<boolean>(true);

  // Detective Config
  const [selectedMetric, setSelectedMetric] = useState<string>(initialMetric);
  const [selectedDimension, setSelectedDimension] = useState<string>(initialDimension);
  const [selectedAgg, setSelectedAgg] = useState<"sum" | "avg" | "count">("sum");

  // Analysis result
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<DetectiveAnalyzeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load datasets on mount
  useEffect(() => {
    async function loadDatasets() {
      setIsLoadingDatasets(true);
      try {
        const list = await api.listDatasets();
        setDatasets(list);
        if (list.length > 0) {
          const dsId = initialDatasetId && list.some((d) => d.id === initialDatasetId)
            ? initialDatasetId
            : list[0].id;
          setSelectedDatasetId(dsId);
        }
      } catch (err: any) {
        console.error("Failed to load datasets:", err);
      } finally {
        setIsLoadingDatasets(false);
      }
    }
    loadDatasets();
  }, [initialDatasetId]);

  // Update available metrics and dimensions when dataset changes
  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  const measureColumns = selectedDataset?.columns?.filter(
    (c) => c.is_measure || c.data_type === "integer" || c.data_type === "float"
  ) || [];

  const dimensionColumns = selectedDataset?.columns?.filter(
    (c) => c.is_dimension || c.data_type === "string" || c.data_type === "boolean"
  ) || [];

  useEffect(() => {
    if (measureColumns.length > 0 && (!selectedMetric || !measureColumns.some(m => m.name === selectedMetric))) {
      setSelectedMetric(measureColumns[0].name);
    }
    if (dimensionColumns.length > 0 && (!selectedDimension || !dimensionColumns.some(d => d.name === selectedDimension))) {
      setSelectedDimension(dimensionColumns[0].name);
    }
  }, [selectedDatasetId, measureColumns, dimensionColumns, selectedMetric, selectedDimension]);

  const handleRunAnalysis = async () => {
    if (!selectedDatasetId || !selectedMetric || !selectedDimension) return;
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const result = await api.analyzeDetective({
        dataset_id: selectedDatasetId,
        metric: selectedMetric,
        dimension: selectedDimension,
        agg: selectedAgg,
      });
      setAnalysisResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to execute Data Detective analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run automatically if query params exist
  useEffect(() => {
    if (selectedDatasetId && selectedMetric && selectedDimension && !analysisResult && !isAnalyzing) {
      handleRunAnalysis();
    }
  }, [selectedDatasetId, selectedMetric, selectedDimension]);

  return (
    <div className="flex flex-col space-y-5 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Search className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Data Detective
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
              Root-Cause Variance Engine
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Deconstruct metric variance across dimensions to pinpoint positive growth drivers and negative detractors.
          </p>
        </div>
      </div>

      {/* Investigation Config Controls */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Dataset Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>Target Dataset</span>
            </label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.row_count} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Target Metric</span>
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {measureColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.data_type})
                </option>
              ))}
            </select>
          </div>

          {/* Dimension Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Breakdown Dimension</span>
            </label>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {dimensionColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.data_type})
                </option>
              ))}
            </select>
          </div>

          {/* Aggregation & Action */}
          <div className="flex items-end gap-2">
            <div className="space-y-1 flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Aggregation
              </label>
              <select
                value={selectedAgg}
                onChange={(e) => setSelectedAgg(e.target.value as any)}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="sum">SUM</option>
                <option value="avg">AVG</option>
                <option value="count">COUNT</option>
              </select>
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !selectedDatasetId || !selectedMetric || !selectedDimension}
              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{isAnalyzing ? "Analyzing..." : "Investigate"}</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Analysis Output Section */}
      {analysisResult && (
        <div className="space-y-5">
          {/* KPI Variance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">{analysisResult.baseline_label} Total</span>
              <p className="text-xl font-bold text-foreground mt-1">
                {analysisResult.baseline_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-muted-foreground">Starting cohort baseline</span>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">{analysisResult.current_label} Total</span>
              <p className="text-xl font-bold text-foreground mt-1">
                {analysisResult.current_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-muted-foreground">Recent period aggregate</span>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Net Variance</span>
              <div className="flex items-center gap-2 mt-1">
                <p className={`text-xl font-bold ${analysisResult.variance_abs >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {analysisResult.variance_abs >= 0 ? "+" : ""}
                  {analysisResult.variance_abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${analysisResult.variance_pct >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                  {analysisResult.variance_pct >= 0 ? "+" : ""}{analysisResult.variance_pct}%
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">Overall absolute & relative shift</span>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Primary Driver / Drag</span>
              <p className="text-sm font-semibold text-foreground truncate mt-1">
                {analysisResult.top_driver ? analysisResult.top_driver : "None"}
              </p>
              <p className="text-xs text-rose-500 truncate mt-0.5">
                {analysisResult.top_detractor ? analysisResult.top_detractor : "No negative drag detected"}
              </p>
            </div>
          </div>

          {/* Root-Cause Narrative Callout */}
          <div className="bg-muted/40 border border-border/80 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Automated Root-Cause Diagnostic Narrative</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {analysisResult.explanation}
            </p>
            <div className="text-[11px] text-muted-foreground font-mono pt-1">
              Executed in {analysisResult.execution_time_ms} ms via DuckDB aggregation engine.
            </div>
          </div>

          {/* Visual Waterfall Decomposition Chart */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-base">
                  Variance Waterfall Decomposition
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visual bridge showing step-by-step additions and subtractions leading from {analysisResult.baseline_label} to {analysisResult.current_label}.
                </p>
              </div>
            </div>

            {/* Custom Responsive Waterfall Visualization */}
            <div className="w-full pt-4 pb-2 overflow-x-auto">
              <div className="min-w-[640px] flex items-end justify-between gap-3 h-64 border-b border-border/70 pb-3 px-2">
                {analysisResult.waterfall.map((item, idx) => {
                  const maxVal = Math.max(...analysisResult.waterfall.map((w) => Math.abs(w.value)), 1);
                  const barHeightPct = Math.max(Math.min((Math.abs(item.value) / maxVal) * 100, 100), 8);
                  const isPositiveChange = item.change > 0;
                  const isNegativeChange = item.change < 0;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip Hover Bubble */}
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-[11px] px-2 py-1 rounded shadow border border-border pointer-events-none whitespace-nowrap z-20">
                        <strong>{item.label}</strong>: {item.value.toLocaleString()}
                        {item.change !== 0 && (
                          <span> ({item.change > 0 ? "+" : ""}{item.change.toLocaleString()})</span>
                        )}
                      </div>

                      {/* Delta Indicator Above Bar */}
                      <div className="text-[10px] font-mono mb-1 text-center truncate w-full">
                        {item.is_total ? (
                          <span className="font-bold text-foreground">
                            {item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span className={isPositiveChange ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                            {isPositiveChange ? "+" : ""}{item.change.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>

                      {/* The Bar */}
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-full max-w-[48px] rounded-t-md transition-all shadow-sm ${
                          item.is_total
                            ? "bg-slate-700 dark:bg-slate-300"
                            : isPositiveChange
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : "bg-rose-500 hover:bg-rose-600"
                        }`}
                      />

                      {/* X-Axis Label */}
                      <span className="text-[11px] font-medium text-muted-foreground mt-2 truncate w-full text-center">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dimension Contributor Ranker Table */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Segment Contribution Breakdown
                </h3>
                <p className="text-xs text-muted-foreground">
                  Individual performance across each distinct value in &apos;{analysisResult.dimension}&apos;.
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {analysisResult.contributors.length} segments analyzed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Segment ({analysisResult.dimension})</th>
                    <th className="px-4 py-3 font-semibold">{analysisResult.baseline_label}</th>
                    <th className="px-4 py-3 font-semibold">{analysisResult.current_label}</th>
                    <th className="px-4 py-3 font-semibold">Net Variance</th>
                    <th className="px-4 py-3 font-semibold">Impact on Shift</th>
                    <th className="px-4 py-3 font-semibold">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {analysisResult.contributors.map((c, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {c.dimension_value}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {c.baseline_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {c.current_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">
                        <span className={c.variance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {c.variance >= 0 ? "+" : ""}{c.variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(Math.abs(c.contribution_pct), 100)}%` }}
                              className={`h-full ${c.variance >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {c.contribution_pct > 0 ? "+" : ""}{c.contribution_pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.impact === "positive"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : c.impact === "negative"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {c.impact === "positive" ? "Growth Driver" : c.impact === "negative" ? "Performance Drag" : "Neutral"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
