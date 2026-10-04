import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import User
from app.schemas.intelligence import (
    PulseGenerateRequest,
    PulseGenerateResponse,
    PulseInsightResponse,
)
from app.services.auth_service import require_permission
from app.services.pulse_service import PulseService

router = APIRouter(prefix="/pulse", tags=["RicozPulse"])

@router.post("/generate", response_model=PulseGenerateResponse)
async def generate_pulse_insights(
    request: Optional[PulseGenerateRequest] = None,
    current_user: User = Depends(require_permission("ai:analyst")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active workspace found for user organization.",
        )

    ds_id = request.dataset_id if request else None
    return await PulseService.generate_insights(
        db=db,
        workspace_id=primary_workspace.id,
        user=current_user,
        dataset_id=ds_id,
    )

@router.get("", response_model=List[PulseInsightResponse])
async def list_pulse_insights(
    severity: Optional[str] = Query(None),
    dataset_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(require_permission("view:pulse")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        return []

    return await PulseService.list_insights(
        db=db,
        workspace_id=primary_workspace.id,
        severity=severity,
        dataset_id=dataset_id,
    )
