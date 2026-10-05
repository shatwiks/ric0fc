"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Compass,
  Database,
  Search,
  ArrowUpDown,
  Filter,
  BarChart3,
  LineChart,
  PieChart as PieChartIcon,
  ScatterChart as ScatterChartIcon,
  Table as TableIcon,
  Layers,
  Sparkles,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  Sliders,
  Maximize2,
  X
} from "lucide-react";
import {
  api,
  Dataset,
  DatasetPreview,
  ChartType,
  MeasureSpec,
  FilterSpec,
  SortSpec,
  AggregateQueryRequest,
  AggregateQueryResponse,
  Dashboard
} from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import ChartRenderer from "@/components/visualisations/ChartRenderer";

const CHART_TYPES: { type: ChartType; label: string; icon: any }[] = [
  { type: "table", label: "Pivot Table", icon: TableIcon },
  { type: "bar", label: "Bar Chart", icon: BarChart3 },
  { type: "line", label: "Line Chart", icon: LineChart },
  { type: "area", label: "Area Chart", icon: Layers },
  { type: "donut", label: "Donut / Pie", icon: PieChartIcon },
  { type: "scatter", label: "Scatter Plot", icon: ScatterChartIcon },
  { type: "kpi", label: "KPI Stat", icon: Sparkles },
];

