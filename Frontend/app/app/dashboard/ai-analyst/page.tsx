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
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* Editorial Header with Warm Wood/Musky Accents */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#ececec]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#17191c] tracking-[-0.66px]">
              AI Analyst
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#5d2a1a]" />
              <span>Deterministic Real-Data Engine</span>
            </span>
          </div>
          <p className="text-sm text-[#777b86] max-w-2xl leading-relaxed">
            Ask natural-language business questions to generate structured, safe DuckDB queries and interactive charts.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Dataset Selector Pill */}
          <div className="flex items-center gap-2 bg-[#ffffff] border border-[#ececec] rounded-full px-4 py-2 shadow-sm">
            <Database className="w-4 h-4 text-[#5d2a1a] shrink-0" />
            <select
              className="bg-transparent text-xs text-[#17191c] font-medium focus:outline-none cursor-pointer"
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
                  <option key={ds.id} value={ds.id} className="bg-[#ffffff] text-[#17191c]">
                    {ds.name} ({ds.row_count.toLocaleString()} rows)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewAnalysis}
            className="px-4 py-2 rounded-full border border-[#ececec] bg-[#ffffff] hover:bg-[#f2f2f3] text-[#17191c] font-normal text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Start new analysis conversation"
          >
            <PlusCircle className="w-4 h-4 text-[#5d2a1a]" />
            <span>New Chat</span>
          </button>

          {/* Generate Full Dashboard Button */}
          {canGenerateDashboard && (
            <button
              id="ai-generate-dashboard-btn"
              onClick={handleGenerateDashboard}
              disabled={isGeneratingDashboard || !selectedDatasetId}
              className="px-5 py-2.5 rounded-full bg-[#17191c] hover:bg-black text-[#ffffff] font-normal text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingDashboard ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#ffffff]" />
              ) : (
                <LayoutDashboard className="w-4 h-4 text-[#ffffff]" />
              )}
              <span>{isGeneratingDashboard ? "Generating..." : "Generate AI Dashboard"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Generated Dashboard Success Toast/Banner */}
      {generatedDashboardInfo && (
        <div className="p-4 rounded-[20px] bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#5d2a1a]" />
            <span className="text-xs sm:text-sm font-medium">
              Dashboard <strong className="font-semibold">{generatedDashboardInfo.title}</strong> has been generated and persisted in PostgreSQL!
            </span>
          </div>
          <button
            onClick={() => router.push(`/dashboard/dashboards/${generatedDashboardInfo.id}`)}
            className="px-4 py-1.5 rounded-full bg-[#5d2a1a] text-[#fbe1d1] text-xs font-medium hover:opacity-90 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Conversational Stream (5 cols) */}
        <div className="lg:col-span-5 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex flex-col overflow-hidden h-[calc(100vh-14rem)] min-h-[600px]">
          {/* Header */}
          <div className="border-b border-[#ececec] px-5 py-3.5 bg-[#fafafb] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5d2a1a]" />
              <span className="text-xs font-medium uppercase tracking-wider text-[#17191c]">
                Analysis Conversation
              </span>
            </div>
            <span className="text-[11px] text-[#777b86] font-mono truncate max-w-[160px]">
              {selectedDataset ? selectedDataset.name : "Select Dataset"}
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#fbe1d1] flex items-center justify-center text-[#5d2a1a] shadow-xs">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-normal text-[#17191c]">
                    What would you like to uncover?
                  </h3>
                  <p className="text-xs text-[#777b86] mt-1 max-w-sm leading-relaxed">
                    {selectedDataset
                      ? `Querying "${selectedDataset.name}" (${selectedDataset.row_count.toLocaleString()} rows, ${selectedDataset.column_count} columns).`
                      : "Upload a dataset to begin conversation."}
                  </p>
                </div>

                {/* Suggested Prompts */}
                <div className="w-full space-y-2 pt-2">
                  <p className="text-[10px] font-normal uppercase tracking-wider text-[#979799] text-left">
                    Suggested analytical prompts:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {suggestedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left text-xs p-3 rounded-xl bg-[#fafafb] hover:bg-[#f2f2f3] border border-[#ececec] text-[#17191c] transition-all flex items-center justify-between group cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                      >
                        <span className="truncate">{prompt}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#979799] group-hover:text-[#5d2a1a] transition-colors flex-shrink-0" />
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
                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#17191c] text-[#ffffff] rounded-br-sm shadow-xs"
                        : "bg-[#fafafb] text-[#17191c] border border-[#ececec] rounded-bl-sm shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                    }`}
                  >
                    {/* Header for Assistant Messages */}
                    {msg.sender === "assistant" && (
                      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[#ececec] text-[11px] text-[#777b86]">
                        <span className="font-medium flex items-center gap-1.5 text-[#5d2a1a]">
                          <Cpu className="w-3.5 h-3.5" />
                          {msg.model_name || "Deterministic Semantic Engine"}
                        </span>
                        {msg.metrics?.execution_time_ms && (
                          <span className="flex items-center gap-1 font-mono text-[10px] text-[#979799]">
                            <Clock className="w-3 h-3" />
                            {msg.metrics.execution_time_ms}ms
                          </span>
                        )}
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Query Details Dropdown */}
                    {msg.query_plan && (
                      <div className="mt-2.5 pt-2 border-t border-[#ececec]">
                        <button
                          onClick={() =>
                            setExpandedQueryId(
                              expandedQueryId === msg.id ? null : msg.id
                            )
                          }
                          className="flex items-center gap-1 text-[11px] font-medium text-[#777b86] hover:text-[#17191c] transition-colors cursor-pointer"
                        >
                          <Code2 className="w-3.5 h-3.5 text-[#5d2a1a]" />
                          <span>Generated DuckDB Query Plan</span>
                          {expandedQueryId === msg.id ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>

                        {expandedQueryId === msg.id && (
                          <div className="mt-2 p-3 rounded-xl bg-[#ffffff] border border-[#ececec] font-mono text-[11px] overflow-x-auto space-y-1 shadow-inner">
                            <div className="text-[#979799]">
                              -- Target: {msg.query_plan.target_measure} ({msg.query_plan.aggregation}) | Dim: {msg.query_plan.dimension || "None"}
                            </div>
                            <pre className="text-[#17191c]">{msg.query_plan.sql}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Focus in Canvas Button */}
                    {msg.sender === "assistant" && msg.data && msg.data.length > 0 && (
                      <button
                        onClick={() => setActiveResult(msg)}
                        className="mt-2.5 px-3 py-1 rounded-full bg-[#fbe1d1] text-[#5d2a1a] border border-[#5d2a1a]/20 text-[11px] font-medium hover:bg-[#f7d5c0] flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
                      >
                        <BarChart3 className="w-3 h-3" />
                        <span>Display in Canvas</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-[#979799] mt-1 px-1 font-mono">
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
          <div className="p-3.5 border-t border-[#ececec] bg-[#ffffff] shrink-0">
            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-[#c5221f] mb-2 px-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
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
                className="flex-1 bg-[#fafafb] border border-[#ececec] rounded-full px-4 py-2.5 text-xs sm:text-sm text-[#17191c] placeholder:text-[#979799] focus:outline-none focus:border-[#5d2a1a] focus:bg-[#ffffff] transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isSending || !selectedDatasetId}
                className="w-10 h-10 rounded-full bg-[#17191c] text-[#ffffff] hover:bg-black disabled:opacity-40 transition-colors shadow-sm flex items-center justify-center shrink-0 cursor-pointer"
                title="Send query"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#ffffff]" />
                ) : (
                  <Send className="w-4 h-4 text-[#ffffff]" />
                )}
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-[#979799] uppercase tracking-wider mt-2 px-2">
              <span>Shift+Enter for multi-line</span>
              <span>100% Parameterized DuckDB SQL</span>
            </div>
          </div>
        </div>

        {/* Right Pane: Live Analytical Canvas (7 cols) */}
        <div className="lg:col-span-7 rounded-[20px] bg-[#ffffff] border border-[#ececec] shadow-artifact flex flex-col overflow-hidden h-[calc(100vh-14rem)] min-h-[600px]">
          {/* Canvas Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#ececec] bg-[#fafafb] shrink-0">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#5d2a1a]" />
              <span className="text-sm font-serif font-normal text-[#17191c]">
                {activeResult?.chart_config?.title || "Analytical Visualization Canvas"}
              </span>
            </div>

            {activeResult && activeResult.data && activeResult.data.length > 0 && (
              <div className="flex items-center gap-1 bg-[#f2f2f3] border border-[#ececec] rounded-full p-1">
                <button
                  onClick={() => setCanvasViewMode("chart")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    canvasViewMode === "chart"
                      ? "bg-[#ffffff] text-[#17191c] shadow-xs"
                      : "text-[#777b86] hover:text-[#17191c]"
                  }`}
                >
                  Chart
                </button>
                <button
                  onClick={() => setCanvasViewMode("table")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    canvasViewMode === "table"
                  ? "bg-[#ffffff] text-[#17191c] shadow-xs"
                  : "text-[#777b86] hover:text-[#17191c]"
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setCanvasViewMode("query")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    canvasViewMode === "query"
                  ? "bg-[#ffffff] text-[#17191c] shadow-xs"
                  : "text-[#777b86] hover:text-[#17191c]"
                  }`}
                >
                  SQL
                </button>
              </div>
            )}
          </div>

          {/* Canvas Body */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col">
            {!activeResult ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#f2f2f3] flex items-center justify-center text-[#777b86]">
                  <BarChart3 className="w-8 h-8 text-[#5d2a1a]" />
                </div>
                <h3 className="font-serif text-xl font-normal text-[#17191c]">
                  Live Canvas Awaiting Query
                </h3>
                <p className="text-xs text-[#777b86] max-w-sm leading-relaxed">
                  Send a question in the chat panel to see real-time chart projections, KPI cards, and dimensional breakdowns computed by DuckDB.
                </p>
                {selectedDataset && (
                  <div className="mt-4 p-4 rounded-[16px] bg-[#fafafb] border border-[#ececec] text-left text-xs max-w-md w-full space-y-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="font-medium text-[#17191c] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#5d2a1a]" />
                      <span>{selectedDataset.name} Schema Profile</span>
                    </div>
                    <div className="text-[11px] text-[#777b86] leading-relaxed">
                      Columns: {selectedDataset.columns?.map((c) => c.name).join(", ") || "Loading..."}
                    </div>
                  </div>
                )}
              </div>
            ) : isSending ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#5d2a1a] animate-spin" />
                <p className="text-sm font-medium text-[#17191c]">Executing DuckDB analytical pipeline...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-[16px] bg-[#fafafb] border border-[#ececec]">
                    <span className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">Rows Analyzed</span>
                    <p className="text-xl font-serif font-normal text-[#17191c] mt-0.5">
                      {(activeResult.metrics?.row_count ?? activeResult.data?.length ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-[16px] bg-[#fafafb] border border-[#ececec]">
                    <span className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">DuckDB Latency</span>
                    <p className="text-xl font-serif font-normal text-[#5d2a1a] mt-0.5">
                      {activeResult.metrics?.execution_time_ms ?? 0} ms
                    </p>
                  </div>
                  <div className="p-4 rounded-[16px] bg-[#fafafb] border border-[#ececec] col-span-2 md:col-span-1">
                    <span className="text-[11px] font-normal uppercase tracking-wider text-[#979799]">Aggregated Value</span>
                    <p className="text-xl font-serif font-normal text-[#17191c] mt-0.5">
                      {activeResult.metrics?.total_value !== undefined
                        ? activeResult.metrics.total_value.toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* View Mode: Chart */}
                {canvasViewMode === "chart" && (
                  <div className="flex-1 min-h-[340px] flex items-center justify-center bg-[#ffffff] rounded-[16px] border border-[#ececec] p-4 shadow-xs">
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
                      <div className="text-center text-sm text-[#777b86]">
                        No visualization records found for this query.
                      </div>
                    )}
                  </div>
                )}

                {/* View Mode: Table */}
                {canvasViewMode === "table" && (
                  <div className="flex-1 overflow-x-auto rounded-[16px] border border-[#ececec] shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#fafafb] text-[#777b86] uppercase text-[10px] tracking-wider border-b border-[#ececec]">
                        <tr>
                          {Object.keys(activeResult.data?.[0] || {}).map((col) => (
                            <th key={col} className="px-4 py-2.5 font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ececec]">
                        {activeResult.data?.map((row, i) => (
                          <tr key={i} className="hover:bg-[#fafafb] transition-colors">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-4 py-2 text-[#17191c] font-mono">
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
                  <div className="flex-1 p-4 rounded-[16px] bg-[#fafafb] border border-[#ececec] font-mono text-xs overflow-x-auto space-y-2 shadow-inner">
                    <div className="text-[#979799] text-[11px]">
                      -- Safe parameterized query executed over read_csv_auto in DuckDB memory
                    </div>
                    <pre className="text-[#17191c] leading-relaxed">
                      {activeResult.query_plan?.sql || "-- No SQL statement available"}
                    </pre>
                  </div>
                )}

                {/* Narrative Summary Callout */}
                <div className="p-4 rounded-[16px] bg-[#fbe1d1] border border-[#5d2a1a]/20 text-xs space-y-1 shadow-xs">
                  <div className="flex items-center gap-1.5 font-medium text-[#5d2a1a]">
                    <Lightbulb className="w-4 h-4 text-[#5d2a1a]" />
                    <span>Executive Takeaway</span>
                  </div>
                  <p className="text-[#5d2a1a]/90 leading-relaxed">
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
