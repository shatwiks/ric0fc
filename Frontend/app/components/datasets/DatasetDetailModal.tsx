"use client";

import { useState, useEffect } from "react";
import {
  X,
  Database,
  Table,
  Columns,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowUpDown,
  Filter,
  BarChart3,
  Calendar,
  Hash,
  Type,
  ToggleLeft,
  ChevronRight,
  Download
} from "lucide-react";
import {
  api,
  Dataset,
  DatasetPreview,
  AggregateQueryRequest,
  AggregateQueryResponse,
  MeasureSpec
} from "@/lib/api";

interface DatasetDetailModalProps {
  dataset: Dataset | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DatasetDetailModal({
  dataset,
  isOpen,
  onClose,
}: DatasetDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "schema" | "analytics">("preview");
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Analytics Query Runner State
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [measures, setMeasures] = useState<MeasureSpec[]>([]);
  const [filterColumn, setFilterColumn] = useState<string>("");
  const [filterOp, setFilterOp] = useState<string>("eq");
  const [filterVal, setFilterVal] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<number>(100);

  const [isRunningQuery, setIsRunningQuery] = useState(false);
  const [queryResult, setQueryResult] = useState<AggregateQueryResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && dataset) {
      loadPreview(dataset.id);
      initializeQueryState(dataset);
    } else {
      setPreview(null);
      setQueryResult(null);
      setQueryError(null);
      setPreviewError(null);
    }
  }, [isOpen, dataset]);

  const loadPreview = async (id: string) => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const data = await api.getDatasetPreview(id, 50);
      setPreview(data);
    } catch (err: any) {
      setPreviewError(err.message || "Failed to load dataset preview.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const initializeQueryState = (ds: Dataset) => {
    if (!ds.columns || ds.columns.length === 0) return;

    const stringCols = ds.columns.filter((c) =>
      ["string", "datetime", "date"].includes(c.data_type.toLowerCase())
    );
    const numCols = ds.columns.filter((c) =>
      ["integer", "float", "number", "numeric", "double"].includes(c.data_type.toLowerCase())
    );

    if (stringCols.length > 0) {
      setSelectedDimensions([stringCols[0].name]);
    } else if (ds.columns.length > 0) {
      setSelectedDimensions([ds.columns[0].name]);
    }

    if (numCols.length > 0) {
      setMeasures([{ column: numCols[0].name, agg: "sum" }]);
      setSortColumn(numCols[0].name);
    } else if (ds.columns.length > 0) {
      setMeasures([{ column: ds.columns[0].name, agg: "count" }]);
      setSortColumn(ds.columns[0].name);
    }
  };

  const handleToggleDimension = (colName: string) => {
    if (selectedDimensions.includes(colName)) {
      setSelectedDimensions(selectedDimensions.filter((d) => d !== colName));
    } else {
      setSelectedDimensions([...selectedDimensions, colName]);
    }
  };

  const handleAddMeasure = () => {
    if (!dataset?.columns) return;
    const numCols = dataset.columns.filter((c) =>
      ["integer", "float", "number", "numeric", "double"].includes(c.data_type.toLowerCase())
    );
    const colToUse = numCols.length > 0 ? numCols[0].name : dataset.columns[0].name;
    setMeasures([...measures, { column: colToUse, agg: "sum" }]);
  };

  const handleRemoveMeasure = (index: number) => {
    setMeasures(measures.filter((_, i) => i !== index));
  };

  const handleRunQuery = async () => {
    if (!dataset) return;
    setIsRunningQuery(true);
    setQueryError(null);

    const queryPayload: AggregateQueryRequest = {
      dataset_id: dataset.id,
      dimensions: selectedDimensions,
      measures: measures,
      limit: limit,
    };

    if (filterColumn && filterVal.trim()) {
      let parsedVal: any = filterVal.trim();
      if (filterOp === "in" || filterOp === "not_in") {
        parsedVal = filterVal.split(",").map((v) => v.trim());
      } else if (!isNaN(Number(parsedVal)) && parsedVal !== "") {
        parsedVal = Number(parsedVal);
      }
      queryPayload.filters = [
        {
          column: filterColumn,
          operator: filterOp as any,
          value: parsedVal,
        },
      ];
    }

    if (sortColumn) {
      queryPayload.sort = [
        {
          column: sortColumn,
          direction: sortDir,
        },
      ];
    }

    try {
      const res = await api.executeAggregateQuery(queryPayload);
      setQueryResult(res);
    } catch (err: any) {
      setQueryError(err.message || "Failed to execute analytical DuckDB query.");
    } finally {
      setIsRunningQuery(false);
    }
  };

  if (!isOpen || !dataset) return null;

  const getTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("int") || t.includes("float") || t.includes("number")) {
      return <Hash className="w-3.5 h-3.5 text-[#5d2a1a]" />;
    }
    if (t.includes("date") || t.includes("time")) {
      return <Calendar className="w-3.5 h-3.5 text-[#c2410c]" />;
    }
    if (t.includes("bool")) {
      return <ToggleLeft className="w-3.5 h-3.5 text-[#d97706]" />;
    }
    return <Type className="w-3.5 h-3.5 text-[#17191c]" />;
  };

  const getTypeBadgeClass = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("int") || t.includes("float")) {
      return "bg-[#fbe1d1] text-[#5d2a1a] border-[#5d2a1a]/20";
    }
    if (t.includes("date") || t.includes("time")) {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    if (t.includes("bool")) {
      return "bg-orange-50 text-orange-800 border-orange-200";
    }
    return "bg-[#f4f4f5] text-[#17191c] border-[#ececec]";
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[90vh] flex flex-col bg-[#ffffff] border border-[#ececec] rounded-3xl shadow-2xl text-[#17191c] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#ececec] bg-[#ffffff] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#fbe1d1] border border-[#5d2a1a]/20 flex items-center justify-center shadow-sm">
              <Database className="w-6 h-6 text-[#5d2a1a]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-2xl font-normal text-[#17191c] tracking-tight">{dataset.name}</h2>
                <span
                  className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                    dataset.status === "ready"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : dataset.status === "error"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-[#fbe1d1] text-[#5d2a1a] border-[#5d2a1a]/20"
                  }`}
                >
                  {dataset.status ? dataset.status.toUpperCase() : "READY"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#f4f4f5] text-[#555] font-mono border border-[#ececec]">
                  {(dataset.source_type || "CSV").toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-[#777b86]">
                <span className="flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#979799]" />
                  {dataset.file_name || "data.csv"} ({formatFileSize(dataset.file_size_bytes)})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#979799]" />
                  <strong className="text-[#17191c] font-medium">{dataset.row_count?.toLocaleString()}</strong> rows
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Columns className="w-3.5 h-3.5 text-[#979799]" />
                  <strong className="text-[#17191c] font-medium">{dataset.column_count || dataset.columns?.length || 0}</strong> columns
                </span>
                <span>•</span>
                <span>Uploaded {new Date(dataset.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f4f4f5] transition-colors"
              title="Close modal"
              id="close-dataset-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-[#ececec] bg-[#fcfcfd] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === "preview"
                  ? "border-[#5d2a1a] text-[#5d2a1a] bg-[#fbe1d1]/30"
                  : "border-transparent text-[#777b86] hover:text-[#17191c]"
              }`}
              id="tab-data-preview"
            >
              <Table className="w-4 h-4" />
              Data Preview
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[#f4f4f5] text-[#555] border border-[#ececec]">
                {dataset.row_count > 50 ? "Top 50" : `${dataset.row_count}`}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("schema")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === "schema"
                  ? "border-[#5d2a1a] text-[#5d2a1a] bg-[#fbe1d1]/30"
                  : "border-transparent text-[#777b86] hover:text-[#17191c]"
              }`}
              id="tab-schema-columns"
            >
              <Columns className="w-4 h-4" />
              Detected Schema & Types
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[#f4f4f5] text-[#555] border border-[#ececec]">
                {dataset.columns?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === "analytics"
                  ? "border-[#5d2a1a] text-[#5d2a1a] bg-[#fbe1d1]/30"
                  : "border-transparent text-[#777b86] hover:text-[#17191c]"
              }`}
              id="tab-duckdb-analytics"
            >
              <Sparkles className="w-4 h-4 text-[#5d2a1a]" />
              DuckDB Analytics Engine
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[#fbe1d1] text-[#5d2a1a] font-mono border border-[#5d2a1a]/20">
                Server-Side
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#fafafb]">
          {/* TAB 1: DATA PREVIEW */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#777b86]">
                <p>
                  Showing live data sample directly from the server-stored CSV via DuckDB.
                </p>
                <span className="font-mono text-[#979799]">
                  {preview ? `${preview.rows.length} rows loaded` : "Loading..."}
                </span>
              </div>

              {isLoadingPreview && (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#5d2a1a] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#777b86]">Streaming data preview from DuckDB...</p>
                </div>
              )}

              {previewError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{previewError}</span>
                </div>
              )}

              {!isLoadingPreview && preview && (
                <div className="border border-[#ececec] rounded-2xl overflow-hidden bg-[#ffffff] shadow-sm">
                  <div className="overflow-x-auto max-h-[60vh]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#f4f4f5] sticky top-0 z-10 border-b border-[#ececec]">
                        <tr>
                          <th className="py-3 px-4 text-[#777b86] font-medium border-r border-[#ececec] w-12 text-center">
                            #
                          </th>
                          {preview.columns.map((col) => (
                            <th key={col.name} className="py-3 px-4 font-semibold text-[#17191c] whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {getTypeIcon(col.data_type)}
                                <span>{col.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ml-1 ${getTypeBadgeClass(col.data_type)}`}>
                                  {col.data_type}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ececec] font-mono">
                        {preview.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#f9f9fa] transition-colors">
                            <td className="py-2.5 px-4 text-[#979799] text-center border-r border-[#ececec]">
                              {idx + 1}
                            </td>
                            {preview.columns.map((col) => (
                              <td key={col.name} className="py-2.5 px-4 text-[#17191c] whitespace-nowrap">
                                {row[col.name] !== null && row[col.name] !== undefined
                                  ? String(row[col.name])
                                  : <span className="text-[#979799] italic">null</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETECTED SCHEMA & COLUMNS */}
          {activeTab === "schema" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#777b86]">
                <p>
                  Automatic schema detection performed by DuckDB sniffer with type coercion and statistical profiling.
                </p>
                <span>Total detected fields: {dataset.columns?.length || 0}</span>
              </div>

              <div className="border border-[#ececec] rounded-2xl overflow-hidden bg-[#ffffff] shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#f4f4f5] border-b border-[#ececec]">
                    <tr>
                      <th className="py-3.5 px-5 font-semibold text-[#17191c]">Column Name</th>
                      <th className="py-3.5 px-5 font-semibold text-[#17191c]">Inferred Type</th>
                      <th className="py-3.5 px-5 font-semibold text-[#17191c]">Classification</th>
                      <th className="py-3.5 px-5 font-semibold text-[#17191c]">Sample Ingested Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececec] font-mono">
                    {dataset.columns?.map((col) => {
                      const isNumeric = ["integer", "float", "number", "numeric", "double"].includes(
                        col.data_type.toLowerCase()
                      );
                      return (
                        <tr key={col.name} className="hover:bg-[#f9f9fa] transition-colors">
                          <td className="py-3 px-5 text-[#17191c] font-semibold flex items-center gap-2">
                            {getTypeIcon(col.data_type)}
                            <span>{col.name}</span>
                          </td>
                          <td className="py-3 px-5">
                            <span className={`px-2.5 py-1 text-xs rounded-full border font-semibold ${getTypeBadgeClass(col.data_type)}`}>
                              {col.data_type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium border ${
                                isNumeric
                                  ? "bg-[#fbe1d1] text-[#5d2a1a] border-[#5d2a1a]/20"
                                  : "bg-[#f4f4f5] text-[#17191c] border-[#ececec]"
                              }`}
                            >
                              {isNumeric ? "MEASURE / METRIC" : "DIMENSION / ATTRIBUTE"}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-[#777b86]">
                            {col.sample_values && col.sample_values.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {col.sample_values.slice(0, 4).map((val, vIdx) => (
                                  <span
                                    key={vIdx}
                                    className="px-2 py-0.5 rounded bg-[#f4f4f5] text-[#17191c] border border-[#ececec] text-[11px] truncate max-w-[150px]"
                                  >
                                    {String(val)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#979799] italic">None sampled</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DUCKDB ANALYTICS RUNNER */}
          {activeTab === "analytics" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controls Column */}
              <div className="lg:col-span-1 space-y-5 bg-[#ffffff] border border-[#ececec] p-5 rounded-2xl shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold text-[#17191c] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#5d2a1a]" />
                    Query Configuration
                  </h3>
                  <p className="text-xs text-[#777b86] mt-1">
                    Direct DuckDB aggregation without bringing raw rows to frontend.
                  </p>
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-xs font-semibold text-[#17191c] uppercase tracking-wider mb-2">
                    Dimensions (Group By)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 rounded-xl bg-[#f8f8f9] border border-[#ececec]">
                    {dataset.columns?.map((c) => {
                      const isSelected = selectedDimensions.includes(c.name);
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleToggleDimension(c.name)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-[#5d2a1a] text-white shadow-sm"
                              : "bg-[#ffffff] text-[#17191c] border border-[#ececec] hover:bg-[#f4f4f5]"
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#17191c] uppercase tracking-wider">
                      Measures (Aggregations)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMeasure}
                      className="text-xs text-[#5d2a1a] hover:text-black font-medium"
                    >
                      + Add Measure
                    </button>
                  </div>
                  <div className="space-y-2">
                    {measures.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-[#f8f8f9] p-2 rounded-xl border border-[#ececec]">
                        <select
                          value={m.agg}
                          onChange={(e) => {
                            const updated = [...measures];
                            updated[idx].agg = e.target.value as any;
                            setMeasures(updated);
                          }}
                          className="bg-[#ffffff] border border-[#ececec] text-xs rounded-lg px-2 py-1.5 text-[#17191c] font-mono focus:border-[#17191c] focus:outline-none"
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
                            const updated = [...measures];
                            updated[idx].column = e.target.value;
                            setMeasures(updated);
                          }}
                          className="flex-1 bg-[#ffffff] border border-[#ececec] text-xs rounded-lg px-2 py-1.5 text-[#17191c] font-mono focus:border-[#17191c] focus:outline-none"
                        >
                          {dataset.columns?.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {measures.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMeasure(idx)}
                            className="p-1 text-[#979799] hover:text-rose-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filter */}
                <div className="pt-2 border-t border-[#ececec]">
                  <label className="block text-xs font-semibold text-[#17191c] uppercase tracking-wider mb-2">
                    Filter (Optional)
                  </label>
                  <div className="space-y-2 bg-[#f8f8f9] p-2.5 rounded-xl border border-[#ececec]">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={filterColumn}
                        onChange={(e) => setFilterColumn(e.target.value)}
                        className="bg-[#ffffff] border border-[#ececec] text-xs rounded-lg px-2 py-1.5 text-[#17191c] focus:border-[#17191c] focus:outline-none"
                      >
                        <option value="">-- No filter --</option>
                        {dataset.columns?.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filterOp}
                        onChange={(e) => setFilterOp(e.target.value)}
                        className="bg-[#ffffff] border border-[#ececec] text-xs rounded-lg px-2 py-1.5 text-[#17191c] font-mono focus:border-[#17191c] focus:outline-none"
                      >
                        <option value="eq">= Equals</option>
                        <option value="ne">!= Not Equals</option>
                        <option value="in">IN (comma-separated)</option>
                        <option value="not_in">NOT IN</option>
                        <option value="gt">&gt; Greater Than</option>
                        <option value="gte">&gt;= Greater/Equal</option>
                        <option value="lt">&lt; Less Than</option>
                        <option value="lte">&lt;= Less/Equal</option>
                        <option value="contains">CONTAINS</option>
                      </select>
                    </div>
                    {filterColumn && (
                      <input
                        type="text"
                        value={filterVal}
                        onChange={(e) => setFilterVal(e.target.value)}
                        placeholder="Value (e.g. South, West)"
                        className="w-full bg-[#ffffff] border border-[#ececec] text-xs rounded-lg px-2.5 py-1.5 text-[#17191c] placeholder-[#979799] focus:border-[#17191c] focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Sort & Limit */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ececec]">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#777b86] mb-1">
                      Sort By
                    </label>
                    <select
                      value={sortColumn}
                      onChange={(e) => setSortColumn(e.target.value)}
                      className="w-full bg-[#f8f8f9] border border-[#ececec] text-xs rounded-lg px-2 py-1.5 text-[#17191c] focus:border-[#17191c] focus:outline-none"
                    >
                      <option value="">Default</option>
                      {selectedDimensions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                      {measures.map((m) => (
                        <option key={m.column} value={m.column}>
                          {m.agg}_{m.column}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#777b86] mb-1">
                      Direction
                    </label>
                    <select
                      value={sortDir}
                      onChange={(e) => setSortDir(e.target.value as any)}
                      className="w-full bg-[#f8f8f9] border border-[#ececec] text-xs rounded-lg px-2 py-1.5 text-[#17191c] focus:border-[#17191c] focus:outline-none"
                    >
                      <option value="desc">DESC (High to Low)</option>
                      <option value="asc">ASC (Low to High)</option>
                    </select>
                  </div>
                </div>

                {/* Run Button */}
                <button
                  type="button"
                  onClick={handleRunQuery}
                  disabled={isRunningQuery || (selectedDimensions.length === 0 && measures.length === 0)}
                  id="run-duckdb-query-btn"
                  className="w-full py-2.5 px-4 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {isRunningQuery ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Executing DuckDB Query...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Run Aggregate Query
                    </>
                  )}
                </button>
              </div>

              {/* Results Column */}
              <div className="lg:col-span-2 flex flex-col space-y-4">
                {queryError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{queryError}</span>
                  </div>
                )}

                {queryResult ? (
                  <div className="flex-1 flex flex-col bg-[#ffffff] border border-[#ececec] rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3 bg-[#f8f8f9] border-b border-[#ececec] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Query Executed Successfully
                        </span>
                        <span className="text-[#979799]">•</span>
                        <span className="text-[#17191c] font-mono font-medium">
                          {queryResult.row_count} rows returned
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[#5d2a1a] font-mono font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        {queryResult.execution_time_ms.toFixed(2)} ms
                      </div>
                    </div>

                    <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[50vh]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#f4f4f5] sticky top-0 border-b border-[#ececec]">
                          <tr>
                            <th className="py-2.5 px-4 text-[#777b86] font-mono text-center w-10 border-r border-[#ececec]">
                              #
                            </th>
                            {queryResult.columns.map((col) => (
                              <th key={col} className="py-2.5 px-4 font-semibold text-[#17191c] uppercase tracking-wider">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ececec] font-mono">
                          {queryResult.data.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-[#f9f9fa]">
                              <td className="py-2 px-4 text-[#979799] text-center border-r border-[#ececec]">
                                {rIdx + 1}
                              </td>
                              {queryResult.columns.map((col) => (
                                <td key={col} className="py-2 px-4 text-[#17191c]">
                                  {typeof row[col] === "number"
                                    ? row[col].toLocaleString(undefined, { maximumFractionDigits: 2 })
                                    : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#ffffff] border border-dashed border-[#ececec] rounded-2xl text-center shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-[#fbe1d1] border border-[#5d2a1a]/20 flex items-center justify-center mb-3">
                      <Sparkles className="w-6 h-6 text-[#5d2a1a]" />
                    </div>
                    <h4 className="text-base font-serif font-normal text-[#17191c]">Ready for Analytical Queries</h4>
                    <p className="text-xs text-[#777b86] max-w-sm mt-1">
                      Configure dimensions, measures, and filters on the left and click &quot;Run Aggregate Query&quot; to test the DuckDB engine in real time.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
