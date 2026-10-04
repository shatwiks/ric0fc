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
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* Editorial Header with Warm Wood/Musky Accents */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#ececec]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#17191c] tracking-[-0.66px]">
              Data Detective
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 flex items-center gap-1.5 shadow-2xs">
              <Search className="w-3.5 h-3.5 text-[#5d2a1a]" />
              <span>Root-Cause Variance Engine</span>
            </span>
          </div>
          <p className="text-sm text-[#777b86] max-w-2xl leading-relaxed">
            Deconstruct metric variance across dimensions to pinpoint positive growth drivers and negative detractors.
          </p>
        </div>
      </div>

      {/* Investigation Config Controls Bar */}
      <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Dataset Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-normal uppercase tracking-wider text-[#979799] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#5d2a1a]" />
              <span>Target Dataset</span>
            </label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full bg-[#fafafb] border border-[#ececec] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#17191c] font-medium focus:outline-none focus:border-[#5d2a1a] focus:bg-[#ffffff] transition-colors cursor-pointer"
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.row_count.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-normal uppercase tracking-wider text-[#979799] flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#5d2a1a]" />
              <span>Target Metric</span>
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full bg-[#fafafb] border border-[#ececec] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#17191c] font-medium focus:outline-none focus:border-[#5d2a1a] focus:bg-[#ffffff] transition-colors cursor-pointer"
            >
              {measureColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.data_type})
                </option>
              ))}
            </select>
          </div>

          {/* Dimension Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-normal uppercase tracking-wider text-[#979799] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#5d2a1a]" />
              <span>Breakdown Dimension</span>
            </label>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              className="w-full bg-[#fafafb] border border-[#ececec] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#17191c] font-medium focus:outline-none focus:border-[#5d2a1a] focus:bg-[#ffffff] transition-colors cursor-pointer"
            >
              {dimensionColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.data_type})
                </option>
              ))}
            </select>
          </div>

          {/* Aggregation & Action */}
          <div className="flex items-end gap-2.5">
            <div className="space-y-1.5 flex-1">
              <label className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">
                Aggregation
              </label>
              <select
                value={selectedAgg}
                onChange={(e) => setSelectedAgg(e.target.value as any)}
                className="w-full bg-[#fafafb] border border-[#ececec] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#17191c] font-medium focus:outline-none focus:border-[#5d2a1a] focus:bg-[#ffffff] transition-colors cursor-pointer"
              >
                <option value="sum">SUM</option>
                <option value="avg">AVG</option>
                <option value="count">COUNT</option>
              </select>
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !selectedDatasetId || !selectedMetric || !selectedDimension}
              className="py-2.5 px-6 rounded-full bg-[#17191c] hover:bg-black text-[#ffffff] font-normal text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#ffffff]" />
              ) : (
                <Search className="w-4 h-4 text-[#ffffff]" />
              )}
              <span>{isAnalyzing ? "Analyzing..." : "Investigate"}</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#fce8e6] border border-[#fad2cf] text-[#c5221f] text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Analysis Output Section */}
      {analysisResult && (
        <div className="space-y-6">
          {/* KPI Variance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact">
              <span className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">
                {analysisResult.baseline_label} Total
              </span>
              <p className="text-2xl font-serif font-normal text-[#17191c] tracking-tight mt-1.5">
                {analysisResult.baseline_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-[#777b86] mt-1 block">Starting cohort baseline</span>
            </div>

            <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact">
              <span className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">
                {analysisResult.current_label} Total
              </span>
              <p className="text-2xl font-serif font-normal text-[#17191c] tracking-tight mt-1.5">
                {analysisResult.current_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-[#777b86] mt-1 block">Recent period aggregate</span>
            </div>

            <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact">
              <span className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">
                Net Variance
              </span>
              <div className="flex items-center gap-2 mt-1.5">
                <p className={`text-2xl font-serif font-normal tracking-tight ${analysisResult.variance_abs >= 0 ? "text-[#137333]" : "text-[#c5221f]"}`}>
                  {analysisResult.variance_abs >= 0 ? "+" : ""}
                  {analysisResult.variance_abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${analysisResult.variance_pct >= 0 ? "bg-[#e6f4ea] text-[#137333] border border-[#ceead6]" : "bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]"}`}>
                  {analysisResult.variance_pct >= 0 ? "+" : ""}{analysisResult.variance_pct}%
                </span>
              </div>
              <span className="text-[11px] text-[#777b86] mt-1 block">Overall absolute & relative shift</span>
            </div>

            <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact">
              <span className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">
                Primary Driver / Drag
              </span>
              <p className="text-sm font-medium text-[#17191c] truncate mt-1.5">
                {analysisResult.top_driver ? analysisResult.top_driver : "None"}
              </p>
              <p className="text-xs text-[#c5221f] truncate mt-0.5 font-medium">
                {analysisResult.top_detractor ? analysisResult.top_detractor : "No negative drag detected"}
              </p>
            </div>
          </div>

          {/* Root-Cause Narrative Callout (Signature Warm Peach Accent Card) */}
          <div className="p-6 sm:p-8 rounded-[20px] bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-base font-serif font-normal text-[#5d2a1a]">
              <Lightbulb className="w-5 h-5 text-[#5d2a1a]" />
              <span>Automated Root-Cause Diagnostic Narrative</span>
            </div>
            <p className="text-xs sm:text-sm text-[#5d2a1a]/90 leading-relaxed font-sans">
              {analysisResult.explanation}
            </p>
            <div className="text-[11px] text-[#5d2a1a]/70 font-mono pt-1">
              Executed in {analysisResult.execution_time_ms} ms via DuckDB aggregation engine.
            </div>
          </div>

          {/* Visual Waterfall Decomposition Chart */}
          <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#ececec]">
              <div>
                <h3 className="text-xl font-serif font-normal text-[#17191c] tracking-tight">
                  Variance Waterfall Decomposition
                </h3>
                <p className="text-xs text-[#777b86] mt-0.5">
                  Visual bridge showing step-by-step additions and subtractions leading from {analysisResult.baseline_label} to {analysisResult.current_label}.
                </p>
              </div>
            </div>

            {/* Custom Responsive Waterfall Visualization */}
            <div className="w-full pt-6 pb-2 overflow-x-auto">
              <div className="min-w-[640px] flex items-end justify-between gap-3 h-64 border-b border-[#ececec] pb-3 px-2">
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
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-[#17191c] text-[#ffffff] text-[11px] px-2.5 py-1 rounded-md shadow-md pointer-events-none whitespace-nowrap z-20">
                        <strong>{item.label}</strong>: {item.value.toLocaleString()}
                        {item.change !== 0 && (
                          <span> ({item.change > 0 ? "+" : ""}{item.change.toLocaleString()})</span>
                        )}
                      </div>

                      {/* Delta Indicator Above Bar */}
                      <div className="text-[10px] font-mono mb-1 text-center truncate w-full">
                        {item.is_total ? (
                          <span className="font-semibold text-[#17191c]">
                            {item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span className={isPositiveChange ? "text-[#137333] font-semibold" : "text-[#c5221f] font-semibold"}>
                            {isPositiveChange ? "+" : ""}{item.change.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>

                      {/* The Bar */}
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-full max-w-[48px] rounded-t-lg transition-all shadow-2xs ${
                          item.is_total
                            ? "bg-[#17191c]"
                            : isPositiveChange
                            ? "bg-[#10b981] hover:bg-[#059669]"
                            : "bg-[#f43f5e] hover:bg-[#e11d48]"
                        }`}
                      />

                      {/* X-Axis Label */}
                      <span className="text-[11px] font-normal text-[#777b86] mt-2.5 truncate w-full text-center">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dimension Contributor Ranker Table */}
          <div className="rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact overflow-hidden">
            <div className="p-5 border-b border-[#ececec] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-normal text-[#17191c]">
                  Segment Contribution Breakdown
                </h3>
                <p className="text-xs text-[#777b86] mt-0.5">
                  Individual performance across each distinct value in &apos;{analysisResult.dimension}&apos;.
                </p>
              </div>
              <span className="text-xs text-[#979799] font-mono">
                {analysisResult.contributors.length} segments analyzed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#fafafb] text-[#777b86] uppercase text-[10px] tracking-wider border-b border-[#ececec]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Segment ({analysisResult.dimension})</th>
                    <th className="px-5 py-3 font-medium">{analysisResult.baseline_label}</th>
                    <th className="px-5 py-3 font-medium">{analysisResult.current_label}</th>
                    <th className="px-5 py-3 font-medium">Net Variance</th>
                    <th className="px-5 py-3 font-medium">Impact on Shift</th>
                    <th className="px-5 py-3 font-medium">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ececec]">
                  {analysisResult.contributors.map((c, i) => (
                    <tr key={i} className="hover:bg-[#fafafb] transition-colors">
                      <td className="px-5 py-3 font-medium text-[#17191c]">
                        {c.dimension_value}
                      </td>
                      <td className="px-5 py-3 font-mono text-[#777b86]">
                        {c.baseline_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 font-mono text-[#777b86]">
                        {c.current_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 font-mono font-medium">
                        <span className={c.variance >= 0 ? "text-[#137333]" : "text-[#c5221f]"}>
                          {c.variance >= 0 ? "+" : ""}{c.variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-[#f2f2f3] rounded-full h-1.5 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(Math.abs(c.contribution_pct), 100)}%` }}
                              className={`h-full ${c.variance >= 0 ? "bg-[#10b981]" : "bg-[#f43f5e]"}`}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-[#777b86]">
                            {c.contribution_pct > 0 ? "+" : ""}{c.contribution_pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                          c.impact === "positive"
                            ? "bg-[#e6f4ea] text-[#137333] border-[#ceead6]"
                            : c.impact === "negative"
                            ? "bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]"
                            : "bg-[#f2f2f3] text-[#777b86] border-[#ececec]"
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
