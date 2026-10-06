from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.auth import UserRole

class UserSignupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)
    organization_name: str = Field(..., min_length=2, max_length=100)
    role: Optional[UserRole] = UserRole.ADMIN

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)

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

class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    created_at: datetime

    class Config:
        from_attributes = True

class CreateWorkspaceRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: str
    workspaces: list[WorkspaceResponse] = []

    class Config:
        from_attributes = True

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
    permissions: list[str]
