from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.auth import UserRole

class UserSignupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)
    organization_name: str = Field(..., min_length=2, max_length=100)
    company_size: Optional[str] = Field(None, max_length=50)
    industry: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = UserRole.ADMIN

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)

class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    created_at: datetime

    class Config:
        from_attributes = True

class CreateWorkspaceRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

class OrganizationSummary(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: str
    role: str
    company_size: Optional[str] = None
    industry: Optional[str] = None
    workspaces: List[WorkspaceResponse] = []

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: UUID
    email: str
    full_name: str
    role: str
    organization_id: UUID
    organization_name: str
    workspace_id: UUID
    workspace_name: str
    organizations: List[OrganizationSummary] = []

class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: str
    company_size: Optional[str] = None
    industry: Optional[str] = None
    workspaces: List[WorkspaceResponse] = []

    class Config:
        from_attributes = True

class OrganizationUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    company_size: Optional[str] = Field(None, max_length=50)
    industry: Optional[str] = Field(None, max_length=100)

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    organization_id: UUID

    class Config:
        from_attributes = True

class AuthMeResponse(BaseModel):
    user: UserResponse
    organization: OrganizationResponse
    workspace: WorkspaceResponse
    organizations: List[OrganizationSummary] = []
    permissions: List[str]

class SwitchContextRequest(BaseModel):
    organization_id: UUID
    workspace_id: Optional[UUID] = None

class OrganizationInvitationCreateRequest(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.ANALYST
    workspace_id: Optional[UUID] = None

class OrganizationInvitationResponse(BaseModel):
    id: UUID
    organization_id: UUID
    organization_name: str
    workspace_id: Optional[UUID] = None
    workspace_name: Optional[str] = None
    email: str
    role: str
    token: str
    status: str
    invited_by_name: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    invite_url: str

    class Config:
        from_attributes = True

class AcceptInvitationRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=72)

class InvitationPublicDetails(BaseModel):
    token: str
    email: str
    organization_name: str
    role: str
    invited_by_name: Optional[str] = None
    is_valid: bool
    expires_at: datetime

class OrganizationOverviewResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: str
    company_size: Optional[str] = None
    industry: Optional[str] = None
    workspaces: List[WorkspaceResponse] = []
    total_users: int = 0
    active_users: int = 0
    total_datasets: int = 0
    total_dashboards: int = 0
    total_reports: int = 0
    total_ai_conversations: int = 0
    total_pulse_insights: int = 0
    created_at: datetime
