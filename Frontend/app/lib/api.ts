export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: "Viewer" | "Explorer" | "Analyst" | "Publisher" | "Admin";
  is_active: boolean;
  created_at: string;
  organization_id: string;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  plan: string;
  workspaces: WorkspaceResponse[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  email: string;
  full_name: string;
  role: "Viewer" | "Explorer" | "Analyst" | "Publisher" | "Admin";
  organization_id: string;
  organization_name: string;
  workspace_id: string;
  workspace_name: string;
}

export interface AuthMeResponse {
  user: UserResponse;
  organization: OrganizationResponse;
  workspace: WorkspaceResponse;
  permissions: string[];
}

export interface HealthResponse {
  status: string;
  project: string;
  version: string;
  database: string;
}

// Day 3 Dataset Interfaces
export interface DatasetColumn {
  id: string;
  dataset_id: string;
  name: string;
  display_name?: string;
  data_type: "string" | "integer" | "float" | "datetime" | "boolean";
  is_dimension: boolean;
  is_measure: boolean;
  sample_values: any[];
}

export interface Dataset {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  row_count: number;
  column_count: number;
  file_path?: string;
  file_name?: string;
  file_size_bytes?: number;
  source_type?: string;
  status: string;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
  columns?: DatasetColumn[];
}

export interface DatasetPreview {
  dataset_id: string;
  name: string;
  total_rows: number;
  preview_count: number;
  columns: DatasetColumn[];
  rows: Record<string, any>[];
}

export interface MeasureSpec {
  column: string;
  agg: "sum" | "avg" | "min" | "max" | "count";
  alias?: string;
}

export interface FilterSpec {
  column: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in" | "contains";
  value: any;
}

export interface SortSpec {
  column: string;
  direction?: "asc" | "desc";
}

export interface AggregateQueryRequest {
  dataset_id: string;
  dimensions?: string[];
  measures?: MeasureSpec[];
  filters?: FilterSpec[];
  sort?: SortSpec[];
  limit?: number;
}

export interface AggregateQueryResponse {
  dataset_id: string;
  row_count: number;
  columns: string[];
  data: Record<string, any>[];
  execution_time_ms: number;
}

// Day 4 Dashboard & Visualization Interfaces
export type ChartType = "line" | "bar" | "area" | "donut" | "pie" | "scatter" | "kpi" | "table";

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  dataset_id?: string;
  title: string;
  chart_type: ChartType;
  dimensions: string[];
  measures: MeasureSpec[];
  filters: FilterSpec[];
  sort?: SortSpec[];
  limit?: number;
  config: Record<string, any>;
  position: Record<string, any>;
  created_at: string;
}

export interface DashboardFilter {
  id: string;
  dashboard_id: string;
  column_name: string;
  filter_type: "select" | "multiselect" | "date_range" | "text" | string;
  default_value?: any;
  created_at: string;
}

// Day 5 Sharing, Governance & Export Interfaces
export interface DashboardShare {
  id: string;
  dashboard_id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  shared_with_email?: string;
  role?: string;
  permission: "view" | "edit" | string;
  created_at: string;
}

export interface ShareLinkResponse {
  share_token: string;
  share_url: string;
  is_published: boolean;
}

export interface Dashboard {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  layout: Record<string, any>;
  is_published: boolean;
  published_at?: string;
  share_token?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  widget_count: number;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  shares?: DashboardShare[];
}

export interface Report {
  id: string;
  workspace_id?: string;
  dashboard_id?: string;
  dataset_id?: string;
  name: string;
  format: "pdf" | "csv" | string;
  file_size_bytes: number;
  filters: Record<string, any>;
  created_by?: string;
  creator_name?: string;
  created_at: string;
}

export interface ReportSchedule {
  id: string;
  workspace_id?: string;
  dashboard_id?: string;
  dashboard_title?: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly" | string;
  format: "pdf" | "csv" | string;
  recipients: string[];
  status: "active" | "paused" | string;
  next_run_at?: string;
  created_at: string;
}

