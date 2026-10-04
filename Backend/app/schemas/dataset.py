import uuid
from datetime import datetime
from typing import List, Optional, Any, Literal
from pydantic import BaseModel, Field

class DatasetColumnResponse(BaseModel):
    id: uuid.UUID
    dataset_id: uuid.UUID
    name: str
    display_name: Optional[str] = None
    data_type: str
    is_dimension: bool
    is_measure: bool
    sample_values: List[Any] = []

    class Config:
        from_attributes = True

class DatasetResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: Optional[str] = None
    row_count: int
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    source_type: str = "csv"
    status: str = "ready"
    is_sample: bool = False
    created_at: datetime
    updated_at: datetime
    column_count: int = 0
    columns: List[DatasetColumnResponse] = []

    class Config:
        from_attributes = True

class DatasetPreviewResponse(BaseModel):
    dataset_id: uuid.UUID
    name: str
    total_rows: int
    preview_count: int
    columns: List[DatasetColumnResponse]
    rows: List[dict]

# Analytical Query Models
class MeasureSpec(BaseModel):
    column: str
    agg: Literal["sum", "avg", "min", "max", "count"]
    alias: Optional[str] = None

class FilterSpec(BaseModel):
    column: str
    operator: Literal["eq", "ne", "gt", "gte", "lt", "lte", "in", "not_in", "contains"]
    value: Any

class SortSpec(BaseModel):
    column: str
    direction: Literal["asc", "desc"] = "asc"

class AggregateQueryRequest(BaseModel):
    dataset_id: uuid.UUID
    dimensions: List[str] = Field(default_factory=list)
    measures: List[MeasureSpec] = Field(default_factory=list)
    filters: List[FilterSpec] = Field(default_factory=list)
    sort: List[SortSpec] = Field(default_factory=list)
    limit: int = 500

class AggregateQueryResponse(BaseModel):
    dataset_id: uuid.UUID
    row_count: int
    columns: List[str]
    data: List[dict]
    execution_time_ms: float
