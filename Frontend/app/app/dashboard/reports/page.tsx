"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Calendar,
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Send,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  X,
} from "lucide-react";
import {
  api,
  downloadBlob,
  Report,
  ReportSchedule,
  Dashboard,
  Dataset,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"exports" | "schedules">("exports");

  // Data State
  const [reports, setReports] = useState<Report[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Export Form State
  const [exportTargetType, setExportTargetType] = useState<"dashboard" | "dataset">("dashboard");
  const [selectedDashboardId, setSelectedDashboardId] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");
  const [customReportName, setCustomReportName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // New Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [schedDashboardId, setSchedDashboardId] = useState("");
  const [schedName, setSchedName] = useState("Weekly Executive Summary");
  const [schedFrequency, setSchedFrequency] = useState("weekly");
  const [schedFormat, setSchedFormat] = useState("pdf");
  const [schedRecipients, setSchedRecipients] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  const canSchedule = user?.role === "Admin" || user?.role === "Publisher";

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [reps, scheds, dashList, dsList] = await Promise.all([
        api.listReports().catch(() => [] as Report[]),
        api.listReportSchedules().catch(() => [] as ReportSchedule[]),
        api.listDashboards().catch(() => [] as Dashboard[]),
        api.listDatasets().catch(() => [] as Dataset[]),
      ]);
      setReports(reps);
      setSchedules(scheds);
      setDashboards(dashList);
      setDatasets(dsList);

      if (dashList.length > 0 && !selectedDashboardId) {
        setSelectedDashboardId(dashList[0].id);
        setSchedDashboardId(dashList[0].id);
      }
      if (dsList.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(dsList[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load reports repository.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format bytes to readable size
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Quick Export Handler
  const handleQuickExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);
    setError(null);
    setExportSuccess(null);

    try {
      if (exportTargetType === "dashboard") {
        if (!selectedDashboardId) throw new Error("Please select a target dashboard.");
        const targetDash = dashboards.find((d) => d.id === selectedDashboardId);
        const name = customReportName.trim() || `${targetDash?.title || "Dashboard"}_Export`;

        if (exportFormat === "pdf") {
          const blob = await api.exportPDF({ dashboard_id: selectedDashboardId, name });
          downloadBlob(blob, `${name.replace(/\s+/g, "_")}.pdf`);
        } else {
          const blob = await api.exportCSV({ dashboard_id: selectedDashboardId, name });
          downloadBlob(blob, `${name.replace(/\s+/g, "_")}.csv`);
        }
      } else {
        if (!selectedDatasetId) throw new Error("Please select a target dataset.");
        const targetDs = datasets.find((d) => d.id === selectedDatasetId);
        const name = customReportName.trim() || `${targetDs?.name || "Dataset"}_Export`;

        const blob = await api.exportCSV({ dataset_id: selectedDatasetId, name });
        downloadBlob(blob, `${name.replace(/\s+/g, "_")}.csv`);
      }

      setExportSuccess(`Real ${exportFormat.toUpperCase()} export downloaded and registered in PostgreSQL!`);
      // Reload reports list to show newly generated report
      const updatedReports = await api.listReports();
      setReports(updatedReports);
      setCustomReportName("");
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  // Re-download existing report
  const handleDownloadExisting = async (report: Report) => {
    try {
      const blob = await api.downloadReport(report.id);
      const ext = report.format === "pdf" ? "pdf" : "csv";
      downloadBlob(blob, `${report.name.replace(/\s+/g, "_")}.${ext}`);
    } catch (err: any) {
      alert(err.message || "Failed to download file.");
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId: string, name: string) => {
    if (!confirm(`Delete export "${name}"? This removes the persisted file.`)) return;
    try {
      await api.deleteReport(reportId);
      setReports(reports.filter((r) => r.id !== reportId));
    } catch (err: any) {
      alert(err.message || "Failed to delete report.");
    }
  };

  // Schedule Report
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedDashboardId) return;
    setIsScheduling(true);
    try {
      const recList = schedRecipients
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await api.createReportSchedule({
        dashboard_id: schedDashboardId,
        name: schedName.trim() || "Automated Intelligence Report",
        frequency: schedFrequency,
        format: schedFormat,
        recipients: recList.length > 0 ? recList : ["executive-team@ricozviz.com"],
      });

      setSchedules([created, ...schedules]);
      setIsScheduleModalOpen(false);
      setSchedName("Weekly Executive Summary");
      setSchedRecipients("");
    } catch (err: any) {
      alert(err.message || "Failed to create schedule.");
    } finally {
      setIsScheduling(false);
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async (id: string, name: string) => {
    if (!confirm(`Cancel scheduled report "${name}"?`)) return;
    try {
      await api.deleteReportSchedule(id);
      setSchedules(schedules.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to remove schedule.");
    }
  };

  const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.format.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 select-none">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#ececec]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#17191c] tracking-[-0.66px]">
              Export Centre & Reports
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5d2a1a]" />
              <span>Real DuckDB Extracts</span>
            </span>
          </div>
          <p className="text-sm text-[#777b86] max-w-2xl leading-relaxed">
            Generate real filtered CSV extracts and high-fidelity vector PDF reports with cryptographic audit tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canSchedule && (
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              id="new-schedule-btn"
              className="px-5 py-2.5 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] font-normal text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#5d2a1a]" />
              <span>Schedule Report</span>
            </button>
          )}

          <button
            onClick={loadData}
            id="refresh-reports-btn"
            className="p-2.5 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] transition-colors shadow-sm cursor-pointer"
            title="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#5d2a1a]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f2f2f3] text-[#17191c] flex items-center justify-center shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-normal text-[#979799] uppercase tracking-wider">
              Generated Exports
            </p>
            <p className="text-2xl font-serif font-normal text-[#17191c] tracking-tight mt-0.5" id="total-exports-metric">
              {reports.length}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#fbe1d1] text-[#5d2a1a] flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-normal text-[#979799] uppercase tracking-wider">
              Active Schedules
            </p>
            <p className="text-2xl font-serif font-normal text-[#17191c] tracking-tight mt-0.5" id="total-schedules-metric">
              {schedules.length}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f2f2f3] text-[#17191c] flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-normal text-[#979799] uppercase tracking-wider">
              Export Formats
            </p>
            <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Live CSV & Vector PDF
            </p>
          </div>
        </div>
      </div>

      {/* Success / Error Banners */}
      {exportSuccess && (
        <div className="p-4 rounded-[16px] bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in" id="export-center-success-banner">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-[16px] bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Export Generator Panel */}
      <div className="p-7 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
              Instant Extraction Engine
            </span>
            <h2 className="text-xl font-serif font-normal text-[#17191c] mt-0.5">
              Generate Real Export Extract
            </h2>
          </div>

          {/* Target Type Selector */}
          <div className="flex items-center gap-1 bg-[#f2f2f3] rounded-full p-1 border border-[#ececec] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setExportTargetType("dashboard");
                setExportFormat("pdf");
              }}
              id="target-dashboard-tab"
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                exportTargetType === "dashboard" ? "bg-[#17191c] text-white shadow-sm" : "text-[#777b86]"
              }`}
            >
              Dashboard Target
            </button>
            <button
              type="button"
              onClick={() => {
                setExportTargetType("dataset");
                setExportFormat("csv");
              }}
              id="target-dataset-tab"
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                exportTargetType === "dataset" ? "bg-[#17191c] text-white shadow-sm" : "text-[#777b86]"
              }`}
            >
              Dataset Target
            </button>
          </div>
        </div>

        <form onSubmit={handleQuickExport} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Target Selector */}
          <div className="md:col-span-4">
            <label className="block text-xs font-normal text-[#777b86] mb-1.5">
              {exportTargetType === "dashboard" ? "Select Dashboard" : "Select Dataset"}
            </label>
            {exportTargetType === "dashboard" ? (
              <select
                value={selectedDashboardId}
                onChange={(e) => setSelectedDashboardId(e.target.value)}
                id="export-dashboard-select"
                className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] outline-none"
              >
                {dashboards.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} {d.is_published ? "(Published)" : "(Draft)"}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                id="export-dataset-select"
                className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] outline-none"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count} rows)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Format Selector */}
          <div className="md:col-span-3">
            <label className="block text-xs font-normal text-[#777b86] mb-1.5">
              Export Format
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExportFormat("csv")}
                id="format-csv-btn"
                className={`flex-1 py-2 px-3 rounded-[14px] text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  exportFormat === "csv"
                    ? "bg-[#17191c] text-white border-[#17191c]"
                    : "bg-[#f2f2f3] text-[#777b86] border-transparent hover:bg-[#ededee]"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>CSV</span>
              </button>

              {exportTargetType === "dashboard" && (
                <button
                  type="button"
                  onClick={() => setExportFormat("pdf")}
                  id="format-pdf-btn"
                  className={`flex-1 py-2 px-3 rounded-[14px] text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    exportFormat === "pdf"
                      ? "bg-[#17191c] text-white border-[#17191c]"
                      : "bg-[#f2f2f3] text-[#777b86] border-transparent hover:bg-[#ededee]"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span>PDF Report</span>
                </button>
              )}
            </div>
          </div>

          {/* Custom Name */}
          <div className="md:col-span-3">
            <label className="block text-xs font-normal text-[#777b86] mb-1.5">
              Custom Name (Optional)
            </label>
            <input
              type="text"
              value={customReportName}
              onChange={(e) => setCustomReportName(e.target.value)}
              placeholder="e.g. Q3 Executive Brief"
              id="export-custom-name-input"
              className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] outline-none"
            />
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isExporting}
              id="generate-export-submit-btn"
              className="w-full py-2.5 px-4 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "Generating..." : "Download"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tabs: Exports History vs Schedules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#ececec] pb-2">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("exports")}
              id="tab-exports-history"
              className={`text-sm font-medium pb-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "exports"
                  ? "border-[#17191c] text-[#17191c]"
                  : "border-transparent text-[#777b86] hover:text-[#17191c]"
              }`}
            >
              Export Repository ({reports.length})
            </button>
            <button
              onClick={() => setActiveTab("schedules")}
              id="tab-scheduled-distributions"
              className={`text-sm font-medium pb-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "schedules"
                  ? "border-[#17191c] text-[#17191c]"
                  : "border-transparent text-[#777b86] hover:text-[#17191c]"
              }`}
            >
              Scheduled Distributions ({schedules.length})
            </button>
          </div>

          {activeTab === "exports" && (
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#a3a6af] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exports..."
                id="search-exports-input"
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#ececec] rounded-full text-xs text-[#17191c] outline-none"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Exports History Table */}
        {activeTab === "exports" && (
          <div className="rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact overflow-hidden">
            {isLoading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 bg-[#f2f2f3] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#f2f2f3] text-[#777b86] flex items-center justify-center mb-3">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="text-base font-serif font-normal text-[#17191c] mb-1">
                  {searchQuery ? "No matching exports" : "No exports generated yet"}
                </h3>
                <p className="text-xs text-[#777b86] max-w-sm mb-4">
                  Use the Instant Extraction Engine above or export directly from any live dashboard to persist real extracts.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" id="reports-table">
                  <thead className="bg-[#f9f9fa] border-b border-[#ececec] text-[#777b86] uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-6">Report Title</th>
                      <th className="py-3 px-4">Format</th>
                      <th className="py-3 px-4">File Size</th>
                      <th className="py-3 px-4">Generated By</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececec]">
                    {filteredReports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-[#f9f9fa] transition-colors" id={`report-row-${rep.id}`}>
                        <td className="py-3.5 px-6 font-medium text-[#17191c]">
                          <div className="flex items-center gap-2">
                            {rep.format === "pdf" ? (
                              <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                            ) : (
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <span className="truncate max-w-xs">{rep.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                              rep.format === "pdf"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {rep.format}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#777b86]">
                          {formatSize(rep.file_size_bytes)}
                        </td>
                        <td className="py-3.5 px-4 text-[#777b86]">
                          {rep.creator_name || "Platform System"}
                        </td>
                        <td className="py-3.5 px-4 text-[#979799]">
                          {new Date(rep.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDownloadExisting(rep)}
                              id={`download-report-btn-${rep.id}`}
                              className="p-1.5 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
                              title="Download File"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteReport(rep.id, rep.name)}
                              id={`delete-report-btn-${rep.id}`}
                              className="p-1.5 rounded-full text-[#979799] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete File"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Scheduled Distributions Table */}
        {activeTab === "schedules" && (
          <div className="rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact overflow-hidden">
            {schedules.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#f2f2f3] text-[#777b86] flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-base font-serif font-normal text-[#17191c] mb-1">
                  No scheduled reports
                </h3>
                <p className="text-xs text-[#777b86] max-w-sm mb-4">
                  Automate recurring report generation and distribution lists for leadership.
                </p>
                {canSchedule && (
                  <button
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="px-5 py-2 rounded-full bg-[#17191c] text-white hover:bg-black text-xs font-normal cursor-pointer"
                  >
                    Schedule First Report
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" id="schedules-table">
                  <thead className="bg-[#f9f9fa] border-b border-[#ececec] text-[#777b86] uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-6">Schedule Name</th>
                      <th className="py-3 px-4">Frequency</th>
                      <th className="py-3 px-4">Format</th>
                      <th className="py-3 px-4">Recipients</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececec]">
                    {schedules.map((s) => (
                      <tr key={s.id} className="hover:bg-[#f9f9fa] transition-colors" id={`schedule-row-${s.id}`}>
                        <td className="py-3.5 px-6 font-medium text-[#17191c]">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#5d2a1a] shrink-0" />
                            <span>{s.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 capitalize text-[#17191c]">
                          {s.frequency}
                        </td>
                        <td className="py-3.5 px-4 uppercase text-[#777b86] font-mono">
                          {s.format}
                        </td>
                        <td className="py-3.5 px-4 text-[#777b86]">
                          <div className="flex flex-wrap gap-1">
                            {s.recipients.map((rec, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-[#f2f2f3] text-[10px] text-[#555555]">
                                {rec}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={() => handleDeleteSchedule(s.id, s.name)}
                            id={`delete-schedule-btn-${s.id}`}
                            className="p-1.5 rounded-full text-[#979799] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Cancel schedule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-8 rounded-[24px] bg-[#ffffff] border border-[#ececec] text-[#17191c] shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                Automation
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#17191c]">
                Schedule Report Distribution
              </h3>
              <p className="text-xs text-[#777b86] mt-1">
                Configure automated periodic report generation for stakeholders.
              </p>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Target Dashboard
                </label>
                <select
                  value={schedDashboardId}
                  onChange={(e) => setSchedDashboardId(e.target.value)}
                  id="schedule-dashboard-select"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] outline-none"
                >
                  {dashboards.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Schedule Title
                </label>
                <input
                  type="text"
                  required
                  value={schedName}
                  onChange={(e) => setSchedName(e.target.value)}
                  id="schedule-name-input"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                    Frequency
                  </label>
                  <select
                    value={schedFrequency}
                    onChange={(e) => setSchedFrequency(e.target.value)}
                    id="schedule-frequency-select"
                    className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                    Format
                  </label>
                  <select
                    value={schedFormat}
                    onChange={(e) => setSchedFormat(e.target.value)}
                    id="schedule-format-select"
                    className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none"
                  >
                    <option value="pdf">PDF Report</option>
                    <option value="csv">CSV Extract</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Recipients (Comma-Separated Emails)
                </label>
                <input
                  type="text"
                  value={schedRecipients}
                  onChange={(e) => setSchedRecipients(e.target.value)}
                  placeholder="exec@company.com, analyst@company.com"
                  id="schedule-recipients-input"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f2f2f3]">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-5 py-2 rounded-full text-xs font-normal text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScheduling}
                  id="confirm-create-schedule-btn"
                  className="px-6 py-2 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs sm:text-sm shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isScheduling ? "Saving..." : "Create Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
