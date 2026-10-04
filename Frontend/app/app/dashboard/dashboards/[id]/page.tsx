"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ArrowLeft,
  Plus,
  RefreshCw,
  Filter,
  Sliders,
  Settings2,
  Trash2,
  Edit2,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  BarChart3,
  LineChart,
  PieChart as PieChartIcon,
  ScatterChart as ScatterChartIcon,
  Table as TableIcon,
  Layers,
  AlertCircle,
  CheckCircle2,
  Database,
  Lock,
  ChevronDown,
  X,
  Share2,
  Globe,
  Download,
  FileSpreadsheet,
  FileText,
  Link2,
  Copy,
  Check,
  Users
} from "lucide-react";
import {
  api,
  downloadBlob,
  Dashboard,
  DashboardWidget,
  DashboardFilter,
  DashboardShare,
  Dataset,
  ChartType,
  MeasureSpec,
  FilterSpec,
  AggregateQueryRequest,
  AggregateQueryResponse
} from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import ChartRenderer from "@/components/visualisations/ChartRenderer";

const CHART_TYPES: { type: ChartType; label: string; icon: any }[] = [
  { type: "bar", label: "Bar", icon: BarChart3 },
  { type: "line", label: "Line", icon: LineChart },
  { type: "area", label: "Area", icon: Layers },
  { type: "donut", label: "Donut", icon: PieChartIcon },
  { type: "scatter", label: "Scatter", icon: ScatterChartIcon },
  { type: "kpi", label: "KPI", icon: Sparkles },
  { type: "table", label: "Table", icon: TableIcon },
];

