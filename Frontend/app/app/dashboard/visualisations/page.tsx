"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  LineChart,
  PieChart as PieChartIcon,
  ScatterChart as ScatterChartIcon,
  Table as TableIcon,
  Layers,
  Sparkles,
  Play,
  Save,
  Plus,
  Trash2,
  Filter,
  ArrowUpDown,
  Clock,
  Database,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Maximize2,
  X
} from "lucide-react";
import {
  api,
  Dataset,
  ChartType,
  MeasureSpec,
  FilterSpec,
  SortSpec,
  AggregateQueryRequest,
  AggregateQueryResponse,
  Dashboard,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import ChartRenderer from "@/components/visualisations/ChartRenderer";

const CHART_TYPES: { type: ChartType; label: string; icon: any; desc: string }[] = [
  { type: "bar", label: "Bar Chart", icon: BarChart3, desc: "Compare categorical metrics" },
  { type: "line", label: "Line Chart", icon: LineChart, desc: "Display trends across series" },
  { type: "area", label: "Area Chart", icon: Layers, desc: "Volume & cumulative progression" },
  { type: "donut", label: "Donut / Pie", icon: PieChartIcon, desc: "Proportional distribution" },
  { type: "scatter", label: "Scatter Plot", icon: ScatterChartIcon, desc: "Bivariate correlations" },
  { type: "kpi", label: "KPI Stat", icon: Sparkles, desc: "High-impact summary metric" },
  { type: "table", label: "Data Table", icon: TableIcon, desc: "Granular multi-column matrix" },
];

export default function VisualisationStudioPage() {
  const { user } = useAuthStore();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);

  // Studio Configuration State
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [chartTitle, setChartTitle] = useState("Executive Revenue Intelligence");
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [measures, setMeasures] = useState<MeasureSpec[]>([]);
  const [filterColumn, setFilterColumn] = useState<string>("");
  const [filterOp, setFilterOp] = useState<string>("eq");
  const [filterVal, setFilterVal] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<number>(100);

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResponse, setQueryResponse] = useState<AggregateQueryResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Save to Dashboard Modal
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [targetDashboardId, setTargetDashboardId] = useState<string>("");
  const [newDashboardTitle, setNewDashboardTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load available datasets
  useEffect(() => {
    async function initDatasets() {
      setIsLoadingDatasets(true);
      try {
        const data = await api.listDatasets();
        setDatasets(data);
        if (data.length > 0) {
          const first = data[0];
          setSelectedDatasetId(first.id);
          autoConfigureForDataset(first);
        }
      } catch (err: any) {
        console.error("Failed to load datasets:", err);
      } finally {
        setIsLoadingDatasets(false);
      }
    }
    initDatasets();
  }, []);

  const currentDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || null;
  }, [datasets, selectedDatasetId]);

  const autoConfigureForDataset = (ds: Dataset) => {
    if (!ds.columns || ds.columns.length === 0) return;

    const stringCols = ds.columns.filter((c) =>
      ["string", "datetime", "date"].includes(c.data_type.toLowerCase())
    );
    const numCols = ds.columns.filter((c) =>
      ["integer", "float", "number", "numeric", "double"].includes(c.data_type.toLowerCase())
    );

    if (stringCols.length > 0) {
      setSelectedDimensions([stringCols[0].name]);
    } else {
      setSelectedDimensions([ds.columns[0].name]);
    }

    if (numCols.length > 0) {
      setMeasures([{ column: numCols[0].name, agg: "sum", alias: `sum_${numCols[0].name}` }]);
      setSortColumn(numCols[0].name);
    } else {
      setMeasures([{ column: ds.columns[0].name, agg: "count", alias: `count_${ds.columns[0].name}` }]);
      setSortColumn(ds.columns[0].name);
    }
  };

  const handleDatasetChange = (id: string) => {
    setSelectedDatasetId(id);
    const found = datasets.find((d) => d.id === id);
    if (found) {
      autoConfigureForDataset(found);
    }
  };

  const toggleDimension = (colName: string) => {
    if (selectedDimensions.includes(colName)) {
      setSelectedDimensions(selectedDimensions.filter((d) => d !== colName));
    } else {
      setSelectedDimensions([...selectedDimensions, colName]);
    }
  };

  const addMeasure = () => {
    if (!currentDataset?.columns) return;
    const numCols = currentDataset.columns.filter((c) =>
      ["integer", "float", "number", "numeric", "double"].includes(c.data_type.toLowerCase())
    );
    const col = numCols.length > 0 ? numCols[0].name : currentDataset.columns[0].name;
    setMeasures([...measures, { column: col, agg: "sum", alias: `sum_${col}` }]);
  };

  const removeMeasure = (index: number) => {
    setMeasures(measures.filter((_, i) => i !== index));
  };

  const executeStudioQuery = async () => {
    if (!selectedDatasetId) return;
    setIsExecuting(true);
    setQueryError(null);

    const payload: AggregateQueryRequest = {
      dataset_id: selectedDatasetId,
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
      payload.filters = [
        {
          column: filterColumn,
          operator: filterOp as any,
          value: parsedVal,
        },
      ];
    }

    if (sortColumn) {
      payload.sort = [
        {
          column: sortColumn,
          direction: sortDir,
        },
      ];
    }

    try {
      const res = await api.executeAggregateQuery(payload);
      setQueryResponse(res);
    } catch (err: any) {
      setQueryError(err.message || "Failed to execute analytical query.");
    } finally {
      setIsExecuting(false);
    }
  };

  // Auto-run query on initial dataset load or configuration change
  useEffect(() => {
    if (selectedDatasetId && (selectedDimensions.length > 0 || measures.length > 0)) {
      executeStudioQuery();
    }
  }, [selectedDatasetId]);

  // Open Save Modal
  const handleOpenSaveModal = async () => {
    setIsSaveOpen(true);
    setSaveSuccessMsg(null);
    try {
      const list = await api.listDashboards();
      setDashboards(list);
      if (list.length > 0) {
        setTargetDashboardId(list[0].id);
      } else {
        setTargetDashboardId("new");
        setNewDashboardTitle("Executive Overview Dashboard");
      }
    } catch (err: any) {
      console.error("Failed to list dashboards:", err);
    }
  };

  // Save Widget to Dashboard
  const handleSaveToDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      let targetId = targetDashboardId;
      if (targetId === "new" || !targetId) {
        const createdDash = await api.createDashboard({
          title: newDashboardTitle.trim() || "New Executive Dashboard",
          description: "Created from Visualization Studio",
        });
        targetId = createdDash.id;
      }

      await api.addWidget(targetId, {
        dataset_id: selectedDatasetId,
        title: chartTitle.trim() || "Studio Chart",
        chart_type: chartType,
        dimensions: selectedDimensions,
        measures: measures,
        filters: filterColumn && filterVal ? [{ column: filterColumn, operator: filterOp as any, value: filterVal }] : [],
        position: { w: chartType === "kpi" ? 4 : 6, h: 2 },
      });

      setSaveSuccessMsg("Visualization widget saved successfully to dashboard!");
      setTimeout(() => {
        setIsSaveOpen(false);
        setSaveSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Failed to save widget to dashboard.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 select-none">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#ececec]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-normal text-[#17191c] tracking-tight">Visualization Studio</h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5d2a1a]" />
              Real-time DuckDB Powered
            </span>
          </div>
          <p className="text-sm text-[#777b86] mt-1 max-w-2xl">
            Compose high-performance analytical visualizations directly against ingested dataset schemas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={executeStudioQuery}
            disabled={isExecuting || !selectedDatasetId}
            id="run-studio-query-btn"
            className="py-2.5 px-6 rounded-full bg-[#17191c] hover:bg-black text-[#ffffff] font-normal text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExecuting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Querying DuckDB...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Run Query
              </>
            )}
          </button>

          <button
            onClick={handleOpenSaveModal}
            disabled={!queryResponse || isExecuting}
            id="save-to-dashboard-btn"
            className="py-2.5 px-6 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] font-normal text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#5d2a1a]" />
            Save to Dashboard
          </button>
        </div>
      </div>

      {/* Main Studio Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Controls & Configuration */}
        <div className="lg:col-span-4 space-y-5">
          {/* Dataset Selector */}
          <div className="p-6 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-3">
            <label className="text-xs font-medium text-[#5d2a1a] uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#5d2a1a]" />
              Source Dataset
            </label>
            {isLoadingDatasets ? (
              <div className="h-10 bg-[#f2f2f3] rounded-xl animate-pulse" />
            ) : (
              <select
                value={selectedDatasetId}
                onChange={(e) => handleDatasetChange(e.target.value)}
                id="studio-dataset-select"
                className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] outline-none"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count.toLocaleString()} rows)
                  </option>
                ))}
              </select>
            )}
            {currentDataset && (
              <p className="text-[11px] text-[#777b86]">
                Source: {currentDataset.file_name} • {currentDataset.column_count} detected columns
              </p>
            )}
          </div>

          {/* Chart Type Selector */}
          <div className="p-6 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-3">
            <label className="text-xs font-medium text-[#5d2a1a] uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#5d2a1a]" />
              Visualization Type
            </label>
            <div className="grid grid-cols-2 gap-2" id="chart-type-selector">
              {CHART_TYPES.map((ct) => {
                const Icon = ct.icon;
                const isSelected = chartType === ct.type;
                return (
                  <button
                    key={ct.type}
                    type="button"
                    onClick={() => setChartType(ct.type)}
                    id={`chart-type-btn-${ct.type}`}
                    className={`p-2.5 rounded-[16px] border text-left transition-all flex items-center gap-2.5 cursor-pointer ${isSelected
                        ? "bg-[#fbe1d1] border-[#5d2a1a] text-[#5d2a1a] font-medium"
                        : "bg-[#f2f2f3] border-transparent text-[#777b86] hover:bg-[#ededee] hover:text-[#17191c]"
                      }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-[#5d2a1a] text-white" : "bg-[#ffffff] text-[#777b86]"
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-normal truncate">{ct.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div className="p-6 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-2">
            <label className="text-xs font-medium text-[#5d2a1a] uppercase tracking-wider">
              Chart Title
            </label>
            <input
              type="text"
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              id="chart-title-input"
              className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] placeholder:text-[#a3a6af] outline-none"
            />
          </div>

          {/* Dimensions & Measures Config */}
          <div className="p-6 rounded-[24px] bg-[#ffffff] border border-[#ececec] shadow-artifact space-y-4">
            {/* Dimensions */}
            <div>
              <label className="text-xs font-medium text-[#5d2a1a] uppercase tracking-wider mb-2 block">
                Dimensions (Group By)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 rounded-[16px] bg-[#f2f2f3]">
                {currentDataset?.columns?.map((c) => {
                  const isSelected = selectedDimensions.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => toggleDimension(c.name)}
                      className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer ${isSelected
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[#5d2a1a] uppercase tracking-wider">
                  Measures (Aggregations)
                </label>
                <button
                  type="button"
                  onClick={addMeasure}
                  className="text-xs text-[#5d2a1a] hover:underline font-medium cursor-pointer"
                >
                  + Add Metric
                </button>
              </div>
              <div className="space-y-2">
                {measures.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[#f2f2f3] p-2 rounded-[16px]">
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
                        type="button"
                        onClick={() => removeMeasure(idx)}
                        className="p-1.5 text-[#979799] hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Filter */}
            <div className="pt-2 border-t border-[#ececec]">
              <label className="text-xs font-medium text-[#5d2a1a] uppercase tracking-wider mb-2 block">
                Filter (Optional)
              </label>
              <div className="space-y-2 bg-[#f2f2f3] p-2.5 rounded-[16px]">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={filterColumn}
                    onChange={(e) => setFilterColumn(e.target.value)}
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
                    <option value="in">IN (list)</option>
                    <option value="gt">&gt; Greater</option>
                    <option value="gte">&gt;= Greater/Eq</option>
                    <option value="lt">&lt; Less</option>
                    <option value="lte">&lt;= Less/Eq</option>
                    <option value="contains">CONTAINS</option>
                  </select>
                </div>
                {filterColumn && (
                  <input
                    type="text"
                    value={filterVal}
                    onChange={(e) => setFilterVal(e.target.value)}
                    placeholder="Filter value (e.g. South, West)"
                    className="w-full bg-[#ffffff] border border-[#ececec] text-xs rounded-xl px-2.5 py-1.5 text-[#17191c] placeholder:text-[#a3a6af]"
                  />
                )}
              </div>
            </div>

            {/* Sort & Limit */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ececec]">
              <div>
                <label className="block text-[11px] font-normal text-[#777b86] mb-1">Sort By</label>
                <select
                  value={sortColumn}
                  onChange={(e) => setSortColumn(e.target.value)}
                  className="w-full bg-[#f2f2f3] border border-transparent rounded-[16px] text-xs px-2.5 py-1.5 text-[#17191c]"
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
                <label className="block text-[11px] font-normal text-[#777b86] mb-1">Direction</label>
                <select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as any)}
                  className="w-full bg-[#f2f2f3] border border-transparent rounded-[16px] text-xs px-2.5 py-1.5 text-[#17191c]"
                >
                  <option value="desc">DESC (High to Low)</option>
                  <option value="asc">ASC (Low to High)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visualization Stage & Canvas */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Stage Card */}
          <div className="flex-1 p-6 sm:p-7 rounded-[24px] bg-[#ffffff] border border-[#ececec] flex flex-col shadow-artifact">
            {/* Stage Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#ececec]">
              <div>
                <h3 className="text-xl font-serif font-normal text-[#17191c] tracking-tight">{chartTitle}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-[#777b86]">
                  <span className="font-medium text-[#5d2a1a] bg-[#fbe1d1] border border-[#5d2a1a]/20 px-2 py-0.5 rounded-full uppercase text-[10px]">
                    {chartType}
                  </span>
                  <span>•</span>
                  <span>
                    Dataset: <strong className="text-[#17191c] font-medium">{currentDataset?.name}</strong>
                  </span>
                </div>
              </div>

              {queryResponse && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-3 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5d2a1a]" />
                    {queryResponse.row_count} rows
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#f2f2f3] text-[#17191c] font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#5d2a1a]" />
                    {queryResponse.execution_time_ms.toFixed(1)} ms
                  </span>
                </div>
              )}
            </div>

            {/* Chart Container */}
            <div className="flex-1 min-h-[380px] flex items-center justify-center">
              <ChartRenderer
                chartType={chartType}
                data={queryResponse?.data || []}
                dimensions={selectedDimensions}
                measures={measures}
                config={{ prefix: "$", metricLabel: chartTitle }}
                isLoading={isExecuting}
                error={queryError}
                height={380}
              />
            </div>
          </div>

          {/* Raw Response Telemetry Collapsible */}
          {queryResponse && (
            <div className="p-4 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact text-xs">
              <div className="flex items-center justify-between text-[#777b86]">
                <span className="font-medium text-[#17191c]">DuckDB Aggregation Telemetry</span>
                <span className="font-mono text-[11px] text-[#979799]">
                  Columns: {queryResponse.columns.join(", ")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save to Dashboard Modal */}
      {isSaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-8 rounded-[24px] bg-[#ffffff] border border-[#ececec] text-[#17191c] shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsSaveOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#979799]">
                Save Visualization
              </span>
              <h3 className="text-2xl font-serif font-normal text-[#17191c]">
                Save to Dashboard
              </h3>
              <p className="text-xs text-[#777b86] mt-1">
                Persist this visualization widget into an existing or new executive dashboard.
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
                  Target Dashboard
                </label>
                <select
                  value={targetDashboardId}
                  onChange={(e) => setTargetDashboardId(e.target.value)}
                  id="target-dashboard-select"
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
                    New Dashboard Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newDashboardTitle}
                    onChange={(e) => setNewDashboardTitle(e.target.value)}
                    placeholder="e.g. Q3 Sales & Performance"
                    className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] placeholder:text-[#a3a6af] outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f2f2f3]">
                <button
                  type="button"
                  onClick={() => setIsSaveOpen(false)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-full text-xs font-normal text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  id="confirm-save-widget-btn"
                  className="px-6 py-2.5 rounded-full bg-[#17191c] hover:bg-black text-white font-normal text-xs sm:text-sm shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Widget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
