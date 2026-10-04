import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- AI Analyst Schemas ---

class AIChatRequest(BaseModel):
    dataset_id: uuid.UUID
    conversation_id: Optional[uuid.UUID] = None
    message: str = Field(..., min_length=1, max_length=2000)

class AIMessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender: str
    text: str
    generated_query: Optional[Dict[str, Any]] = None
    chart_config: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AIConversationResponse(BaseModel):
    id: uuid.UUID
    title: str
    dataset_id: Optional[uuid.UUID] = None
    dataset_name: Optional[str] = None
    created_at: datetime
    messages_count: int = 0

    class Config:
        from_attributes = True

class AIConversationDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    dataset_id: Optional[uuid.UUID] = None
    dataset_name: Optional[str] = None
    created_at: datetime
    messages: List[AIMessageResponse] = []

    class Config:
        from_attributes = True

class AIChatResponse(BaseModel):
    conversation_id: uuid.UUID
    user_message_id: uuid.UUID
    assistant_message_id: uuid.UUID
    reply: str
    mode: str = "fallback"  # "fallback" or "llm"
    model_name: str = "Ricoz Deterministic Semantic Engine"
    query_plan: Optional[Dict[str, Any]] = None
    chart_config: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    columns_used: List[str] = []
    data: List[Dict[str, Any]] = []
    created_at: datetime

# --- AI Dashboard Generator Schemas ---

class GenerateDashboardRequest(BaseModel):
    dataset_id: uuid.UUID
    prompt: Optional[str] = None
    title: Optional[str] = None

class GenerateDashboardResponse(BaseModel):
    dashboard_id: uuid.UUID
    title: str
    description: Optional[str] = None
    widgets_count: int
    widgets: List[Dict[str, Any]]
    message: str

# --- Data Detective Schemas ---

class DetectiveAnalyzeRequest(BaseModel):
    dataset_id: uuid.UUID
    metric: str
    dimension: str
    agg: Optional[str] = "sum"
    comparison_mode: Optional[str] = "auto"  # "auto", "period", "slice"
    date_column: Optional[str] = None
    baseline_val: Optional[str] = None
    current_val: Optional[str] = None

class ContributorItem(BaseModel):
    dimension_value: str
    baseline_value: float
    current_value: float
    variance: float
    contribution_pct: float
    impact: str  # "positive", "negative", "neutral"

class WaterfallItem(BaseModel):
    label: str
    value: float
    change: float
    is_total: bool = False
    contribution_pct: Optional[float] = None

class DetectiveAnalyzeResponse(BaseModel):
    dataset_id: uuid.UUID
    metric: str
    dimension: str
    baseline_label: str
    current_label: str
    baseline_total: float
    current_total: float
    variance_abs: float
    variance_pct: float
    top_driver: Optional[str] = None
    top_detractor: Optional[str] = None
    contributors: List[ContributorItem]
    waterfall: List[WaterfallItem]
    explanation: str
    execution_time_ms: float

# --- RicozPulse Schemas ---

class PulseGenerateRequest(BaseModel):
    dataset_id: Optional[uuid.UUID] = None

class PulseInsightResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    dataset_id: Optional[uuid.UUID] = None
    dataset_name: Optional[str] = None
    severity: str  # "critical", "warning", "info"
    metric_name: str
    change_percentage: float
    current_value: float
    previous_value: float
    dimension_affected: Optional[str] = None
    dimension_value: Optional[str] = None
    explanation: str
    recommended_action: str
    investigation_link: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PulseGenerateResponse(BaseModel):
    generated_count: int
    insights: List[PulseInsightResponse]
    message: str
