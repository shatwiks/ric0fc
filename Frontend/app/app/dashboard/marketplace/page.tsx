"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Search,
  Database,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Compass,
} from "lucide-react";
import { api, Dataset } from "@/lib/api";

export default function MarketplacePage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDatasets() {
      setIsLoading(true);
      setError(null);
      try {
        const list = await api.listDatasets();
        setDatasets(list);
      } catch (err: any) {
        setError(err.message || "Failed to load marketplace datasets.");
      } finally {
        setIsLoading(false);
      }
    }
    loadDatasets();
  }, []);

  const filtered = datasets.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#ececec]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#17191c] tracking-[-0.66px]">
              Data Marketplace & Catalog
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Governed Enterprise Assets</span>
            </span>
          </div>
          <p className="text-sm text-[#777b86] max-w-2xl leading-relaxed mt-1">
            Discover verified organization datasets, inspect schemas, and launch one-click analytical explorations in DuckDB.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#979799] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog assets..."
            className="w-full pl-9 pr-4 py-2 bg-[#f8f8f9] border border-[#ececec] rounded-full text-xs sm:text-sm text-[#17191c] placeholder:text-[#979799] outline-none focus:border-[#17191c] transition-colors"
          />
        </div>
      </div>

      {/* Dataset Grid */}
      {isLoading ? (
        <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#5d2a1a] animate-spin" />
          <p className="text-sm font-medium text-[#777b86]">Loading data catalog assets...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#ffffff] border border-[#ececec] rounded-[24px] p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-artifact">
          <div className="w-14 h-14 rounded-2xl bg-[#f2f2f3] flex items-center justify-center text-[#777b86]">
            <Store className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-lg font-normal text-[#17191c]">No Datasets Match Your Query</h3>
          <p className="text-xs text-[#777b86] max-w-md">
            {datasets.length === 0
              ? "No datasets have been ingested yet. Upload your first CSV in the Datasets hub to populate the enterprise marketplace."
              : "Try adjusting your search keyword."}
          </p>
          <Link
            href="/dashboard/datasets"
            className="mt-2 px-5 py-2 rounded-full bg-[#17191c] text-white text-xs font-medium hover:bg-black transition-colors"
          >
            Go to Datasets Hub
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((ds) => (
            <div
              key={ds.id}
              className="bg-[#ffffff] border border-[#ececec] rounded-[24px] p-6 shadow-artifact hover:border-[#5d2a1a]/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 uppercase tracking-wider">
                    {ds.status || "Ready"}
                  </span>
                  <span className="text-[11px] text-[#979799] flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    {new Date(ds.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-serif font-normal text-[#17191c] tracking-tight">
                    {ds.name}
                  </h3>
                  <p className="text-xs text-[#777b86] line-clamp-2 mt-1">
                    {ds.description || "Production enterprise analytical dataset ready for DuckDB vectorized queries."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f2f2f3] text-xs">
                  <div className="p-2.5 rounded-xl bg-[#f8f8f9]">
                    <span className="text-[10px] uppercase text-[#979799] block font-semibold">Row Count</span>
                    <span className="font-mono font-bold text-[#17191c] text-sm">{ds.row_count.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#f8f8f9]">
                    <span className="text-[10px] uppercase text-[#979799] block font-semibold">Columns</span>
                    <span className="font-mono font-bold text-[#17191c] text-sm">{ds.column_count}</span>
                  </div>
                </div>

                {ds.columns && ds.columns.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#979799]">Schema Sample</span>
                    <div className="flex flex-wrap gap-1">
                      {ds.columns.slice(0, 5).map((c) => (
                        <span key={c.name} className="px-2 py-0.5 rounded-md bg-[#f2f2f3] text-[10px] font-mono text-[#555861]">
                          {c.name}
                        </span>
                      ))}
                      {ds.columns.length > 5 && (
                        <span className="text-[10px] text-[#979799] self-center">
                          +{ds.columns.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-[#f2f2f3] flex items-center justify-between text-xs">
                <Link
                  href={`/dashboard/ai-analyst`}
                  className="font-medium text-[#5d2a1a] hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Analyst</span>
                </Link>
                <Link
                  href={`/dashboard/explore`}
                  className="font-medium text-[#17191c] hover:underline flex items-center gap-1"
                >
                  <span>Explore in DuckDB</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
