"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Send,
  Database,
  Layers,
  ChevronDown,
  ChevronRight,
  Code2,
  Clock,
  BarChart3,
  Table as TableIcon,
  RefreshCw,
  PlusCircle,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Cpu,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import {
  api,
  Dataset,
  AIChatResponse,
  AIConversation,
  AIMessage,
  ChartType,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import ChartRenderer from "@/components/visualisations/ChartRenderer";

interface ChatMessageDisplay {
  id: string;
  sender: "user" | "assistant";
  text: string;
  mode?: string;
  model_name?: string;
  query_plan?: Record<string, any>;
  chart_config?: Record<string, any>;
  metrics?: Record<string, any>;
  data?: Record<string, any>[];
  columns_used?: string[];
  created_at: string;
}

export default function AIAnalystPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canGenerateDashboard = user?.role === "Admin" || user?.role === "Publisher" || user?.role === "Analyst";

  // Datasets state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [isLoadingDatasets, setIsLoadingDatasets] = useState<boolean>(true);

  // Chat & Conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDisplay[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected Result for the Live Canvas
  const [activeResult, setActiveResult] = useState<ChatMessageDisplay | null>(null);
  const [canvasViewMode, setCanvasViewMode] = useState<"chart" | "table" | "query">("chart");
  const [expandedQueryId, setExpandedQueryId] = useState<string | null>(null);

  // Dashboard Generation Modal
  const [isGeneratingDashboard, setIsGeneratingDashboard] = useState<boolean>(false);
  const [generatedDashboardInfo, setGeneratedDashboardInfo] = useState<{ id: string; title: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load datasets on mount
  useEffect(() => {
    async function loadDatasets() {
      setIsLoadingDatasets(true);
      try {
        const list = await api.listDatasets();
        setDatasets(list);
        if (list.length > 0) {
          setSelectedDatasetId(list[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load datasets:", err);
      } finally {
        setIsLoadingDatasets(false);
      }
    }
    loadDatasets();
  }, []);

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  // Suggested questions based on selected dataset
  const suggestedPrompts = [
    `Total sales by category`,
    `Top 5 segments by revenue`,
    `Average transaction amount`,
    `What is the overall count of records?`,
    `Show monthly performance breakdown`,
  ];

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || !selectedDatasetId || isSending) return;

    setInputPrompt("");
    setErrorMessage(null);
    setIsSending(true);

    const userMsgId = "user-" + Date.now();
    const userMsg: ChatMessageDisplay = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const response: AIChatResponse = await api.aiChat({
        dataset_id: selectedDatasetId,
        conversation_id: conversationId || undefined,
        message: textToSend,
      });

      setConversationId(response.conversation_id);

      const asstMsg: ChatMessageDisplay = {
        id: response.assistant_message_id,
        sender: "assistant",
        text: response.reply,
        mode: response.mode,
        model_name: response.model_name,
        query_plan: response.query_plan,
        chart_config: response.chart_config,
        metrics: response.metrics,
        data: response.data,
        columns_used: response.columns_used,
        created_at: response.created_at,
      };

      setMessages((prev) => [...prev, asstMsg]);
      setActiveResult(asstMsg);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process analytical query.");
      const errorMsg: ChatMessageDisplay = {
        id: "err-" + Date.now(),
        sender: "assistant",
        text: `Error executing query: ${err.message || "DuckDB query error"}. Please check your question or select another column.`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleNewAnalysis = () => {
    setConversationId(null);
    setMessages([]);
    setActiveResult(null);
    setErrorMessage(null);
  };

  const handleGenerateDashboard = async () => {
    if (!selectedDatasetId || isGeneratingDashboard) return;
    setIsGeneratingDashboard(true);
    setErrorMessage(null);
    try {
      const resp = await api.generateAIDashboard({
        dataset_id: selectedDatasetId,
      });
      setGeneratedDashboardInfo({
        id: resp.dashboard_id,
        title: resp.title,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate dashboard.");
    } finally {
      setIsGeneratingDashboard(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto w-full">
      {/* Top Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Ricoz AI Analyst
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Deterministic Real-Data Engine
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Ask natural-language business questions to generate structured, safe DuckDB queries and interactive charts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Dataset Selector */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
            <Database className="w-4 h-4 text-muted-foreground" />
            <select
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
              value={selectedDatasetId}
              onChange={(e) => {
                setSelectedDatasetId(e.target.value);
                handleNewAnalysis();
              }}
              disabled={isLoadingDatasets || isSending}
            >
              {datasets.length === 0 ? (
                <option value="">No Datasets Available</option>
              ) : (
                datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.row_count} rows)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewAnalysis}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-medium text-foreground bg-card hover:bg-muted border border-border rounded-lg transition-colors"
            title="Start new analysis conversation"
          >
            <PlusCircle className="w-4 h-4 text-muted-foreground" />
            <span>New Chat</span>
          </button>

          {/* Generate Full Dashboard Button */}
          {canGenerateDashboard && (
            <button
              id="ai-generate-dashboard-btn"
              onClick={handleGenerateDashboard}
              disabled={isGeneratingDashboard || !selectedDatasetId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isGeneratingDashboard ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <LayoutDashboard className="w-4 h-4" />
              )}
              <span>{isGeneratingDashboard ? "Generating..." : "Generate AI Dashboard"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Generated Dashboard Success Toast/Banner */}
      {generatedDashboardInfo && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">
              Dashboard <strong>{generatedDashboardInfo.title}</strong> has been generated and persisted in PostgreSQL!
            </span>
          </div>
          <button
            onClick={() => router.push(`/dashboard/dashboards/${generatedDashboardInfo.id}`)}
            className="flex items-center gap-1 text-sm font-semibold underline underline-offset-4 hover:opacity-80"
          >
            Open Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Pane: Chat Stream (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden h-full">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-base">
                    What would you like to uncover?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {selectedDataset
                      ? `Querying "${selectedDataset.name}" (${selectedDataset.row_count} rows, ${selectedDataset.column_count} columns).`
                      : "Upload a dataset to begin conversation."}
                  </p>
                </div>

                {/* Suggested Prompts */}
                <div className="w-full space-y-2 pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">
                    Suggested analytical prompts:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {suggestedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left text-xs p-2 rounded-lg bg-muted/60 hover:bg-muted border border-border/50 text-foreground transition-all flex items-center justify-between group"
                      >
                        <span className="truncate">{prompt}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted/70 text-foreground border border-border/60 rounded-bl-none"
                    }`}
                  >
                    {/* Header for Assistant Messages */}
                    {msg.sender === "assistant" && (
                      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-border/40 text-[11px] text-muted-foreground">
                        <span className="font-semibold flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Cpu className="w-3.5 h-3.5" />
                          {msg.model_name || "Deterministic Semantic Engine"}
                        </span>
                        {msg.metrics?.execution_time_ms && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {msg.metrics.execution_time_ms}ms
                          </span>
                        )}
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Query Details Dropdown */}
                    {msg.query_plan && (
                      <div className="mt-2.5 pt-2 border-t border-border/40">
                        <button
                          onClick={() =>
                            setExpandedQueryId(
                              expandedQueryId === msg.id ? null : msg.id
                            )
                          }
                          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>Generated DuckDB Query Plan</span>
                          {expandedQueryId === msg.id ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>

                        {expandedQueryId === msg.id && (
                          <div className="mt-2 p-2.5 rounded bg-background/80 border border-border/60 font-mono text-[11px] overflow-x-auto space-y-1">
                            <div className="text-muted-foreground">
                              -- Target: {msg.query_plan.target_measure} ({msg.query_plan.aggregation}) | Dim: {msg.query_plan.dimension || "None"}
                            </div>
                            <pre className="text-foreground">{msg.query_plan.sql}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Focus in Canvas Button */}
                    {msg.sender === "assistant" && msg.data && msg.data.length > 0 && (
                      <button
                        onClick={() => setActiveResult(msg)}
                        className="mt-2 text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <BarChart3 className="w-3 h-3" />
                        <span>Display in Canvas</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Composer Input */}
          <div className="p-3 border-t border-border bg-card">
            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-destructive mb-2 px-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask e.g. 'Show total revenue by category'..."
                disabled={isSending || !selectedDatasetId}
                className="flex-1 bg-muted/50 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isSending || !selectedDatasetId}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 px-1">
              <span>Shift+Enter for multi-line</span>
              <span>100% Parameterized DuckDB SQL</span>
            </div>
          </div>
        </div>

        {/* Right Pane: Live Analytical Canvas (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden h-full">
          {/* Canvas Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {activeResult?.chart_config?.title || "Analytical Visualization Canvas"}
              </span>
            </div>

            {activeResult && activeResult.data && activeResult.data.length > 0 && (
              <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5">
                <button
                  onClick={() => setCanvasViewMode("chart")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    canvasViewMode === "chart"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Chart
                </button>
                <button
                  onClick={() => setCanvasViewMode("table")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    canvasViewMode === "table"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setCanvasViewMode("query")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    canvasViewMode === "query"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  SQL
                </button>
              </div>
            )}
          </div>

          {/* Canvas Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {!activeResult ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-foreground text-base">
                  Live Canvas Awaiting Query
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Send a question in the chat panel to see real-time chart projections, KPI cards, and dimensional breakdowns computed by DuckDB.
                </p>
                {selectedDataset && (
                  <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/50 text-left text-xs max-w-md w-full space-y-1.5">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-primary" />
                      <span>{selectedDataset.name} Schema Profile</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Columns: {selectedDataset.columns?.map((c) => c.name).join(", ") || "Loading..."}
                    </div>
                  </div>
                )}
              </div>
            ) : isSending ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-medium text-foreground">Executing DuckDB analytical pipeline...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-[11px] font-medium text-muted-foreground">Rows Analyzed</span>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {activeResult.metrics?.row_count ?? activeResult.data?.length ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-[11px] font-medium text-muted-foreground">DuckDB Latency</span>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {activeResult.metrics?.execution_time_ms ?? 0} ms
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 col-span-2 md:col-span-1">
                    <span className="text-[11px] font-medium text-muted-foreground">Aggregated Value</span>
                    <p className="text-lg font-bold text-primary mt-0.5">
                      {activeResult.metrics?.total_value !== undefined
                        ? activeResult.metrics.total_value.toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* View Mode: Chart */}
                {canvasViewMode === "chart" && (
                  <div className="flex-1 min-h-[340px] flex items-center justify-center bg-card rounded-xl border border-border/60 p-4">
                    {activeResult.data && activeResult.data.length > 0 ? (
                      <ChartRenderer
                        chartType={(activeResult.chart_config?.chart_type as ChartType) || "bar"}
                        data={activeResult.data}
                        dimensions={
                          activeResult.chart_config?.x_axis
                            ? [activeResult.chart_config.x_axis]
                            : ["dimension"]
                        }
                        measures={[
                          {
                            column: activeResult.chart_config?.y_axis || "value",
                            alias:
                              Object.keys(activeResult.data[0] || {}).find(
                                (k) => k !== "dimension" && k !== (activeResult.chart_config?.x_axis || "")
                              ) || "value",
                          },
                        ]}
                        config={activeResult.chart_config || {}}
                        height={340}
                      />
                    ) : (
                      <div className="text-center text-sm text-muted-foreground">
                        No visualization records found for this query.
                      </div>
                    )}
                  </div>
                )}

                {/* View Mode: Table */}
                {canvasViewMode === "table" && (
                  <div className="flex-1 overflow-x-auto rounded-xl border border-border/60">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                        <tr>
                          {Object.keys(activeResult.data?.[0] || {}).map((col) => (
                            <th key={col} className="px-4 py-2.5 font-semibold">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {activeResult.data?.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition-colors">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-4 py-2 text-foreground font-mono">
                                {typeof val === "number" ? val.toLocaleString() : String(val ?? "-")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* View Mode: Query SQL */}
                {canvasViewMode === "query" && (
                  <div className="flex-1 p-4 rounded-xl bg-background border border-border/60 font-mono text-xs overflow-x-auto space-y-2">
                    <div className="text-muted-foreground text-[11px]">
                      -- Safe parameterized query executed over read_csv_auto in DuckDB memory
                    </div>
                    <pre className="text-foreground leading-relaxed">
                      {activeResult.query_plan?.sql || "-- No SQL statement available"}
                    </pre>
                  </div>
                )}

                {/* Narrative Summary Callout */}
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Executive Takeaway</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {activeResult.text}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
