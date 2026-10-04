import uuid
from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class DashboardWidgetCreate(BaseModel):
    dataset_id: Optional[uuid.UUID] = None
    title: str = "New Visualization"
    chart_type: str = "bar"  # line, bar, area, donut, pie, scatter, kpi, table
    dimensions: List[str] = Field(default_factory=list)
    measures: List[Dict[str, Any]] = Field(default_factory=list)
    filters: List[Dict[str, Any]] = Field(default_factory=list)
    config: Dict[str, Any] = Field(default_factory=dict)
    position: Dict[str, Any] = Field(default_factory=dict)

class DashboardWidgetUpdate(BaseModel):
    dataset_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    chart_type: Optional[str] = None
    dimensions: Optional[List[str]] = None
    measures: Optional[List[Dict[str, Any]]] = None
    filters: Optional[List[Dict[str, Any]]] = None
    config: Optional[Dict[str, Any]] = None
    position: Optional[Dict[str, Any]] = None

class DashboardWidgetResponse(BaseModel):
    id: uuid.UUID
    dashboard_id: uuid.UUID
    dataset_id: Optional[uuid.UUID] = None
    title: str
    chart_type: str
    dimensions: List[str] = Field(default_factory=list)
    measures: List[Dict[str, Any]] = Field(default_factory=list)
    filters: List[Dict[str, Any]] = Field(default_factory=list)
    config: Dict[str, Any] = Field(default_factory=dict)
    position: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardFilterCreate(BaseModel):
    column_name: str
    filter_type: str = "select"  # select, multiselect, date_range, text
    default_value: Optional[Any] = None

class DashboardFilterResponse(BaseModel):
    id: uuid.UUID
    dashboard_id: uuid.UUID
    column_name: str
    filter_type: str
    default_value: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    layout: Dict[str, Any] = Field(default_factory=dict)
    is_published: bool = False
    widgets: Optional[List[DashboardWidgetCreate]] = None

class DashboardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[Dict[str, Any]] = None
    is_published: Optional[bool] = None

class DashboardShareCreate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    shared_with_email: Optional[str] = None
    role: Optional[str] = None  # Viewer, Explorer, Analyst, Publisher, Admin
    permission: str = "view"    # view, edit

class DashboardShareResponse(BaseModel):
    id: uuid.UUID
    dashboard_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    shared_with_email: Optional[str] = None
    role: Optional[str] = None
    permission: str
    created_at: datetime

    class Config:
        from_attributes = True

class ShareLinkResponse(BaseModel):
    share_token: str
    share_url: str
    is_published: bool

class DashboardResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    title: str
    description: Optional[str] = None
    layout: Dict[str, Any] = Field(default_factory=dict)
    is_published: bool = False
    published_at: Optional[datetime] = None
    share_token: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    widget_count: int = 0
    widgets: List[DashboardWidgetResponse] = Field(default_factory=list)
    filters: List[DashboardFilterResponse] = Field(default_factory=list)
    shares: List[DashboardShareResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

