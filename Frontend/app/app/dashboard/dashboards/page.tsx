"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  Search,
  Layers,
  Trash2,
  Sparkles,
  BarChart3,
  Calendar,
  AlertCircle,
  X,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { api, Dashboard, Dataset } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export default function DashboardsHubPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [error, setError] = useState<string | null>(null);

  // New Dashboard Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // AI Generator Modal State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiDatasets, setAiDatasets] = useState<Dataset[]>([]);
  const [selectedAiDatasetId, setSelectedAiDatasetId] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const canEdit = user?.role === "Admin" || user?.role === "Analyst" || user?.role === "Publisher";

  const openAiGenerator = async () => {
    setIsAiOpen(true);
    if (aiDatasets.length === 0) {
      try {
        const dsList = await api.listDatasets();
        setAiDatasets(dsList);
        if (dsList.length > 0) {
          setSelectedAiDatasetId(dsList[0].id);
        }
      } catch (err) {
        console.error("Failed to load datasets for AI generator:", err);
      }
    }
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAiDatasetId || isAiGenerating) return;
    setIsAiGenerating(true);
    try {
      const resp = await api.generateAIDashboard({
        dataset_id: selectedAiDatasetId,
      });
      setIsAiOpen(false);
      router.push(`/dashboard/dashboards/${resp.dashboard_id}`);
    } catch (err: any) {
      alert(err.message || "Failed to generate AI dashboard.");
      setIsAiGenerating(false);
    }
  };

  const fetchDashboards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listDashboards();
      setDashboards(data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboards.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const created = await api.createDashboard({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
      });
      setDashboards([created, ...dashboards]);
      setIsCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
    } catch (err: any) {
      alert(err.message || "Failed to create dashboard.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteDashboard(id);
      setDashboards(dashboards.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete dashboard.");
    }
  };

  const filteredDashboards = dashboards.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      d.title.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    if (statusFilter === "published") return d.is_published;
    if (statusFilter === "draft") return !d.is_published;
    return true;
  });


  return (
    <div className="space-y-8 select-none">
      {/* Top Banner with Signifier Serif Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#ececec]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#17191c] tracking-[-0.66px]">
              Dashboards Hub
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5d2a1a]" />
              <span>PostgreSQL Persisted</span>
            </span>
          </div>
          <p className="text-sm text-[#777b86] max-w-2xl leading-relaxed">
            Centralized intelligence workspaces. Build, configure, and monitor live multi-widget DuckDB dashboards with sub-second queries.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={openAiGenerator}
              id="ai-generate-dashboard-btn"
              className="self-start md:self-auto px-5 py-2.5 rounded-full bg-[#fbe1d1] text-[#5d2a1a] hover:bg-[#f7d5c0] font-normal text-xs sm:text-sm flex items-center gap-2 border border-[#5d2a1a]/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#5d2a1a]" />
              <span>AI Dashboard Generator</span>
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              id="create-dashboard-btn"
              className="self-start md:self-auto px-6 py-2.5 rounded-full bg-[#17191c] text-[#ffffff] hover:bg-black font-normal text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Dashboard</span>
            </button>
          </div>
        )}
      </div>

      {/* Metrics Row (Elevated White Floating Artifacts) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f2f2f3] flex items-center justify-center text-[#17191c] shrink-0">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-normal text-[#979799] uppercase tracking-wider">
              Total Dashboards
            </p>
            <p className="text-2xl font-serif font-normal text-[#17191c] tracking-tight mt-0.5">
              {dashboards.length}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#fbe1d1] text-[#5d2a1a] flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-normal text-[#979799] uppercase tracking-wider">
              Active Widgets
            </p>
            <p className="text-2xl font-serif font-normal text-[#17191c] tracking-tight mt-0.5">
              {dashboards.reduce((acc, d) => acc + (d.widget_count || 0), 0)}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f2f2f3] flex items-center justify-center text-[#17191c] shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-normal text-[#979799] uppercase tracking-wider">
              Engine Status
            </p>
            <p className="text-xs font-semibold text-[#5d2a1a] flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#5d2a1a] animate-pulse" />
              DuckDB Live Aggregation
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#a3a6af] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dashboards by title or description..."
            id="search-dashboards-input"
            className="w-full pl-11 pr-4 py-3 bg-[#ffffff] border border-[#ececec] hover:border-[#dcdcdc] focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {(["all", "published", "draft"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              id={`filter-${tab}-btn`}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all capitalize cursor-pointer ${
                statusFilter === tab
                  ? "bg-[#17191c] text-white shadow-sm"
                  : "bg-[#ffffff] text-[#777b86] border border-[#ececec] hover:bg-[#f2f2f3]"
              }`}
            >
              {tab === "all" ? "All Boards" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-[16px] bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
          <button
            onClick={fetchDashboards}
            className="ml-auto underline hover:text-black text-xs font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dashboards Grid (24px Elevated White Cards with Hairline Borders) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-52 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact animate-pulse"
            />
          ))}
        </div>
      ) : filteredDashboards.length === 0 ? (
        <div className="p-16 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f2f2f3] flex items-center justify-center text-[#777b86] mb-4">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-serif font-normal text-[#17191c] mb-1">
            {searchQuery ? "No matching dashboards" : "No dashboards found"}
          </h3>
          <p className="text-xs sm:text-sm text-[#777b86] max-w-md mb-6 leading-relaxed">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search query or reset filter to all."
              : "Create your first dashboard or head over to the Visualization Studio to compose and save analytical widgets."}
          </p>
          {canEdit && !searchQuery && statusFilter === "all" && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-6 py-2.5 rounded-full bg-[#17191c] text-white hover:bg-black font-normal text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Dashboard</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="dashboards-grid">
          {filteredDashboards.map((dash) => (
            <Link
              key={dash.id}
              href={`/dashboard/dashboards/${dash.id}`}
              id={`dashboard-card-${dash.id}`}
              className="group relative p-6 sm:p-7 rounded-[24px] bg-[#ffffff] border border-[#ececec] hover:border-[#17191c]/30 transition-all flex flex-col justify-between shadow-artifact hover:shadow-md cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-[#f2f2f3] flex items-center justify-center text-[#17191c] group-hover:scale-105 transition-transform">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    {dash.is_published ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20">
                        Published
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#f2f2f3] text-[#777b86] border border-[#ececec]">
                        Draft
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(dash.id, dash.title, e)}
                      id={`delete-dashboard-btn-${dash.id}`}
                      className="p-1.5 rounded-full text-[#979799] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete dashboard"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-serif font-normal text-[#17191c] group-hover:text-[#5d2a1a] transition-colors line-clamp-1">
                  {dash.title}
                </h3>
                <p className="text-xs text-[#777b86] line-clamp-2 min-h-[32px] leading-relaxed">
                  {dash.description || "Interactive multi-widget analytical dashboard canvas."}
                </p>
              </div>

              <div className="pt-4 mt-5 border-t border-[#f2f2f3] flex items-center justify-between text-xs text-[#777b86]">
                <span className="flex items-center gap-1.5 font-medium text-[#17191c]">
                  <Layers className="w-3.5 h-3.5 text-[#5d2a1a]" />
                  <span>
                    {dash.widget_count ?? 0} {dash.widget_count === 1 ? "widget" : "widgets"}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-[#979799]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(dash.created_at).toLocaleDateString()}</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dashboard Modal (Elevated White Dialog with Pill Controls) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-8 sm:p-10 rounded-[24px] bg-[#ffffff] border border-[#ececec] text-[#17191c] shadow-2xl space-y-6 relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                New Workspace Board
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#17191c]">
                Create new dashboard
              </h3>
              <p className="text-xs text-[#777b86]">
                Initialize a high-performance PostgreSQL-backed dashboard container.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Dashboard Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Executive Sales Performance"
                  id="new-dashboard-title-input"
                  className="w-full px-4 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Summarize the analytical purpose of this dashboard..."
                  id="new-dashboard-desc-input"
                  className="w-full px-4 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] placeholder:text-[#a3a6af] outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f2f2f3]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-full text-xs font-normal text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  id="confirm-create-dashboard-btn"
                  className="px-6 py-2.5 rounded-full bg-[#17191c] text-white hover:bg-black font-normal text-xs sm:text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Dashboard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Dashboard Generator Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[#ececec] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2f2f3]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#fbe1d1] text-[#5d2a1a]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-serif font-normal text-[#17191c]">
                  AI Dashboard Generator
                </h3>
              </div>
              <button
                onClick={() => setIsAiOpen(false)}
                className="text-[#979799] hover:text-[#17191c] p-1 rounded-full hover:bg-[#f2f2f3] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#777b86] leading-relaxed">
              Select a dataset to automatically synthesize KPI statistics, category comparisons, timeline distributions, and granular table widgets persisted in PostgreSQL.
            </p>

            <form onSubmit={handleAiGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Target Dataset
                </label>
                <select
                  value={selectedAiDatasetId}
                  onChange={(e) => setSelectedAiDatasetId(e.target.value)}
                  disabled={isAiGenerating}
                  className="w-full px-4 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs sm:text-sm text-[#17191c] outline-none transition-all cursor-pointer"
                >
                  {aiDatasets.length === 0 ? (
                    <option value="">No datasets available</option>
                  ) : (
                    aiDatasets.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.row_count} rows)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f2f2f3]">
                <button
                  type="button"
                  onClick={() => setIsAiOpen(false)}
                  disabled={isAiGenerating}
                  className="px-5 py-2.5 rounded-full text-xs font-normal text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAiGenerating || !selectedAiDatasetId}
                  id="confirm-ai-generate-btn"
                  className="px-6 py-2.5 rounded-full bg-[#5d2a1a] text-white hover:bg-[#4a2215] font-normal text-xs sm:text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isAiGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Dashboard</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
