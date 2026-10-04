"use client";

import { useState, useEffect } from "react";
import {
  Database,
  Upload,
  Search,
  Plus,
  FileSpreadsheet,
  Layers,
  Columns,
  Calendar,
  Trash2,
  Eye,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Lock,
  CheckCircle2,
  HardDrive
} from "lucide-react";
import { api, Dataset } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import UploadDatasetModal from "@/components/datasets/UploadDatasetModal";
import DatasetDetailModal from "@/components/datasets/DatasetDetailModal";

export default function DatasetsPage() {
  const { user, workspace, permissions } = useAuthStore();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // RBAC permissions check
  const canUpload =
    user?.role === "Admin" ||
    user?.role === "Analyst" ||
    permissions.includes("create:datasets") ||
    permissions.includes("*");

  const canDelete =
    user?.role === "Admin" ||
    permissions.includes("delete:datasets") ||
    permissions.includes("*");

  const loadDatasets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listDatasets();
      setDatasets(data);
    } catch (err: any) {
      setError(err.message || "Failed to load datasets for this workspace.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleUploadSuccess = (newDataset: Dataset) => {
    setDatasets((prev) => [newDataset, ...prev]);
    // Immediately open detail modal to preview the newly ingested data
    setSelectedDataset(newDataset);
    setIsDetailOpen(true);
  };

  const handleOpenDetail = (ds: Dataset) => {
    setSelectedDataset(ds);
    setIsDetailOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete dataset "${name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await api.deleteDataset(id);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
      if (selectedDataset?.id === id) {
        setIsDetailOpen(false);
        setSelectedDataset(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete dataset.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDatasets = datasets.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.file_name && d.file_name.toLowerCase().includes(q))
    );
  });

  const totalRows = datasets.reduce((acc, curr) => acc + (curr.row_count || 0), 0);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 select-none">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#ececec]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#17191c] tracking-tight">Datasets Hub</h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5d2a1a]" />
              DuckDB Analytics Engine
            </span>
          </div>
          <p className="text-sm text-[#777b86] mt-1 max-w-2xl leading-relaxed">
            Upload CSV files, inspect automatically detected schemas, explore data types, and run sub-second analytical queries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDatasets}
            disabled={isLoading}
            className="p-2.5 rounded-full border border-[#ececec] bg-[#ffffff] text-[#17191c] hover:bg-[#f2f2f3] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            title="Refresh datasets"
            id="refresh-datasets-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#5d2a1a]" : "text-[#5d2a1a]"}`} />
          </button>

          {canUpload ? (
            <button
              onClick={() => setIsUploadOpen(true)}
              id="upload-dataset-btn"
              className="py-2.5 px-6 rounded-full bg-[#17191c] hover:bg-black text-[#ffffff] font-normal text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Upload CSV Dataset
            </button>
          ) : (
            <div
              className="py-2.5 px-5 rounded-full bg-[#f2f2f3] border border-[#ececec] text-[#777b86] font-normal text-xs flex items-center gap-2 cursor-not-allowed"
              title="Viewer role has read-only access. Only Analysts and Admins can upload datasets."
              id="upload-dataset-btn-disabled"
            >
              <Lock className="w-3.5 h-3.5 text-[#5d2a1a]" />
              Upload Disabled (Viewer)
            </div>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">Total Datasets</span>
            <div className="w-9 h-9 rounded-xl bg-[#f2f2f3] flex items-center justify-center">
              <Database className="w-4 h-4 text-[#17191c]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-serif font-normal text-[#17191c] tracking-tight" id="metric-total-datasets">
              {datasets.length}
            </span>
            <p className="text-[11px] text-[#777b86] mt-0.5">Active in workspace</p>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">Ingested Rows</span>
            <div className="w-9 h-9 rounded-xl bg-[#fbe1d1] flex items-center justify-center">
              <Layers className="w-4 h-4 text-[#5d2a1a]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-serif font-normal text-[#17191c] tracking-tight" id="metric-total-rows">
              {totalRows.toLocaleString()}
            </span>
            <p className="text-[11px] text-[#777b86] mt-0.5">Verified across CSVs</p>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">Analytics Engine</span>
            <div className="w-9 h-9 rounded-xl bg-[#f2f2f3] flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-[#17191c]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-serif font-normal text-[#17191c] tracking-tight">DuckDB Embedded</span>
            <p className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Real-time In-Memory
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">Active Workspace</span>
            <div className="w-9 h-9 rounded-xl bg-[#fbe1d1] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#5d2a1a]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-serif font-normal text-[#17191c] tracking-tight truncate block">
              {workspace?.name || "Ricoz Analytics"}
            </span>
            <p className="text-[11px] text-[#777b86] mt-0.5">Role: {user?.role ? user.role.toUpperCase() : "ANALYST"}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3a6af]" />
          <input
            type="text"
            placeholder="Search datasets by name or source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#ffffff] border border-[#ececec] rounded-[16px] pl-10 pr-4 py-2.5 text-xs text-[#17191c] placeholder:text-[#a3a6af] outline-none shadow-sm focus:border-[#17191c] transition-colors"
            id="search-datasets-input"
          />
        </div>
        <div className="text-xs text-[#777b86]">
          Showing <strong>{filteredDatasets.length}</strong> of <strong>{datasets.length}</strong> datasets
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-[16px] bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="truncate max-w-2xl">{error}</span>
          </div>
          <button
            onClick={loadDatasets}
            className="px-3 py-1 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-normal transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-6 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f2f2f3]" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-[#f2f2f3] rounded w-3/4" />
                  <div className="h-3 bg-[#f2f2f3] rounded w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-[#f2f2f3] rounded-xl" />
              <div className="h-8 bg-[#f2f2f3] rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && datasets.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center p-8 bg-[#ffffff] border border-[#ececec] shadow-artifact rounded-[24px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#fbe1d1] text-[#5d2a1a] flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-[#5d2a1a]" />
          </div>
          <h3 className="text-xl font-serif font-normal text-[#17191c]">No Datasets Ingested Yet</h3>
          <p className="text-xs sm:text-sm text-[#777b86] max-w-md mt-2 leading-relaxed">
            Upload your CSV files to automatically infer schemas, persist column metadata, and run real-time DuckDB analytical queries.
          </p>
          {canUpload ? (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-6 py-2.5 px-6 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              id="empty-state-upload-btn"
            >
              <Upload className="w-4 h-4" />
              Upload Your First CSV
            </button>
          ) : (
            <p className="mt-4 text-xs text-[#5d2a1a]">
              You are signed in as a Viewer. Request an Analyst or Admin role to upload datasets.
            </p>
          )}
        </div>
      )}

      {/* Datasets Grid */}
      {!isLoading && !error && datasets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDatasets.map((ds) => (
            <div
              key={ds.id}
              onClick={() => handleOpenDetail(ds)}
              className="group cursor-pointer p-6 sm:p-7 rounded-[24px] bg-[#ffffff] border border-[#ececec] hover:border-[#17191c]/25 shadow-artifact hover:shadow-md transition-all flex flex-col justify-between"
              id={`dataset-card-${ds.id}`}
            >
              <div>
                {/* Top Badges & Status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`px-3 py-0.5 text-[11px] font-medium rounded-full border ${
                      ds.status === "ready"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : ds.status === "error"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {ds.status ? ds.status.toUpperCase() : "READY"}
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f2f2f3] text-[#777b86] font-mono">
                    {(ds.source_type || "CSV").toUpperCase()}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-serif font-normal text-[#17191c] group-hover:text-[#5d2a1a] transition-colors truncate">
                  {ds.name}
                </h3>
                <p className="text-xs text-[#777b86] mt-1 line-clamp-2 h-8 leading-relaxed">
                  {ds.description || "Ingested CSV dataset ready for analytical queries."}
                </p>

                {/* Details Pill Box */}
                <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-[16px] bg-[#f2f2f3] border border-[#ececec] text-xs">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-[#5d2a1a]" />
                    <span className="text-[#17191c] font-medium font-mono">
                      {ds.row_count?.toLocaleString()} <span className="text-[#777b86] font-sans font-normal">rows</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Columns className="w-3.5 h-3.5 text-[#5d2a1a]" />
                    <span className="text-[#17191c] font-medium font-mono">
                      {ds.column_count || ds.columns?.length || 0} <span className="text-[#777b86] font-sans font-normal">cols</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2 pt-1.5 border-t border-[#ececec] text-[11px] text-[#777b86] truncate">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#979799] shrink-0" />
                    <span className="truncate">{ds.file_name}</span>
                    <span className="text-[#979799]">({formatFileSize(ds.file_size_bytes)})</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-4 border-t border-[#ececec] flex items-center justify-between text-xs text-[#777b86]">
                <span className="flex items-center gap-1 text-[11px] text-[#979799]">
                  <Calendar className="w-3 h-3" />
                  {new Date(ds.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetail(ds);
                    }}
                    className="px-4 py-1.5 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Preview real rows & run queries"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview & Query
                  </button>

                  {canDelete && (
                    <button
                      onClick={(e) => handleDelete(e, ds.id, ds.name)}
                      disabled={deletingId === ds.id}
                      className="p-1.5 rounded-full hover:bg-rose-50 text-[#979799] hover:text-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UploadDatasetModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Detail / Preview / Query Runner Modal */}
      <DatasetDetailModal
        dataset={selectedDataset}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedDataset(null);
        }}
      />
    </div>
  );
}
