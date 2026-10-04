import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class ReportExportCSVRequest(BaseModel):
    dataset_id: Optional[uuid.UUID] = None
    dashboard_id: Optional[uuid.UUID] = None
    widget_id: Optional[uuid.UUID] = None
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    name: Optional[str] = None

class ReportExportPDFRequest(BaseModel):
    dashboard_id: uuid.UUID
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    name: Optional[str] = None

class ReportResponse(BaseModel):
    id: uuid.UUID
    workspace_id: Optional[uuid.UUID] = None
    dashboard_id: Optional[uuid.UUID] = None
    dataset_id: Optional[uuid.UUID] = None
    name: str
    format: str
    file_size_bytes: int = 0
    filters: Dict[str, Any] = Field(default_factory=dict)
    created_by: Optional[uuid.UUID] = None
    creator_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ReportScheduleCreate(BaseModel):
    dashboard_id: uuid.UUID
    name: str = "Weekly Executive Distribution"
    frequency: str = "weekly"  # daily, weekly, monthly
    format: str = "pdf"        # pdf, csv
    recipients: List[str] = Field(default_factory=list)

class ReportScheduleResponse(BaseModel):
    id: uuid.UUID
    workspace_id: Optional[uuid.UUID] = None
    dashboard_id: Optional[uuid.UUID] = None
    dashboard_title: Optional[str] = None
    name: str
    frequency: str
    format: str
    recipients: List[str] = Field(default_factory=list)
    status: str
    next_run_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