export interface GovernanceUser {
  id: string;
  full_name: string;
  email: string;
  role: "Viewer" | "Explorer" | "Analyst" | "Publisher" | "Admin";
  is_active: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  workspace_id?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface GovernanceOverview {
  total_users: number;
  users_by_role: Record<string, number>;
  total_datasets: number;
  total_dashboards: number;
  published_dashboards: number;
  total_audit_logs: number;
  security_posture: string;
}

export interface RolePermissionInfo {
  role: string;
  permissions: string[];
  description: string;
}

// Day 6 AI & Intelligence Interfaces
export interface AIChatRequest {
  dataset_id: string;
  conversation_id?: string;
  message: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  sender: "user" | "assistant";
  text: string;
  generated_query?: Record<string, any>;
  chart_config?: Record<string, any>;
  metrics?: Record<string, any>;
  created_at: string;
}

export interface AIConversation {
  id: string;
  title: string;
  dataset_id?: string;
  dataset_name?: string;
  created_at: string;
  messages_count: number;
}

export interface AIConversationDetail {
  id: string;
  title: string;
  dataset_id?: string;
  dataset_name?: string;
  created_at: string;
  messages: AIMessage[];
}

export interface AIChatResponse {
  conversation_id: string;
  user_message_id: string;
  assistant_message_id: string;
  reply: string;
  mode: "fallback" | "llm" | string;
  model_name: string;
  query_plan?: Record<string, any>;
  chart_config?: Record<string, any>;
  metrics?: Record<string, any>;
  columns_used: string[];
  data: Record<string, any>[];
  created_at: string;
}

export interface GenerateDashboardRequest {
  dataset_id: string;
  prompt?: string;
  title?: string;
}

export interface GenerateDashboardResponse {
  dashboard_id: string;
  title: string;
  description?: string;
  widgets_count: number;
  widgets: Record<string, any>[];
  message: string;
}

export interface DetectiveAnalyzeRequest {
  dataset_id: string;
  metric: string;
  dimension: string;
  agg?: "sum" | "avg" | "count";
  comparison_mode?: "auto" | "period" | "slice";
  date_column?: string;
  baseline_val?: string;
  current_val?: string;
}

export interface ContributorItem {
  dimension_value: string;
  baseline_value: number;
  current_value: number;
  variance: number;
  contribution_pct: number;
  impact: "positive" | "negative" | "neutral";
}

export interface WaterfallItem {
  label: string;
  value: number;
  change: number;
  is_total: boolean;
  contribution_pct?: number;
}

export interface DetectiveAnalyzeResponse {
  dataset_id: string;
  metric: string;
  dimension: string;
  baseline_label: string;
  current_label: string;
  baseline_total: number;
  current_total: number;
  variance_abs: number;
  variance_pct: number;
  top_driver?: string;
  top_detractor?: string;
  contributors: ContributorItem[];
  waterfall: WaterfallItem[];
  explanation: string;
  execution_time_ms: number;
}

export interface PulseInsight {
  id: string;
  workspace_id: string;
  dataset_id?: string;
  dataset_name?: string;
  severity: "critical" | "warning" | "info" | string;
  metric_name: string;
  change_percentage: number;
  current_value: number;
  previous_value: number;
  dimension_affected?: string;
  dimension_value?: string;
  explanation: string;
  recommended_action: string;
  investigation_link?: string;
  created_at: string;
}

export interface PulseGenerateResponse {
  generated_count: number;
  insights: PulseInsight[];
  message: string;
}


class ApiClient {
  private getAuthHeaders(isFormData: boolean = false): HeadersInit {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("ricozviz_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = {
      ...this.getAuthHeaders(isFormData),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) {
          localStorage.removeItem("ricozviz_token");
          localStorage.removeItem("ricozviz_user");
          window.location.href = "/auth/login?expired=true";
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.detail || `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        throw new Error("Unable to connect to the RicozViz backend. Ensure the backend server is running on port 8000.");
      }
      throw err;
    }
  }

  // Health
  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health");
  }

  // Auth endpoints
  async login(credentials: { email: string; password: string }): Promise<TokenResponse> {
    return this.request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async signup(data: {
    full_name: string;
    email: string;
    password: string;
    organization_name: string;
    role?: string;
  }): Promise<TokenResponse> {
    return this.request<TokenResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<AuthMeResponse> {
    return this.request<AuthMeResponse>("/auth/me");
  }

  async logout(): Promise<{ message: string }> {
    return this.request<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  }

  async createWorkspace(name: string): Promise<WorkspaceResponse> {
    return this.request<WorkspaceResponse>("/auth/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  // Day 3 Datasets endpoints
  async listDatasets(): Promise<Dataset[]> {
    return this.request<Dataset[]>("/datasets");
  }

  async getDataset(id: string): Promise<Dataset> {
    return this.request<Dataset>(`/datasets/${id}`);
  }

  async uploadDataset(formData: FormData): Promise<Dataset> {
    return this.request<Dataset>("/datasets/upload", {
      method: "POST",
      body: formData,
    });
  }

  async getDatasetPreview(id: string, limit: number = 25): Promise<DatasetPreview> {
    return this.request<DatasetPreview>(`/datasets/${id}/preview?limit=${limit}`);
  }

  async deleteDataset(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/datasets/${id}`, {
      method: "DELETE",
    });
  }

