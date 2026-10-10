import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import User, Workspace
from app.schemas.intelligence import (
    AIChatRequest,
    AIChatResponse,
    AIConversationResponse,
    AIConversationDetailResponse,
    GenerateDashboardRequest,
    GenerateDashboardResponse,
)
from app.services.auth_service import (
    get_current_user,
    get_current_workspace,
    require_permission,
)
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Intelligence"])

@router.post("/chat", response_model=AIChatResponse)
async def ai_analyst_chat(
    request: AIChatRequest,
    current_user: User = Depends(require_permission("ai:analyst")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await AIService.chat(
        db=db,
        request=request,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.post("/generate-dashboard", response_model=GenerateDashboardResponse, status_code=status.HTTP_201_CREATED)
async def ai_generate_dashboard(
    request: GenerateDashboardRequest,
    current_user: User = Depends(require_permission("ai:generate_dashboard")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await AIService.generate_dashboard(
        db=db,
        request=request,
        workspace_id=current_workspace.id,
        user=current_user,
    )

@router.get("/conversations", response_model=List[AIConversationResponse])
async def list_ai_conversations(
    current_user: User = Depends(require_permission("ai:analyst")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await AIService.list_conversations(
        db=db,
        workspace_id=current_workspace.id,
        user_id=current_user.id,
    )

@router.get("/conversations/{conversation_id}", response_model=AIConversationDetailResponse)
async def get_ai_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(require_permission("ai:analyst")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await AIService.get_conversation(
        db=db,
        conversation_id=conversation_id,
        workspace_id=current_workspace.id,
        user_id=current_user.id,
    )

@router.delete("/conversations/{conversation_id}")
async def delete_ai_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(require_permission("ai:analyst")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await AIService.delete_conversation(
        db=db,
        conversation_id=conversation_id,
        workspace_id=current_workspace.id,
        user_id=current_user.id,
    )
