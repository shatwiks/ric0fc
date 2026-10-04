"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ZAxis,
} from "recharts";
import { ChartType, MeasureSpec } from "@/lib/api";
import { AlertCircle, BarChart3, Hash, Sparkles } from "lucide-react";

interface ChartRendererProps {
  chartType: ChartType;
  data: Record<string, any>[];
  dimensions: string[];
  measures: MeasureSpec[] | { column: string; agg?: string; alias?: string }[];
  config?: Record<string, any>;
  isLoading?: boolean;
  error?: string | null;
  height?: number | string;
}

const PALETTE = [
  "#5d2a1a", // Rich Sienna Wood
  "#c2410c", // Terracotta
  "#d97706", // Warm Amber
  "#854d0e", // Raw Ochre
  "#475569", // Warm Slate
  "#17191c", // Ink Charcoal
  "#78350f", // Dark Walnut
  "#0f766e", // Deep Forest Olive
];

export default function ChartRenderer({
  chartType,
  data,
  dimensions,
  measures,
  config = {},
  isLoading = false,
  error = null,
  height = 320,
}: ChartRendererProps) {
  // Determine measure keys (using alias or agg_col)
  const measureKeys = useMemo(() => {
    return measures.map((m) => {
      if (m.alias) return m.alias;
      if (m.agg) return `${m.agg}_${m.column}`.replace("*", "all");
      return m.column;
    });
  }, [measures]);

  const primaryDim = dimensions.length > 0 ? dimensions[0] : "";
  const primaryMeasure = measureKeys.length > 0 ? measureKeys[0] : "";

  // Loading state
  if (isLoading) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center gap-3 bg-[#fbfbfb] rounded-2xl border border-[#ececec]"
        style={{ height }}
      >
        <div className="w-8 h-8 border-2 border-[#5d2a1a] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#777b86] font-normal">Running DuckDB Analytical Query...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="w-full p-6 flex flex-col items-center justify-center text-center bg-rose-50 rounded-2xl border border-rose-200 text-rose-800"
        style={{ height }}
      >
        <AlertCircle className="w-8 h-8 text-rose-600 mb-2" />
        <p className="text-xs font-semibold">Query Execution Error</p>
        <p className="text-[11px] text-rose-700/80 max-w-sm mt-1">{error}</p>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div
        className="w-full p-6 flex flex-col items-center justify-center text-center bg-[#fbfbfb] rounded-2xl border border-dashed border-[#dcdcdc] text-[#777b86]"
        style={{ height }}
      >
        <BarChart3 className="w-8 h-8 text-[#979799] mb-2" />
        <p className="text-xs font-semibold text-[#17191c]">No Data Available</p>
        <p className="text-[11px] text-[#777b86] max-w-xs mt-1">
          Configure valid dimensions and measures or adjust active filters to display visualization.
        </p>
      </div>
    );
  }

  // Light Elevated Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#ffffff] border border-[#ececec] p-3 rounded-xl shadow-xl text-xs z-50">
          {label && <p className="font-semibold text-[#17191c] mb-1.5 border-b border-[#ececec] pb-1">{label}</p>}
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-[#777b86]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || PALETTE[index % PALETTE.length] }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-medium text-[#17191c]">
                  {typeof entry.value === "number" ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // 1. KPI WIDGET (Warm Paper Card with Woody Sienna Accents)
  if (chartType === "kpi") {
    const rawVal = data[0]?.[primaryMeasure] ?? data[0]?.[Object.keys(data[0])[0]] ?? 0;
    const numVal = typeof rawVal === "number" ? rawVal : Number(rawVal) || 0;
    const prefix = config.prefix || "";
    const suffix = config.suffix || "";

    return (
      <div
        className="w-full flex flex-col items-center justify-center p-6 bg-[#ffffff] rounded-[24px] border border-[#ececec] shadow-artifact"
        style={{ height }}
      >
        <div className="flex items-center gap-1.5 mb-2 px-3 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] text-xs font-medium border border-[#5d2a1a]/20">
          <Sparkles className="w-3.5 h-3.5 text-[#5d2a1a]" />
          <span>{config.metricLabel || primaryMeasure.replace("_", " ")}</span>
        </div>
        <div className="text-4xl md:text-5xl font-serif font-normal tracking-tight text-[#17191c] flex items-baseline mt-2">
          {prefix && <span className="text-2xl text-[#5d2a1a] mr-1 font-serif">{prefix}</span>}
          <span>{numVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          {suffix && <span className="text-xl text-[#777b86] ml-1">{suffix}</span>}
        </div>
        {primaryDim && data.length > 1 && (
          <p className="text-xs text-[#777b86] mt-3 font-normal">
            Aggregated across <strong className="text-[#17191c] font-medium">{data.length}</strong> {primaryDim} records
          </p>
        )}
      </div>
    );
  }

  // 2. TABLE VIEW (Elevated Paper Table)
  if (chartType === "table") {
    const allCols = Object.keys(data[0] || {});
    return (
      <div className="w-full overflow-hidden rounded-[20px] border border-[#ececec] bg-[#ffffff] shadow-artifact" style={{ height }}>
        <div className="overflow-x-auto overflow-y-auto h-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#f2f2f3] sticky top-0 z-10 border-b border-[#ececec]">
              <tr>
                <th className="py-2.5 px-3 text-[#979799] font-mono text-center w-10 border-r border-[#ececec]">#</th>
                {allCols.map((c) => (
                  <th key={c} className="py-2.5 px-4 font-normal text-[#17191c] uppercase tracking-wider text-[11px] whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ececec] font-sans">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#f9f9fa] transition-colors">
                  <td className="py-2 px-3 text-[#979799] font-mono text-center border-r border-[#ececec]">{idx + 1}</td>
                  {allCols.map((c) => (
                    <td key={c} className="py-2 px-4 text-[#17191c] whitespace-nowrap">
                      {typeof row[c] === "number" ? row[c].toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(row[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 3. PIE / DONUT CHART
  if (chartType === "donut" || chartType === "pie") {
    const isDonut = chartType === "donut";
    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", color: "#777b86" }} />
            <Pie
              data={data}
              dataKey={primaryMeasure}
              nameKey={primaryDim || Object.keys(data[0])[0]}
              cx="50%"
              cy="48%"
              innerRadius={isDonut ? 55 : 0}
              outerRadius={85}
              paddingAngle={isDonut ? 3 : 1}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 4. SCATTER CHART
  if (chartType === "scatter") {
    const xKey = primaryDim || (measureKeys[0] || Object.keys(data[0])[0]);
    const yKey = measureKeys[1] || measureKeys[0] || Object.keys(data[0])[1];
    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 15, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ececec" opacity={0.8} />
            <XAxis
              dataKey={xKey}
              stroke="#979799"
              fontSize={11}
              tickLine={false}
              name={xKey}
            />
            <YAxis
              dataKey={yKey}
              stroke="#979799"
              fontSize={11}
              tickLine={false}
              name={yKey}
            />
            <ZAxis range={[60, 200]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", color: "#777b86" }} />
            <Scatter name={`${yKey} vs ${xKey}`} data={data} fill="#5d2a1a" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 5. AREA CHART
  if (chartType === "area") {
    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 15, right: 20, bottom: 20, left: 10 }}>
            <defs>
              {measureKeys.map((k, idx) => (
                <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PALETTE[idx % PALETTE.length]} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={PALETTE[idx % PALETTE.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ececec" opacity={0.8} />
            <XAxis dataKey={primaryDim} stroke="#979799" fontSize={11} tickLine={false} />
            <YAxis stroke="#979799" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", color: "#777b86" }} />
            {measureKeys.map((k, idx) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stroke={PALETTE[idx % PALETTE.length]}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#grad-${k})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 6. LINE CHART
  if (chartType === "line") {
    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 15, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ececec" opacity={0.8} />
            <XAxis dataKey={primaryDim} stroke="#979799" fontSize={11} tickLine={false} />
            <YAxis stroke="#979799" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", color: "#777b86" }} />
            {measureKeys.map((k, idx) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={PALETTE[idx % PALETTE.length]}
                strokeWidth={2.5}
                dot={{ r: 4, fill: PALETTE[idx % PALETTE.length], stroke: "#ffffff", strokeWidth: 1.5 }}
                activeDot={{ r: 6, stroke: "#17191c", strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 7. BAR CHART (Default)
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 15, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ececec" opacity={0.8} />
          <XAxis dataKey={primaryDim} stroke="#979799" fontSize={11} tickLine={false} />
          <YAxis stroke="#979799" fontSize={11} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", color: "#777b86" }} />
          {measureKeys.map((k, idx) => (
            <Bar
              key={k}
              dataKey={k}
              fill={PALETTE[idx % PALETTE.length]}
              radius={[6, 6, 0, 0]}
              maxBarSize={45}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