export default function InteractiveDataExplorerPage() {
  const { user } = useAuthStore();
  const canEdit = user?.role === "Admin" || user?.role === "Analyst";

  // Datasets State
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);

  // Explorer View Mode: "records" (ad-hoc raw rows) | "aggregate" (group-by / pivot)
  const [exploreMode, setExploreMode] = useState<"records" | "aggregate">("records");

  // Mode A: Ad-Hoc Raw Records State
  const [previewData, setPreviewData] = useState<DatasetPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [recordsSearch, setRecordsSearch] = useState("");
  const [recordsSortCol, setRecordsSortCol] = useState<string>("");
  const [recordsSortDir, setRecordsSortDir] = useState<"asc" | "desc">("asc");
  const [recordsLimit, setRecordsLimit] = useState<number>(50);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Mode B: Aggregate & Slice-and-Dice State
  const [chartType, setChartType] = useState<ChartType>("table");
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [measures, setMeasures] = useState<MeasureSpec[]>([]);
  const [filterCol, setFilterCol] = useState<string>("");
  const [filterOp, setFilterOp] = useState<string>("eq");
  const [filterVal, setFilterVal] = useState<string>("");
  const [aggSortCol, setAggSortCol] = useState<string>("");
  const [aggSortDir, setAggSortDir] = useState<"asc" | "desc">("desc");
  const [aggLimit, setAggLimit] = useState<number>(100);

  // Execution State
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResponse, setQueryResponse] = useState<AggregateQueryResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Save Exploration to Dashboard Modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [targetDashboardId, setTargetDashboardId] = useState<string>("new");
  const [newDashboardTitle, setNewDashboardTitle] = useState("");
  const [widgetTitle, setWidgetTitle] = useState("Ad-hoc Exploration");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // 1. Fetch available datasets
  useEffect(() => {
    async function loadDatasets() {
      setIsLoadingDatasets(true);
      try {
        const data = await api.listDatasets();
        setDatasets(data);
        if (data.length > 0) {
          setSelectedDatasetId(data[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load datasets:", err);
      } finally {
        setIsLoadingDatasets(false);
      }
    }
    loadDatasets();
  }, []);

  const currentDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || null;
  }, [datasets, selectedDatasetId]);

  // Auto-configure defaults when dataset changes
  useEffect(() => {
    if (!currentDataset) return;
    const cols = currentDataset.columns || [];
    setVisibleColumns(cols.map((c) => c.name));

    const stringCols = cols.filter((c) =>
      ["string", "date", "datetime"].includes(c.data_type.toLowerCase())
    );
    const numCols = cols.filter((c) =>
      ["integer", "float", "number", "numeric", "double"].includes(c.data_type.toLowerCase())
    );

    if (stringCols.length > 0) {
      setSelectedDimensions([stringCols[0].name]);
    } else if (cols.length > 0) {
      setSelectedDimensions([cols[0].name]);
    }

    if (numCols.length > 0) {
      setMeasures([{ column: numCols[0].name, agg: "sum", alias: `sum_${numCols[0].name}` }]);
      setAggSortCol(numCols[0].name);
    } else if (cols.length > 0) {
      setMeasures([{ column: cols[0].name, agg: "count", alias: `count_${cols[0].name}` }]);
      setAggSortCol(cols[0].name);
    }
  }, [currentDataset]);

  // 2. Fetch Raw Records Preview (Mode A)
  const fetchRecordsPreview = useCallback(async () => {
    if (!selectedDatasetId) return;
    setIsLoadingPreview(true);
    try {
      const data = await api.getDatasetPreview(selectedDatasetId, recordsLimit);
      setPreviewData(data);
    } catch (err: any) {
      console.error("Failed to load dataset preview:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [selectedDatasetId, recordsLimit]);

  useEffect(() => {
    if (exploreMode === "records" && selectedDatasetId) {
      fetchRecordsPreview();
    }
  }, [exploreMode, selectedDatasetId, fetchRecordsPreview]);

  // 3. Execute Aggregate Query (Mode B)
  const executeAggregateQuery = useCallback(async () => {
    if (!selectedDatasetId) return;
    setIsQuerying(true);
    setQueryError(null);

    const payload: AggregateQueryRequest = {
      dataset_id: selectedDatasetId,
      dimensions: selectedDimensions,
      measures: measures,
      limit: aggLimit,
    };

    if (filterCol && filterVal.trim()) {
      let parsed: any = filterVal.trim();
      if (!isNaN(Number(parsed)) && parsed !== "") {
        parsed = Number(parsed);
      }
      payload.filters = [
        {
          column: filterCol,
          operator: filterOp as any,
          value: parsed,
        },
      ];
    }

    if (aggSortCol) {
      payload.sort = [
        {
          column: aggSortCol,
          direction: aggSortDir,
        },
      ];
    }

    try {
      const res = await api.executeAggregateQuery(payload);
      setQueryResponse(res);
    } catch (err: any) {
      setQueryError(err.message || "Failed to execute query.");
    } finally {
      setIsQuerying(false);
    }
  }, [selectedDatasetId, selectedDimensions, measures, filterCol, filterOp, filterVal, aggSortCol, aggSortDir, aggLimit]);

  useEffect(() => {
    if (exploreMode === "aggregate" && selectedDatasetId) {
      executeAggregateQuery();
    }
  }, [exploreMode, selectedDatasetId, executeAggregateQuery]);

  // Filtered & Sorted Raw Records for Mode A
  const filteredRawRows = useMemo(() => {
    if (!previewData || !previewData.rows) return [];
    let rows = [...previewData.rows];

    if (recordsSearch.trim()) {
      const q = recordsSearch.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      );
    }

    if (recordsSortCol) {
      rows.sort((a, b) => {
        const valA = a[recordsSortCol];
        const valB = b[recordsSortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        const res = valA > valB ? 1 : -1;
        return recordsSortDir === "asc" ? res : -res;
      });
    }

    return rows;
  }, [previewData, recordsSearch, recordsSortCol, recordsSortDir]);

  // Toggle raw column sorting
  const handleSortHeader = (col: string) => {
    if (recordsSortCol === col) {
      setRecordsSortDir(recordsSortDir === "asc" ? "desc" : "asc");
    } else {
      setRecordsSortCol(col);
      setRecordsSortDir("asc");
    }
  };

  // Toggle raw column visibility
  const toggleColumnVisibility = (col: string) => {
    if (visibleColumns.includes(col)) {
      if (visibleColumns.length > 1) {
        setVisibleColumns(visibleColumns.filter((c) => c !== col));
      }
    } else {
      setVisibleColumns([...visibleColumns, col]);
    }
  };

  // Open Save Modal
  const openSaveModal = async () => {
    setIsSaveModalOpen(true);
    setSaveSuccessMsg(null);
    setWidgetTitle(
      exploreMode === "records"
        ? `${currentDataset?.name || "Dataset"} Ad-hoc Table`
        : `${currentDataset?.name || "Dataset"} ${chartType.toUpperCase()} Exploration`
    );
    try {
      const dashList = await api.listDashboards();
      setDashboards(dashList);
      if (dashList.length > 0) {
        setTargetDashboardId(dashList[0].id);
      } else {
        setTargetDashboardId("new");
        setNewDashboardTitle("Exploration Insights");
      }
    } catch (err: any) {
      console.error("Failed to load dashboards:", err);
    }
  };

  // Save to Dashboard
  const handleSaveToDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDataset) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      let targetId = targetDashboardId;
      if (targetId === "new" || !targetId) {
        const created = await api.createDashboard({
          title: newDashboardTitle.trim() || "Data Exploration Dashboard",
          description: "Persisted from Interactive Data Explorer",
        });
        targetId = created.id;
      }

      const firstCol = currentDataset.columns?.[0]?.name || "id";
      if (exploreMode === "records") {
        // Save as Table widget with raw dimensions
        await api.addWidget(targetId, {
          dataset_id: currentDataset.id,
          title: widgetTitle.trim() || "Ad-hoc Records Exploration",
          chart_type: "table",
          dimensions: visibleColumns.slice(0, 5),
          measures: [{ column: firstCol, agg: "count", alias: "rows" }],
          limit: recordsLimit,
          position: { w: 12, h: 2 },
        });
      } else {
        // Save aggregated chart/pivot widget
        await api.addWidget(targetId, {
          dataset_id: currentDataset.id,
          title: widgetTitle.trim() || "Analytical Exploration",
          chart_type: chartType,
          dimensions: selectedDimensions,
          measures: measures,
          filters: filterCol && filterVal ? [{ column: filterCol, operator: filterOp as any, value: filterVal }] : [],
          limit: aggLimit,
          position: { w: chartType === "kpi" ? 4 : chartType === "table" ? 12 : 6, h: 2 },
        });
      }

      setSaveSuccessMsg("Exploration successfully saved to dashboard!");
      setTimeout(() => {
        setIsSaveModalOpen(false);
        setSaveSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Failed to save exploration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 select-none">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#ececec]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-normal text-[#17191c] tracking-tight flex items-center gap-2.5">
              <Compass className="w-8 h-8 text-[#5d2a1a]" />
              Interactive Data Explorer
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5d2a1a]" />
              DuckDB Live Sandbox
            </span>
          </div>
          <p className="text-sm text-[#777b86] mt-1 max-w-2xl">
            Self-service visual data exploration, ad-hoc pivot tables, instant chart switching, and slice-and-dice queries.
          </p>
        </div>

        {/* Global Dataset Selector & Save Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#ffffff] border border-[#ececec] rounded-full px-4 py-2 shadow-sm">
            <Database className="w-4 h-4 text-[#5d2a1a] shrink-0" />
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              id="explorer-dataset-select"
              className="bg-transparent text-xs text-[#17191c] font-medium focus:outline-none cursor-pointer"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#ffffff] text-[#17191c]">
                  {d.name} ({d.row_count.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          {canEdit && (
            <button
              onClick={openSaveModal}
              id="save-exploration-btn"
              disabled={isLoadingDatasets || !currentDataset}
              className="py-2.5 px-6 rounded-full bg-[#17191c] hover:bg-black text-[#ffffff] font-normal text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#ffffff]" />
              Save to Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Mode Toggle Bar: Ad-Hoc Records vs Group-By / Pivot */}
      <div className="flex items-center justify-between p-2 rounded-full bg-[#ffffff] border border-[#ececec] shadow-artifact">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExploreMode("records")}
            id="tab-explore-records"
            className={`px-5 py-2 rounded-full text-xs font-normal transition-all flex items-center gap-2 cursor-pointer ${
              exploreMode === "records"
                ? "bg-[#17191c] text-white shadow-sm"
                : "text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3]"
            }`}
          >
            <TableIcon className="w-4 h-4" />
            Ad-Hoc Table Exploration
          </button>

          <button
            onClick={() => setExploreMode("aggregate")}
            id="tab-explore-aggregate"
            className={`px-5 py-2 rounded-full text-xs font-normal transition-all flex items-center gap-2 cursor-pointer ${
              exploreMode === "aggregate"
                ? "bg-[#17191c] text-white shadow-sm"
                : "text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3]"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Group-By & Pivot Analytics
          </button>
        </div>

        {/* Dataset Quick Telemetry */}
        {currentDataset && (
          <div className="hidden sm:flex items-center gap-3 text-xs text-[#777b86] pr-4">
            <span>
              Rows: <strong className="text-[#17191c] font-medium">{currentDataset.row_count.toLocaleString()}</strong>
            </span>
            <span>•</span>
            <span>
              Columns: <strong className="text-[#17191c] font-medium">{currentDataset.column_count}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODE A: AD-HOC RAW RECORDS EXPLORATION */}
      {/* ============================================================== */}
      {exploreMode === "records" && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Column Filter, Limits */}
          <div className="p-4 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-[#a3a6af] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recordsSearch}
                onChange={(e) => setRecordsSearch(e.target.value)}
                placeholder="Search raw rows across all columns..."
                id="search-raw-records-input"
                className="w-full pl-10 pr-4 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] placeholder:text-[#a3a6af] outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Row Limiter */}
              <div className="flex items-center gap-1.5 text-xs text-[#777b86]">
                <span>Show:</span>
                <select
                  value={recordsLimit}
                  onChange={(e) => setRecordsLimit(Number(e.target.value))}
                  id="records-limit-select"
                  className="bg-[#f2f2f3] border border-transparent text-xs rounded-xl px-2.5 py-1.5 text-[#17191c] outline-none"
                >
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </select>
              </div>

              {/* Reload Button */}
              <button
                onClick={fetchRecordsPreview}
                id="refresh-records-btn"
                className="p-2 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Refresh rows"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#5d2a1a] ${isLoadingPreview ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Column Visibility Toggles */}
          <div className="p-4 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-[#5d2a1a] uppercase tracking-wider text-[11px] mr-1">
              Active Columns:
            </span>
            {currentDataset?.columns?.map((c) => {
              const isVis = visibleColumns.includes(c.name);
              return (
                <button
                  key={c.name}
                  onClick={() => toggleColumnVisibility(c.name)}
                  className={`px-3 py-1 rounded-full text-xs font-normal transition-colors cursor-pointer ${
                    isVis
                      ? "bg-[#fbe1d1] border border-[#5d2a1a]/20 text-[#5d2a1a] font-medium"
                      : "bg-[#f2f2f3] text-[#777b86] hover:text-[#17191c]"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* Ad-Hoc Records Table */}
          <div className="rounded-[24px] bg-[#ffffff] border border-[#ececec] overflow-hidden shadow-artifact">
            {isLoadingPreview ? (
              <div className="p-12 text-center text-[#777b86] space-y-3">
                <div className="w-8 h-8 border-2 border-[#5d2a1a] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">Fetching records from DuckDB...</p>
              </div>
            ) : filteredRawRows.length === 0 ? (
              <div className="p-12 text-center text-[#777b86]">
                <p className="text-sm font-serif font-normal text-[#17191c]">No records found</p>
                <p className="text-xs text-[#777b86] mt-1">Try clearing or broadening your search filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-left border-collapse text-xs" id="ad-hoc-records-table">
                  <thead className="sticky top-0 bg-[#f2f2f3] border-b border-[#ececec] z-10">
                    <tr>
                      <th className="py-3 px-4 text-[#979799] font-mono text-[11px] w-12 text-center">#</th>
                      {visibleColumns.map((colName) => {
                        const isSorted = recordsSortCol === colName;
                        return (
                          <th
                            key={colName}
                            onClick={() => handleSortHeader(colName)}
                            className="py-3 px-4 font-normal text-[#17191c] uppercase tracking-wider text-[11px] hover:text-[#5d2a1a] cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{colName}</span>
                              <ArrowUpDown
                                className={`w-3 h-3 ${isSorted ? "text-[#5d2a1a]" : "text-[#a3a6af]"}`}
                              />
                              {isSorted && (
                                <span className="text-[10px] text-[#5d2a1a] uppercase font-mono">
                                  {recordsSortDir}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececec]">
                    {filteredRawRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#f9f9fa] transition-colors">
                        <td className="py-2.5 px-4 text-[#979799] font-mono text-[11px] text-center">
                          {idx + 1}
                        </td>
                        {visibleColumns.map((colName) => {
                          const val = row[colName];
                          const isNull = val === null || val === undefined;
                          const isBool = typeof val === "boolean";
                          return (
                            <td key={colName} className="py-2.5 px-4 text-[#17191c] font-mono">
                              {isNull ? (
                                <span className="text-[#a3a6af] italic">null</span>
                              ) : isBool ? (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                    val
                                      ? "bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20"
                                      : "bg-rose-50 text-rose-800 border border-rose-200"
                                  }`}
                                >
                                  {String(val)}
                                </span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE B: GROUP-BY, PIVOT, & VISUAL ANALYTICS */}
      {/* ============================================================== */}
      {exploreMode === "aggregate" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Controls Column */}
          <div className="lg:col-span-4 space-y-4">
            {/* Chart Type Selector */}
            <div className="p-6 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-3">
              <label className="text-xs font-medium text-[#5d2a1a] uppercase tracking-wider block">
                Visualization Lens
              </label>
              <div className="grid grid-cols-4 gap-2" id="explorer-chart-types">
                {CHART_TYPES.map((ct) => {
                  const Icon = ct.icon;
                  const isSel = chartType === ct.type;
                  return (
                    <button
                      key={ct.type}
                      onClick={() => setChartType(ct.type)}
                      id={`explore-chart-btn-${ct.type}`}
                      className={`p-2.5 rounded-[16px] border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        isSel
                          ? "bg-[#fbe1d1] border-[#5d2a1a] text-[#5d2a1a] font-medium"
                          : "bg-[#f2f2f3] border-transparent text-[#777b86] hover:bg-[#ededee] hover:text-[#17191c]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] truncate max-w-full">{ct.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dimensions (Group By) */}
            <div className="p-6 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-3">
              <label className="text-xs font-medium text-[#5d2a1a] uppercase tracking-wider block">
                Group By (Dimensions)
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-[#f2f2f3] rounded-[16px] max-h-32 overflow-y-auto">
                {currentDataset?.columns?.map((c) => {
                  const isSel = selectedDimensions.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      onClick={() => {
                        if (isSel) {
                          if (selectedDimensions.length > 1) {
                            setSelectedDimensions(selectedDimensions.filter((d) => d !== c.name));
                          }
                        } else {
                          setSelectedDimensions([...selectedDimensions, c.name]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-normal transition-all cursor-pointer ${
                        isSel
                          ? "bg-[#17191c] text-white font-medium shadow-sm"
                          : "bg-[#ffffff] text-[#17191c] border border-[#ececec] hover:bg-[#ededee]"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Measures (Aggregations) */}
            <div className="p-6 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#5d2a1a] uppercase tracking-wider">
                  Aggregations (Measures)
                </label>
                <button
                  onClick={() => {
                    if (currentDataset && currentDataset.columns && currentDataset.columns.length > 0) {
                      const col = currentDataset.columns[0].name;
                      setMeasures([...measures, { column: col, agg: "sum", alias: `sum_${col}` }]);
                    }
                  }}
                  className="text-xs text-[#5d2a1a] hover:underline font-medium cursor-pointer"
                >
                  + Add Metric
                </button>
              </div>

              <div className="space-y-2">
                {measures.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-[#f2f2f3] p-2 rounded-[16px]">
                    <select
                      value={m.agg}
                      onChange={(e) => {
                        const updated = [...measures];
                        updated[idx].agg = e.target.value as any;
                        updated[idx].alias = `${e.target.value}_${updated[idx].column}`;
                        setMeasures(updated);
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
                        const updated = [...measures];
                        updated[idx].column = e.target.value;
                        updated[idx].alias = `${updated[idx].agg}_${e.target.value}`;
                        setMeasures(updated);
                      }}
                      className="flex-1 bg-[#ffffff] border border-[#ececec] text-xs rounded-xl px-2.5 py-1.5 text-[#17191c]"
                    >
                      {currentDataset?.columns?.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    {measures.length > 1 && (
                      <button
                        onClick={() => setMeasures(measures.filter((_, i) => i !== idx))}
                        className="p-1.5 text-[#979799] hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Filter & Slicers */}
            <div className="p-6 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-3">
              <label className="text-xs font-medium text-[#5d2a1a] uppercase tracking-wider block">
                Slice Filter (Optional)
              </label>
              <div className="space-y-2 bg-[#f2f2f3] p-2.5 rounded-[16px]">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={filterCol}
                    onChange={(e) => setFilterCol(e.target.value)}
                    className="bg-[#ffffff] border border-[#ececec] text-xs rounded-xl px-2.5 py-1.5 text-[#17191c]"
                  >
                    <option value="">-- No filter --</option>
                    {currentDataset?.columns?.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterOp}
                    onChange={(e) => setFilterOp(e.target.value)}
                    className="bg-[#ffffff] border border-[#ececec] text-xs rounded-xl px-2.5 py-1.5 text-[#17191c]"
                  >
                    <option value="eq">= Equals</option>
                    <option value="ne">!= Not Equals</option>
                    <option value="gt">&gt; Greater</option>
                    <option value="gte">&gt;= Greater/Eq</option>
                    <option value="lt">&lt; Less</option>
                    <option value="lte">&lt;= Less/Eq</option>
                    <option value="contains">CONTAINS</option>
                  </select>
                </div>

                {filterCol && (
                  <input
                    type="text"
                    value={filterVal}
                    onChange={(e) => setFilterVal(e.target.value)}
                    placeholder="Filter value..."
                    className="w-full bg-[#ffffff] border border-[#ececec] text-xs rounded-xl px-2.5 py-1.5 text-[#17191c] placeholder:text-[#a3a6af]"
                  />
                )}
              </div>
            </div>

            {/* Execution Action */}
            <button
              onClick={executeAggregateQuery}
              disabled={isQuerying || !selectedDatasetId}
              id="execute-explorer-query-btn"
              className="w-full py-2.5 px-6 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isQuerying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running DuckDB Query...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-[#fbe1d1]" />
                  Run Slice-and-Dice Query
                </>
              )}
            </button>
          </div>

          {/* Right Visualization Stage */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-6 sm:p-7 rounded-[24px] bg-[#ffffff] border border-[#ececec] flex flex-col min-h-[460px] shadow-artifact">
              {/* Header Telemetry */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#ececec]">
                <div>
                  <h3 className="text-xl font-serif font-normal text-[#17191c] tracking-tight">
                    {chartType.toUpperCase()} Aggregation Canvas
                  </h3>
                  <p className="text-xs text-[#777b86] mt-0.5">
                    Dataset: <strong className="text-[#17191c] font-medium">{currentDataset?.name}</strong> • Dimensions: {selectedDimensions.join(", ")}
                  </p>
                </div>

                {queryResponse && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-3 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 font-medium">
                      {queryResponse.row_count} rows
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#f2f2f3] text-[#17191c] font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#5d2a1a]" />
                      {queryResponse.execution_time_ms.toFixed(1)} ms
                    </span>
                  </div>
                )}
              </div>

              {/* Rendered Chart */}
              <div className="flex-1 flex items-center justify-center">
                <ChartRenderer
                  chartType={chartType}
                  data={queryResponse?.data || []}
                  dimensions={selectedDimensions}
                  measures={measures}
                  config={{ prefix: "$", metricLabel: "Metric" }}
                  isLoading={isQuerying}
                  error={queryError}
                  height={380}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Exploration to Dashboard Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-8 rounded-[24px] bg-[#ffffff] border border-[#ececec] text-[#17191c] shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsSaveModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                Save Exploration
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#17191c]">
                Save Exploration to Dashboard
              </h3>
              <p className="text-xs text-[#777b86] mt-1">
                Persist this ad-hoc visual or table widget into an executive dashboard container.
              </p>
            </div>

            {saveSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-[#fbe1d1]/60 border border-[#5d2a1a]/20 text-[#5d2a1a] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5d2a1a] shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveToDashboard} className="space-y-4">
              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Widget Title
                </label>
                <input
                  type="text"
                  required
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  id="explorer-widget-title-input"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                  Target Dashboard
                </label>
                <select
                  value={targetDashboardId}
                  onChange={(e) => setTargetDashboardId(e.target.value)}
                  id="explorer-target-dashboard-select"
                  className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none"
                >
                  <option value="new">+ Create New Dashboard</option>
                  {dashboards.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.widget_count} widgets)
                    </option>
                  ))}
                </select>
              </div>

              {targetDashboardId === "new" && (
                <div>
                  <label className="block text-xs font-normal text-[#777b86] mb-1.5">
                    New Dashboard Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDashboardTitle}
                    onChange={(e) => setNewDashboardTitle(e.target.value)}
                    placeholder="e.g. Sales Exploration Insights"
                    id="explorer-new-dash-input"
                    className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] placeholder:text-[#a3a6af] outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f2f2f3]">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-full text-xs font-normal text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  id="confirm-save-exploration-btn"
                  className="px-6 py-2.5 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs sm:text-sm shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Exploration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