export default function DashboardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dashboardId = params?.id as string;
  const { user } = useAuthStore();

  const canEdit = user?.role === "Admin" || user?.role === "Analyst" || user?.role === "Publisher";
  const canPublish = user?.role === "Admin" || user?.role === "Publisher";
  const canShare = user?.role === "Admin" || user?.role === "Publisher";

  // Dashboard & Datasets State
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Day 5 Publishing & Sharing State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [shareTargetType, setShareTargetType] = useState<"user" | "role">("role");
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("Viewer");
  const [sharePerm, setSharePerm] = useState("view");
  const [isSharing, setIsSharing] = useState(false);
  const [sharesList, setSharesList] = useState<DashboardShare[]>([]);

  // Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);


  // Active Global Filter Values (column_name -> selected_value)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Add / Edit Filter Modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterColumn, setFilterColumn] = useState("");
  const [filterOptionsStr, setFilterOptionsStr] = useState("");

  // Add / Edit Widget Modal State
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [wDatasetId, setWDatasetId] = useState("");
  const [wTitle, setWTitle] = useState("");
  const [wChartType, setWChartType] = useState<ChartType>("bar");
  const [wDimensions, setWDimensions] = useState<string[]>([]);
  const [wMeasures, setWMeasures] = useState<MeasureSpec[]>([]);
  const [wLimit, setWLimit] = useState<number>(50);
  const [isSavingWidget, setIsSavingWidget] = useState(false);

  // Edit Dashboard Metadata Modal
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");

  // Load Dashboard & Datasets
  const fetchDashboardData = useCallback(async () => {
    if (!dashboardId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [dash, dsList] = await Promise.all([
        api.getDashboard(dashboardId),
        api.listDatasets().catch(() => [] as Dataset[]),
      ]);
      setDashboard(dash);
      setDatasets(dsList);
      setMetaTitle(dash.title);
      setMetaDesc(dash.description || "");
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Global Filter Changes
  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => {
      const updated = { ...prev };
      if (!value || value === "ALL") {
        delete updated[key];
      } else {
        updated[key] = value;
      }
      return updated;
    });
  };

  const handleClearFilters = () => {
    setActiveFilters({});
  };

  // Add Global Filter
  const handleSaveFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterColumn.trim() || !dashboard) return;
    try {
      const options = filterOptionsStr
        ? filterOptionsStr.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const newFilter = await api.addDashboardFilter(dashboard.id, {
        column_name: filterColumn.trim().toLowerCase(),
        filter_type: "select",
        default_value: { options: options },
      });
      setDashboard({
        ...dashboard,
        filters: [...(dashboard.filters || []), newFilter],
      });
      setIsFilterModalOpen(false);
      setFilterColumn("");
      setFilterOptionsStr("");
    } catch (err: any) {
      alert(err.message || "Failed to add dashboard filter.");
    }
  };

  const handleDeleteFilter = async (filterId: string) => {
    if (!dashboard) return;
    try {
      await api.deleteDashboardFilter(dashboard.id, filterId);
      const removed = dashboard.filters?.find((f) => f.id === filterId);
      setDashboard({
        ...dashboard,
        filters: dashboard.filters?.filter((f) => f.id !== filterId) || [],
      });
      if (removed && activeFilters[removed.column_name]) {
        const copy = { ...activeFilters };
        delete copy[removed.column_name];
        setActiveFilters(copy);
      }
    } catch (err: any) {
      alert(err.message || "Failed to remove filter.");
    }
  };

  // Open Add Widget Modal
  const openAddWidgetModal = () => {
    setEditingWidgetId(null);
    setWTitle("New Analytical Chart");
    setWChartType("bar");
    if (datasets.length > 0) {
      const first = datasets[0];
      setWDatasetId(first.id);
      configureWidgetDefaults(first);
    }
    setIsWidgetModalOpen(true);
  };

  // Open Edit Widget Modal
  const openEditWidgetModal = (w: DashboardWidget) => {
    setEditingWidgetId(w.id);
    setWDatasetId(w.dataset_id || (datasets.length > 0 ? datasets[0].id : ""));
    setWTitle(w.title);
    setWChartType(w.chart_type);
    setWDimensions(w.dimensions || []);
    setWMeasures(w.measures || []);
    setWLimit(w.limit || w.config?.limit || 50);
    setIsWidgetModalOpen(true);
  };

  const configureWidgetDefaults = (ds: Dataset) => {
    if (!ds.columns || ds.columns.length === 0) return;
    const strCols = ds.columns.filter((c) =>
      ["string", "date", "datetime"].includes(c.data_type.toLowerCase())
    );
    const numCols = ds.columns.filter((c) =>
      ["integer", "float", "number", "numeric", "double"].includes(c.data_type.toLowerCase())
    );

    if (strCols.length > 0) {
      setWDimensions([strCols[0].name]);
    } else {
      setWDimensions([ds.columns[0].name]);
    }

    if (numCols.length > 0) {
      setWMeasures([{ column: numCols[0].name, agg: "sum", alias: `sum_${numCols[0].name}` }]);
    } else {
      setWMeasures([{ column: ds.columns[0].name, agg: "count", alias: `count_${ds.columns[0].name}` }]);
    }
  };

  // Save Widget (Add or Update)
  const handleSaveWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboard) return;
    setIsSavingWidget(true);

    try {
      if (editingWidgetId) {
        // Update existing widget
        const updated = await api.updateWidget(dashboard.id, editingWidgetId, {
          title: wTitle,
          chart_type: wChartType,
          dimensions: wDimensions,
          measures: wMeasures,
          config: { limit: wLimit },
        });
        setDashboard({
          ...dashboard,
          widgets: dashboard.widgets.map((w) => (w.id === editingWidgetId ? { ...updated, limit: wLimit } : w)),
        });
      } else {
        // Add new widget
        const added = await api.addWidget(dashboard.id, {
          dataset_id: wDatasetId,
          title: wTitle,
          chart_type: wChartType,
          dimensions: wDimensions,
          measures: wMeasures,
          limit: wLimit,
          position: { w: wChartType === "kpi" ? 4 : 6, h: 2, x: 0, y: dashboard.widgets.length * 2 },
        });
        setDashboard({
          ...dashboard,
          widgets: [...dashboard.widgets, { ...added, limit: wLimit }],
          widget_count: dashboard.widgets.length + 1,
        });
      }
      setIsWidgetModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to save widget.");
    } finally {
      setIsSavingWidget(false);
    }
  };

  // Delete Widget
  const handleDeleteWidget = async (widgetId: string) => {
    if (!dashboard) return;
    if (!confirm("Are you sure you want to remove this widget from the dashboard?")) return;
    try {
      await api.deleteWidget(dashboard.id, widgetId);
      setDashboard({
        ...dashboard,
        widgets: dashboard.widgets.filter((w) => w.id !== widgetId),
        widget_count: Math.max(0, dashboard.widgets.length - 1),
      });
    } catch (err: any) {
      alert(err.message || "Failed to delete widget.");
    }
  };

  // Toggle Widget Size (6 cols vs 12 cols)
  const handleToggleWidgetSize = async (widget: DashboardWidget) => {
    if (!dashboard || !canEdit) return;
    const currentW = widget.position?.w || 6;
    const newW = currentW === 12 ? 6 : 12;
    const updatedPos = { ...(widget.position || {}), w: newW };

    setDashboard({
      ...dashboard,
      widgets: dashboard.widgets.map((w) => (w.id === widget.id ? { ...w, position: updatedPos } : w)),
    });

    try {
      await api.updateWidget(dashboard.id, widget.id, { position: updatedPos });
    } catch (err) {
      console.error("Failed to persist widget resize:", err);
    }
  };

  // Move Widget Up / Down (Reordering)
  const handleMoveWidget = async (index: number, direction: "up" | "down") => {
    if (!dashboard || !canEdit) return;
    const newWidgets = [...dashboard.widgets];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newWidgets.length) return;

    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[targetIdx];
    newWidgets[targetIdx] = temp;

    newWidgets.forEach((w, i) => {
      w.position = { ...(w.position || {}), y: i * 2 };
    });

    setDashboard({ ...dashboard, widgets: newWidgets });

    try {
      await Promise.all([
        api.updateWidget(dashboard.id, newWidgets[index].id, { position: newWidgets[index].position }),
        api.updateWidget(dashboard.id, newWidgets[targetIdx].id, { position: newWidgets[targetIdx].position }),
      ]);
    } catch (err) {
      console.error("Failed to persist reordering:", err);
    }
  };

  // Save Metadata
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboard || !metaTitle.trim()) return;
    try {
      const updated = await api.updateDashboard(dashboard.id, {
        title: metaTitle.trim(),
        description: metaDesc.trim() || undefined,
      });
      setDashboard({ ...dashboard, title: updated.title, description: updated.description });
      setIsMetaModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to update dashboard metadata.");
    }
  };

  // Day 5 Handlers
  const handleTogglePublish = async () => {
    if (!dashboard) return;
    try {
      if (dashboard.is_published) {
        if (!confirm("Unpublish this dashboard? Viewers without explicit share access will no longer be able to see it.")) return;
        const updated = await api.unpublishDashboard(dashboard.id);
        setDashboard(updated);
      } else {
        const updated = await api.publishDashboard(dashboard.id);
        setDashboard(updated);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update publication status.");
    }
  };

  const openShareModal = async () => {
    if (!dashboard) return;
    setIsShareModalOpen(true);
    setIsCopied(false);
    try {
      const [linkRes, shares] = await Promise.all([
        api.getDashboardShareLink(dashboard.id).catch(() => null),
        api.listDashboardShares(dashboard.id).catch(() => [] as DashboardShare[]),
      ]);
      if (linkRes) {
        const fullUrl = `${window.location.origin}/dashboard/dashboards/${dashboard.id}?shared=true&token=${linkRes.share_token}`;
        setShareLink(fullUrl);
      }
      setSharesList(shares);
    } catch (err: any) {
      console.error("Failed to load share settings:", err);
    }
  };

  const handleCopyShareLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAddShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboard) return;
    setIsSharing(true);
    try {
      const payload: any = {
        permission: sharePerm,
      };
      if (shareTargetType === "user") {
        if (!shareEmail.trim()) return;
        payload.shared_with_email = shareEmail.trim();
      } else {
        payload.role = shareRole;
      }
      const newShare = await api.addDashboardShare(dashboard.id, payload);
      setSharesList([newShare, ...sharesList]);
      setShareEmail("");
    } catch (err: any) {
      alert(err.message || "Failed to grant dashboard access.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!dashboard) return;
    try {
      await api.deleteDashboardShare(dashboard.id, shareId);
      setSharesList(sharesList.filter((s) => s.id !== shareId));
    } catch (err: any) {
      alert(err.message || "Failed to remove share access.");
    }
  };

  const handleExportCSV = async () => {
    if (!dashboard) return;
    setIsExportingCSV(true);
    setIsExportMenuOpen(false);
    setExportSuccess(null);
    try {
      const blob = await api.exportCSV({
        dashboard_id: dashboard.id,
        filters: activeFilters,
        name: `${dashboard.title}_Filtered_Data`,
      });
      downloadBlob(blob, `${dashboard.title.replace(/\s+/g, "_")}_Data.csv`);
      setExportSuccess("CSV export downloaded successfully!");
      setTimeout(() => setExportSuccess(null), 3500);
    } catch (err: any) {
      alert(err.message || "CSV export failed.");
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    if (!dashboard) return;
    setIsExportingPDF(true);
    setIsExportMenuOpen(false);
    setExportSuccess(null);
    try {
      const blob = await api.exportPDF({
        dashboard_id: dashboard.id,
        filters: activeFilters,
        name: `${dashboard.title}_Executive_Report`,
      });
      downloadBlob(blob, `${dashboard.title.replace(/\s+/g, "_")}_Executive_Report.pdf`);
      setExportSuccess("Executive PDF report generated and downloaded!");
      setTimeout(() => setExportSuccess(null), 3500);
    } catch (err: any) {
      alert(err.message || "PDF report generation failed.");
    } finally {
      setIsExportingPDF(false);
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-10 bg-[#f2f2f3] rounded-2xl w-1/3" />
        <div className="h-16 bg-[#ffffff] border border-[#ececec] rounded-[20px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-[#ffffff] border border-[#ececec] rounded-[24px]" />
          <div className="h-80 bg-[#ffffff] border border-[#ececec] rounded-[24px]" />
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-12 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact text-center flex flex-col items-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-serif font-normal text-[#17191c] mb-2">Dashboard Error</h2>
        <p className="text-sm text-[#777b86] mb-6">{error || "Dashboard not found."}</p>
        <Link
          href="/dashboard/dashboards"
          className="px-6 py-2.5 rounded-full bg-[#17191c] hover:bg-black text-white text-xs font-normal transition-colors"
        >
          Return to Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 select-none">
      {/* Top Navigation & Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#ececec]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/dashboard/dashboards"
              className="text-xs font-normal text-[#777b86] hover:text-[#5d2a1a] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboards Hub
            </Link>
            <span className="text-[#a3a6af]">/</span>
            <span className="text-xs font-medium text-[#17191c]">{dashboard.title}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-serif font-normal text-[#17191c] tracking-tight flex items-center gap-3">
              {dashboard.title}
            </h1>
            {dashboard.is_published ? (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5" id="dashboard-status-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Published
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5" id="dashboard-status-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Draft
              </span>
            )}
            {canEdit ? (
              <button
                onClick={() => setIsMetaModalOpen(true)}
                id="edit-dashboard-meta-btn"
                className="p-1.5 rounded-full text-[#979799] hover:text-[#5d2a1a] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
                title="Edit Dashboard Details"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#f2f2f3] text-[#777b86] border border-[#ececec] flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#777b86]" />
                Read-only (Viewer)
              </span>
            )}
          </div>
          {dashboard.description && (
            <p className="text-xs md:text-sm text-[#777b86] mt-1">{dashboard.description}</p>
          )}
          {exportSuccess && (
            <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[12px] text-xs flex items-center gap-2 animate-in fade-in" id="export-success-toast">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{exportSuccess}</span>
            </div>
          )}
        </div>

        {/* Dashboard Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchDashboardData()}
            id="refresh-dashboard-btn"
            className="py-2 px-3.5 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] text-xs font-normal flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            title="Refresh All Widgets"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#5d2a1a]" />
            <span>Refresh</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              id="export-dashboard-btn"
              className="py-2 px-3.5 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] text-xs font-normal flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#5d2a1a]" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-[#777b86]" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-2xl py-2 z-50 animate-in fade-in duration-150">
                <button
                  onClick={handleExportCSV}
                  id="export-csv-btn"
                  disabled={isExportingCSV}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#17191c] hover:bg-[#f2f2f3] flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isExportingCSV ? "Exporting CSV..." : "Export as CSV"}</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  id="export-pdf-btn"
                  disabled={isExportingPDF}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#17191c] hover:bg-[#f2f2f3] flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{isExportingPDF ? "Generating PDF..." : "Export as PDF Report"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Share Button (Publisher/Admin) */}
          {canShare && (
            <button
              onClick={openShareModal}
              id="open-share-modal-btn"
              className="py-2 px-3.5 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] text-xs font-normal flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#5d2a1a]" />
              <span>Share</span>
            </button>
          )}

          {/* Publish / Unpublish Toggle (Publisher/Admin) */}
          {canPublish && (
            <button
              onClick={handleTogglePublish}
              id="toggle-publish-btn"
              className={`py-2 px-4 rounded-full border text-xs font-normal flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer ${
                dashboard.is_published
                  ? "bg-[#ffffff] border-amber-300 text-amber-800 hover:bg-amber-50"
                  : "bg-[#17191c] border-[#17191c] text-white hover:bg-black"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{dashboard.is_published ? "Unpublish" : "Publish"}</span>
            </button>
          )}

          {canEdit && (
            <>
              <button
                onClick={() => setIsFilterModalOpen(true)}
                id="add-dashboard-filter-btn"
                className="py-2 px-3.5 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] text-xs font-normal flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-[#5d2a1a]" />
                <span>Add Filter</span>
              </button>

              <button
                onClick={openAddWidgetModal}
                id="add-widget-btn"
                className="py-2 px-4 rounded-full bg-[#17191c] hover:bg-black text-[#ffffff] font-normal text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Visualization</span>
              </button>
            </>
          )}
        </div>
      </div>


      {/* Global Interactive Filter Bar */}
      <div className="p-4 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#5d2a1a] uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-[#5d2a1a]" />
            <span>Interactive Filters:</span>
          </div>

          {dashboard.filters && dashboard.filters.length > 0 ? (
            dashboard.filters.map((flt) => {
              const filterOptions: string[] =
                flt.default_value?.options || ["South", "West", "North", "East"];
              return (
                <div key={flt.id} className="flex items-center gap-1.5 bg-[#f2f2f3] border border-[#ececec] rounded-full px-3 py-1">
                  <span className="text-xs font-medium text-[#17191c] capitalize">{flt.column_name}:</span>
                  <select
                    value={activeFilters[flt.column_name] || "ALL"}
                    onChange={(e) => handleFilterChange(flt.column_name, e.target.value)}
                    id={`filter-select-${flt.column_name}`}
                    className="bg-transparent text-xs text-[#5d2a1a] font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-[#ffffff] text-[#17191c]">All</option>
                    {filterOptions.map((opt: string) => (
                      <option key={opt} value={opt} className="bg-[#ffffff] text-[#17191c]">
                        {opt}
                      </option>
                    ))}
                  </select>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteFilter(flt.id)}
                      className="text-[#979799] hover:text-rose-600 ml-1 cursor-pointer"
                      title="Remove filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <span className="text-xs text-[#777b86] italic">
              No global filters defined yet. {canEdit && "Click 'Add Filter' to create interactive slicers."}
            </span>
          )}
        </div>

        {Object.keys(activeFilters).length > 0 && (
          <button
            onClick={handleClearFilters}
            id="clear-all-filters-btn"
            className="text-xs text-rose-600 hover:text-rose-800 font-normal underline cursor-pointer"
          >
            Clear Active Filters
          </button>
        )}
      </div>

      {/* Widgets Canvas */}
      {dashboard.widgets.length === 0 ? (
        <div className="p-16 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#fbe1d1] text-[#5d2a1a] flex items-center justify-center mb-4">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-serif font-normal text-[#17191c] mb-1">Canvas is Empty</h3>
          <p className="text-xs text-[#777b86] max-w-md mb-6">
            Build this dashboard by adding real-time visualizations directly from your ingested datasets.
          </p>
          {canEdit && (
            <button
              onClick={openAddWidgetModal}
              id="empty-add-widget-btn"
              className="py-2.5 px-6 rounded-full bg-[#17191c] text-white hover:bg-black font-normal text-xs flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add First Visualization
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-widgets-grid">
          {dashboard.widgets.map((widget, index) => {
            const colSpan = widget.position?.w === 12 ? "lg:col-span-12" : "lg:col-span-6";
            return (
              <DashboardWidgetCard
                key={widget.id}
                widget={widget}
                colSpan={colSpan}
                canEdit={canEdit}
                datasets={datasets}
                activeFilters={activeFilters}
                onEdit={() => openEditWidgetModal(widget)}
                onDelete={() => handleDeleteWidget(widget.id)}
                onToggleSize={() => handleToggleWidgetSize(widget)}
                onMoveUp={() => handleMoveWidget(index, "up")}
                onMoveDown={() => handleMoveWidget(index, "down")}
                isFirst={index === 0}
                isLast={index === dashboard.widgets.length - 1}
              />
            );
          })}
        </div>
      )}

      {/* Modal: Add / Edit Widget */}
      {isWidgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg p-8 rounded-[24px] bg-[#ffffff] border border-[#ececec] text-[#17191c] shadow-2xl max-h-[90vh] overflow-y-auto space-y-5 relative">
            <button
              onClick={() => setIsWidgetModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                Visualization Configuration
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#17191c]">
                {editingWidgetId ? "Configure Widget" : "Add Visualization Widget"}
              </h3>
              <p className="text-xs text-[#777b86] mt-1">
                Configure dataset schema parameters to render DuckDB analytics directly.
              </p>
            </div>

            <form onSubmit={handleSaveWidget} className="space-y-4">
              {/* Dataset Selection */}
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Dataset
                </label>
                <select
                  value={wDatasetId}
                  disabled={!!editingWidgetId}
                  onChange={(e) => {
                    setWDatasetId(e.target.value);
                    const found = datasets.find((d) => d.id === e.target.value);
                    if (found) configureWidgetDefaults(found);
                  }}
                  id="widget-dataset-select"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none transition-all disabled:opacity-50"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.row_count.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Widget Title
                </label>
                <input
                  type="text"
                  required
                  value={wTitle}
                  onChange={(e) => setWTitle(e.target.value)}
                  id="widget-title-input"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
                />
              </div>

              {/* Chart Type */}
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Chart Type
                </label>
                <div className="grid grid-cols-4 gap-2" id="widget-chart-type-grid">
                  {CHART_TYPES.map((ct) => {
                    const Icon = ct.icon;
                    const isSelected = wChartType === ct.type;
                    return (
                      <button
                        key={ct.type}
                        type="button"
                        onClick={() => setWChartType(ct.type)}
                        id={`modal-chart-type-${ct.type}`}
                        className={`p-2.5 rounded-[16px] border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-[#fbe1d1] border-[#5d2a1a] text-[#5d2a1a] font-medium"
                            : "bg-[#f2f2f3] border-transparent text-[#777b86] hover:bg-[#ededee] hover:text-[#17191c]"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px]">{ct.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Dimensions (Group By)
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-[#f2f2f3] rounded-[16px] max-h-24 overflow-y-auto">
                  {datasets
                    .find((d) => d.id === wDatasetId)
                    ?.columns?.map((c) => {
                      const sel = wDimensions.includes(c.name);
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => {
                            if (sel) {
                              setWDimensions(wDimensions.filter((d) => d !== c.name));
                            } else {
                              setWDimensions([...wDimensions, c.name]);
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                            sel
                              ? "bg-[#17191c] text-white font-medium"
                              : "bg-[#ffffff] text-[#17191c] border border-[#ececec] hover:bg-[#ededee]"
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Measures */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-normal text-[#777b86]">
                    Measures (Metrics)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = datasets.find((d) => d.id === wDatasetId);
                      if (cur && cur.columns && cur.columns.length > 0) {
                        const col = cur.columns[0].name;
                        setWMeasures([...wMeasures, { column: col, agg: "sum", alias: `sum_${col}` }]);
                      }
                    }}
                    className="text-xs text-[#5d2a1a] hover:underline font-medium cursor-pointer"
                  >
                    + Add Metric
                  </button>
                </div>
                <div className="space-y-2">
                  {wMeasures.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#f2f2f3] p-2 rounded-[16px]">
                      <select
                        value={m.agg}
                        onChange={(e) => {
                          const updated = [...wMeasures];
                          updated[idx].agg = e.target.value as any;
                          updated[idx].alias = `${e.target.value}_${updated[idx].column}`;
                          setWMeasures(updated);
                        }}
                        className="bg-[#ffffff] border border-[#ececec] text-xs rounded-xl px-2.5 py-1.5 text-[#17191c]"
                      >
                        <option value="sum">SUM</option>
                        <option value="avg">AVG</option>
                        <option value="count">COUNT</option>
                        <option value="min">MIN</option>
                        <option value="max">MAX</option>
                      </select>
                      <select
                        value={m.column}
                        onChange={(e) => {
                          const updated = [...wMeasures];
                          updated[idx].column = e.target.value;
                          updated[idx].alias = `${updated[idx].agg}_${e.target.value}`;
                          setWMeasures(updated);
                        }}
                        className="flex-1 bg-[#ffffff] border border-[#ececec] text-xs rounded-xl px-2.5 py-1.5 text-[#17191c]"
                      >
                        {datasets
                          .find((d) => d.id === wDatasetId)
                          ?.columns?.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                      {wMeasures.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setWMeasures(wMeasures.filter((_, i) => i !== idx))}
                          className="p-1.5 text-[#979799] hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Limit */}
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Row Limit
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={wLimit}
                  onChange={(e) => setWLimit(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f2f2f3]">
                <button
                  type="button"
                  onClick={() => setIsWidgetModalOpen(false)}
                  disabled={isSavingWidget}
                  className="px-5 py-2.5 rounded-full text-xs font-normal text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingWidget}
                  id="confirm-save-widget-btn"
                  className="px-6 py-2.5 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
                >
                  {isSavingWidget ? "Saving..." : editingWidgetId ? "Update Widget" : "Add Widget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Filter */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-8 rounded-[24px] bg-[#ffffff] border border-[#ececec] text-[#17191c] shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsFilterModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                Global Slicer
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#17191c]">
                Create Interactive Filter
              </h3>
              <p className="text-xs text-[#777b86] mt-1">
                Add a reactive dashboard-wide filter that triggers DuckDB re-queries across all matching widgets.
              </p>
            </div>

            <form onSubmit={handleSaveFilter} className="space-y-4">
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Target Column Name
                </label>
                <input
                  type="text"
                  required
                  value={filterColumn}
                  onChange={(e) => setFilterColumn(e.target.value)}
                  placeholder="e.g. region, category, country"
                  id="filter-name-input"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Filter Options (Comma Separated)
                </label>
                <input
                  type="text"
                  value={filterOptionsStr}
                  onChange={(e) => setFilterOptionsStr(e.target.value)}
                  placeholder="e.g. South, West, North, East"
                  id="filter-options-input"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f2f2f3]">
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-normal text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-add-filter-btn"
                  className="px-6 py-2.5 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs sm:text-sm shadow-sm cursor-pointer"
                >
                  Add Filter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Dashboard Metadata */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-8 rounded-[24px] bg-[#ffffff] border border-[#ececec] text-[#17191c] shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsMetaModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                Workspace Details
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#17191c]">
                Edit Dashboard Details
              </h3>
              <p className="text-xs text-[#777b86] mt-1">Update title and analytical scope description.</p>
            </div>

            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Dashboard Title
                </label>
                <input
                  type="text"
                  required
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  id="meta-title-input"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  id="meta-desc-input"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f2f2f3]">
                <button
                  type="button"
                  onClick={() => setIsMetaModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-normal text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-update-meta-btn"
                  className="px-6 py-2.5 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs sm:text-sm shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Share Dashboard */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg p-8 rounded-[24px] bg-[#ffffff] border border-[#ececec] text-[#17191c] shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                Workspace Access & Permissions
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#17191c]">
                Share Dashboard
              </h3>
              <p className="text-xs text-[#777b86] mt-1">
                Manage who in your organization can view or edit this analytical dashboard.
              </p>
            </div>

            {/* Shareable Link Box */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#17191c]">
                Shareable Link
              </label>
              <div className="p-3 bg-[#f2f2f3] rounded-[16px] flex items-center justify-between gap-2 border border-[#ececec]">
                <div className="flex items-center gap-2 text-xs font-mono text-[#555555] truncate">
                  <Link2 className="w-3.5 h-3.5 text-[#777b86] shrink-0" />
                  <span className="truncate" id="shareable-link-display">{shareLink || "Generating link..."}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  id="copy-share-link-btn"
                  className="px-3.5 py-1.5 rounded-full bg-[#17191c] hover:bg-black text-white text-xs font-medium shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#979799]">
                {dashboard.is_published
                  ? "Dashboard is published. Anyone in workspace with this link can view."
                  : "Dashboard is a draft. Only users or roles granted below can access via this link."}
              </p>
            </div>

            {/* Add Access Form */}
            <form onSubmit={handleAddShare} className="p-4 rounded-[20px] bg-[#f9f9fa] border border-[#ececec] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#17191c]">Grant New Access</span>
                <div className="flex items-center gap-1 bg-[#ececec] rounded-full p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShareTargetType("role")}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                      shareTargetType === "role" ? "bg-white text-[#17191c] shadow-sm" : "text-[#777b86]"
                    }`}
                  >
                    By Role
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareTargetType("user")}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                      shareTargetType === "user" ? "bg-white text-[#17191c] shadow-sm" : "text-[#777b86]"
                    }`}
                  >
                    By Email
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-7">
                  {shareTargetType === "role" ? (
                    <select
                      value={shareRole}
                      onChange={(e) => setShareRole(e.target.value)}
                      id="share-role-select"
                      className="w-full px-3 py-2 bg-white border border-[#ececec] rounded-[12px] text-xs text-[#17191c] outline-none"
                    >
                      <option value="Viewer">Viewer (Entire Role)</option>
                      <option value="Explorer">Explorer (Entire Role)</option>
                      <option value="Analyst">Analyst (Entire Role)</option>
                      <option value="Publisher">Publisher (Entire Role)</option>
                    </select>
                  ) : (
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="user@ricozviz.com"
                      id="share-email-input"
                      className="w-full px-3 py-2 bg-white border border-[#ececec] rounded-[12px] text-xs text-[#17191c] outline-none"
                    />
                  )}
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={sharePerm}
                    onChange={(e) => setSharePerm(e.target.value)}
                    id="share-permission-select"
                    className="w-full px-3 py-2 bg-white border border-[#ececec] rounded-[12px] text-xs text-[#17191c] outline-none"
                  >
                    <option value="view">Can view</option>
                    <option value="edit">Can edit</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSharing || (shareTargetType === "user" && !shareEmail.trim())}
                    id="confirm-add-share-btn"
                    className="w-full py-2 px-3 rounded-[12px] bg-[#17191c] hover:bg-black text-white text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isSharing ? "..." : "Grant"}
                  </button>
                </div>
              </div>
            </form>

            {/* Current Access List */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#17191c]">
                Current Access ({sharesList.length + 1})
              </label>

              <div className="divide-y divide-[#ececec] border border-[#ececec] rounded-[16px] overflow-hidden text-xs">
                {/* Creator (Owner) */}
                <div className="p-3 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#fbe1d1] text-[#5d2a1a] flex items-center justify-center font-bold text-xs">
                      {user?.full_name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-medium text-[#17191c]">Workspace Creator</p>
                      <p className="text-[11px] text-[#979799]">Original author</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#f2f2f3] text-[#17191c]">
                    Owner
                  </span>
                </div>

                {/* Shares */}
                {sharesList.map((s) => (
                  <div key={s.id} className="p-3 bg-white flex items-center justify-between" id={`share-row-${s.id}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#f2f2f3] text-[#17191c] flex items-center justify-center font-bold text-xs">
                        {s.role ? s.role.charAt(0) : (s.user_email?.charAt(0).toUpperCase() || "@")}
                      </div>
                      <div>
                        <p className="font-medium text-[#17191c]">
                          {s.role ? `All ${s.role}s` : (s.user_name || s.user_email || s.shared_with_email)}
                        </p>
                        <p className="text-[11px] text-[#979799]">
                          {s.role ? "Role permission" : "Individual access"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                        s.permission === "edit"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {s.permission === "edit" ? "Can edit" : "Can view"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveShare(s.id)}
                        id={`remove-share-btn-${s.id}`}
                        className="p-1 rounded-full text-[#979799] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#ececec]">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-6 py-2.5 rounded-full bg-[#17191c] text-white hover:bg-black font-normal text-xs sm:text-sm cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

// -------------------------------------------------------------
// Individual Dashboard Widget Card (Executes Live DuckDB Query)
// -------------------------------------------------------------
function DashboardWidgetCard({
  widget,
  colSpan,
  canEdit,
  datasets,
  activeFilters,
  onEdit,
  onDelete,
  onToggleSize,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  widget: DashboardWidget;
  colSpan: string;
  canEdit: boolean;
  datasets: Dataset[];
  activeFilters: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSize: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [execTime, setExecTime] = useState<number | null>(null);

  // Execute Real DuckDB Query for this widget
  const executeWidgetQuery = useCallback(async () => {
    if (!widget.dataset_id) return;
    setIsLoading(true);
    setError(null);

    // Merge widget filters with active global filters ONLY IF applicable to this widget's dataset
    const combinedFilters: FilterSpec[] = [...(widget.filters || [])];

    const widgetDataset = datasets.find((d) => d.id === widget.dataset_id);
    const datasetColMap = new Map<string, string>();
    widgetDataset?.columns?.forEach((c) => {
      datasetColMap.set(c.name.toLowerCase(), c.name);
    });

    Object.entries(activeFilters).forEach(([colKey, val]) => {
      const lowerKey = colKey.toLowerCase();
      if (datasetColMap.has(lowerKey)) {
        const actualColName = datasetColMap.get(lowerKey)!;
        if (!combinedFilters.some((f) => f.column.toLowerCase() === lowerKey)) {
          combinedFilters.push({
            column: actualColName,
            operator: "eq",
            value: val,
          });
        }
      }
    });

    const payload: AggregateQueryRequest = {
      dataset_id: widget.dataset_id,
      dimensions: widget.dimensions || [],
      measures: widget.measures || [],
      filters: combinedFilters.length > 0 ? combinedFilters : undefined,
      sort: widget.sort,
      limit: widget.limit || widget.config?.limit || 50,
    };

    try {
      const res = await api.executeAggregateQuery(payload);
      setData(res.data);
      setExecTime(res.execution_time_ms);
    } catch (err: any) {
      setError(err.message || "Failed to query analytical data.");
    } finally {
      setIsLoading(false);
    }
  }, [widget, activeFilters, datasets]);

  useEffect(() => {
    executeWidgetQuery();
  }, [executeWidgetQuery]);

  const isFullWidth = widget.position?.w === 12;

  return (
    <div
      id={`widget-card-${widget.id}`}
      className={`${colSpan} p-6 sm:p-7 rounded-[24px] bg-[#ffffff] border border-[#ececec] flex flex-col justify-between shadow-artifact hover:border-[#17191c]/20 transition-all`}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#ececec]">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-serif font-normal text-[#17191c] tracking-tight truncate max-w-[240px]">
            {widget.title}
          </h3>
          <span className="text-[10px] font-medium text-[#5d2a1a] bg-[#fbe1d1] border border-[#5d2a1a]/20 px-2 py-0.5 rounded-full uppercase">
            {widget.chart_type}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {execTime !== null && !isLoading && (
            <span className="text-[10px] font-mono text-[#979799] mr-2">
              {execTime.toFixed(1)}ms
            </span>
          )}

          <button
            onClick={executeWidgetQuery}
            id={`refresh-widget-${widget.id}`}
            className="p-1.5 rounded-full text-[#979799] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
            title="Re-query Widget"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#5d2a1a]" : ""}`} />
          </button>

          {canEdit && (
            <>
              <button
                onClick={onToggleSize}
                id={`toggle-size-widget-${widget.id}`}
                className="p-1.5 rounded-full text-[#979799] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
                title={isFullWidth ? "Collapse to 6 columns" : "Expand to 12 columns"}
              >
                {isFullWidth ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {!isFirst && (
                <button
                  onClick={onMoveUp}
                  id={`move-up-widget-${widget.id}`}
                  className="p-1.5 rounded-full text-[#979799] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              )}

              {!isLast && (
                <button
                  onClick={onMoveDown}
                  id={`move-down-widget-${widget.id}`}
                  className="p-1.5 rounded-full text-[#979799] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={onEdit}
                id={`edit-widget-${widget.id}`}
                className="p-1.5 rounded-full text-[#979799] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
                title="Edit Widget"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onDelete}
                id={`delete-widget-${widget.id}`}
                className="p-1.5 rounded-full text-[#979799] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Remove Widget"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Widget Canvas Body */}
      <div className="flex-1 min-h-[300px] flex items-center justify-center">
        <ChartRenderer
          chartType={widget.chart_type}
          data={data}
          dimensions={widget.dimensions}
          measures={widget.measures}
          config={{ prefix: "$", metricLabel: widget.title }}
          isLoading={isLoading}
          error={error}
          height={300}
        />
      </div>
    </div>
  );
}
