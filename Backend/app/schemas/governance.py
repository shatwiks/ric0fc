import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, EmailStr, Field
from app.models.auth import UserRole

class UserGovernanceResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserRoleUpdateRequest(BaseModel):
    role: UserRole

class UserStatusUpdateRequest(BaseModel):
    is_active: bool

class UserInviteRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    role: UserRole = UserRole.VIEWER

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    workspace_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GovernanceOverviewResponse(BaseModel):
    total_users: int
    users_by_role: Dict[str, int]
    total_datasets: int
    total_dashboards: int
    published_dashboards: int
    total_audit_logs: int
    security_posture: str = "Enterprise Governed"

class RolePermissionInfo(BaseModel):
    role: str
    permissions: List[str]
    description: str