  // Day 3 Analytical Query endpoint
  async executeAggregateQuery(query: AggregateQueryRequest): Promise<AggregateQueryResponse> {
    return this.request<AggregateQueryResponse>("/query/aggregate", {
      method: "POST",
      body: JSON.stringify(query),
    });
  }

  // Day 4 Dashboard & Visualization Studio endpoints
  async listDashboards(): Promise<Dashboard[]> {
    return this.request<Dashboard[]>("/dashboards");
  }

  async getDashboard(id: string): Promise<Dashboard> {
    return this.request<Dashboard>(`/dashboards/${id}`);
  }

  async createDashboard(data: {
    title: string;
    description?: string;
    layout?: Record<string, any>;
    is_published?: boolean;
    widgets?: Partial<DashboardWidget>[];
  }): Promise<Dashboard> {
    return this.request<Dashboard>("/dashboards", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDashboard(
    id: string,
    data: {
      title?: string;
      description?: string;
      layout?: Record<string, any>;
      is_published?: boolean;
    }
  ): Promise<Dashboard> {
    return this.request<Dashboard>(`/dashboards/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteDashboard(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/dashboards/${id}`, {
      method: "DELETE",
    });
  }

  async addWidget(
    dashboardId: string,
    widget: {
      dataset_id?: string;
      title: string;
      chart_type: string;
      dimensions?: string[];
      measures?: MeasureSpec[];
      filters?: FilterSpec[];
      sort?: SortSpec[];
      limit?: number;
      config?: Record<string, any>;
      position?: Record<string, any>;
    }
  ): Promise<DashboardWidget> {
    const payload = {
      ...widget,
      config: {
        ...(widget.config || {}),
        limit: widget.limit,
        sort: widget.sort,
      },
    };
    return this.request<DashboardWidget>(`/dashboards/${dashboardId}/widgets`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateWidget(
    dashboardId: string,
    widgetId: string,
    widget: Partial<DashboardWidget>
  ): Promise<DashboardWidget> {
    return this.request<DashboardWidget>(`/dashboards/${dashboardId}/widgets/${widgetId}`, {
      method: "PUT",
      body: JSON.stringify(widget),
    });
  }

  async deleteWidget(dashboardId: string, widgetId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/dashboards/${dashboardId}/widgets/${widgetId}`, {
      method: "DELETE",
    });
  }

  async addDashboardFilter(
    dashboardId: string,
    filter: {
      column_name: string;
      filter_type?: string;
      default_value?: any;
    }
  ): Promise<DashboardFilter> {
    return this.request<DashboardFilter>(`/dashboards/${dashboardId}/filters`, {
      method: "POST",
      body: JSON.stringify(filter),
    });
  }

  async deleteDashboardFilter(dashboardId: string, filterId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/dashboards/${dashboardId}/filters/${filterId}`, {
      method: "DELETE",
    });
  }

  // Day 5 Dashboard Publishing & Sharing Endpoints
  async publishDashboard(id: string): Promise<Dashboard> {
    return this.request<Dashboard>(`/dashboards/${id}/publish`, {
      method: "POST",
    });
  }

  async unpublishDashboard(id: string): Promise<Dashboard> {
    return this.request<Dashboard>(`/dashboards/${id}/unpublish`, {
      method: "POST",
    });
  }

  async getDashboardShareLink(id: string): Promise<ShareLinkResponse> {
    return this.request<ShareLinkResponse>(`/dashboards/${id}/share-link`);
  }

  async listDashboardShares(id: string): Promise<DashboardShare[]> {
    return this.request<DashboardShare[]>(`/dashboards/${id}/shares`);
  }

  async addDashboardShare(
    id: string,
    data: {
      user_id?: string;
      shared_with_email?: string;
      role?: string;
      permission?: string;
    }
  ): Promise<DashboardShare> {
    return this.request<DashboardShare>(`/dashboards/${id}/shares`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteDashboardShare(id: string, shareId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/dashboards/${id}/shares/${shareId}`, {
      method: "DELETE",
    });
  }

  async getSharedDashboard(shareToken: string): Promise<Dashboard> {
    return this.request<Dashboard>(`/dashboards/shared/${shareToken}`);
  }

  // Day 5 Export Centre & Reports Endpoints
  async exportCSV(data: {
    dataset_id?: string;
    dashboard_id?: string;
    widget_id?: string;
    filters?: Record<string, any>;
    name?: string;
  }): Promise<Blob> {
    const url = `${API_BASE_URL}/reports/export/csv`;
    const token = typeof window !== "undefined" ? localStorage.getItem("ricozviz_token") : null;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "CSV export failed");
    }
    return await response.blob();
  }

  async exportPDF(data: {
    dashboard_id: string;
    filters?: Record<string, any>;
    name?: string;
  }): Promise<Blob> {
    const url = `${API_BASE_URL}/reports/export/pdf`;
    const token = typeof window !== "undefined" ? localStorage.getItem("ricozviz_token") : null;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "PDF report generation failed");
    }
    return await response.blob();
  }

  async listReports(): Promise<Report[]> {
    return this.request<Report[]>("/reports");
  }

  async downloadReport(id: string): Promise<Blob> {
    const url = `${API_BASE_URL}/reports/${id}/download`;
    const token = typeof window !== "undefined" ? localStorage.getItem("ricozviz_token") : null;
    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Download failed");
    }
    return await response.blob();
  }

  async deleteReport(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/reports/${id}`, {
      method: "DELETE",
    });
  }

  async listReportSchedules(): Promise<ReportSchedule[]> {
    return this.request<ReportSchedule[]>("/reports/schedules/all");
  }

  async createReportSchedule(data: {
    dashboard_id: string;
    name: string;
    frequency: string;
    format: string;
    recipients: string[];
  }): Promise<ReportSchedule> {
    return this.request<ReportSchedule>("/reports/schedules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteReportSchedule(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/reports/schedules/${id}`, {
      method: "DELETE",
    });
  }

  // Day 5 Governance & Audit Trail Endpoints
  async getGovernanceOverview(): Promise<GovernanceOverview> {
    return this.request<GovernanceOverview>("/governance/overview");
  }

  async listGovernanceUsers(): Promise<GovernanceUser[]> {
    return this.request<GovernanceUser[]>("/governance/users");
  }

  async inviteUser(data: {
    full_name: string;
    email: string;
    password: string;
    role: string;
  }): Promise<GovernanceUser> {
    return this.request<GovernanceUser>("/governance/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateUserRole(userId: string, role: string): Promise<GovernanceUser> {
    return this.request<GovernanceUser>(`/governance/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<GovernanceUser> {
    return this.request<GovernanceUser>(`/governance/users/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/governance/users/${userId}`, {
      method: "DELETE",
    });
  }

  async getRoleDefinitions(): Promise<RolePermissionInfo[]> {
    return this.request<RolePermissionInfo[]>("/governance/roles");
  }

  async listAuditLogs(params?: {
    action?: string;
    resource_type?: string;
    user_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const q = new URLSearchParams();
    if (params?.action) q.append("action", params.action);
    if (params?.resource_type) q.append("resource_type", params.resource_type);
    if (params?.user_id) q.append("user_id", params.user_id);
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.offset) q.append("offset", params.offset.toString());
    const queryStr = q.toString() ? `?${q.toString()}` : "";
    return this.request<AuditLog[]>(`/governance/audit-logs${queryStr}`);
  }

  // Day 6 AI Intelligence Endpoints
  async aiChat(data: AIChatRequest): Promise<AIChatResponse> {
    return this.request<AIChatResponse>("/ai/chat", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async generateAIDashboard(data: GenerateDashboardRequest): Promise<GenerateDashboardResponse> {
    return this.request<GenerateDashboardResponse>("/ai/generate-dashboard", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listAIConversations(): Promise<AIConversation[]> {
    return this.request<AIConversation[]>("/ai/conversations");
  }

  async getAIConversation(id: string): Promise<AIConversationDetail> {
    return this.request<AIConversationDetail>(`/ai/conversations/${id}`);
  }

  async deleteAIConversation(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/ai/conversations/${id}`, {
      method: "DELETE",
    });
  }

  async analyzeDetective(data: DetectiveAnalyzeRequest): Promise<DetectiveAnalyzeResponse> {
    return this.request<DetectiveAnalyzeResponse>("/detective/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async generatePulseInsights(datasetId?: string): Promise<PulseGenerateResponse> {
    return this.request<PulseGenerateResponse>("/pulse/generate", {
      method: "POST",
      body: JSON.stringify(datasetId ? { dataset_id: datasetId } : {}),
    });
  }

  async listPulseInsights(severity?: string, datasetId?: string): Promise<PulseInsight[]> {
    const q = new URLSearchParams();
    if (severity) q.append("severity", severity);
    if (datasetId) q.append("dataset_id", datasetId);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return this.request<PulseInsight[]>(`/pulse${qs}`);
  }
}

export function downloadBlob(blob: Blob, defaultFilename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
  }, 1000);
}

export const api = new ApiClient();
