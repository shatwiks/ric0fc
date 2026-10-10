import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import User, Workspace
from app.schemas.intelligence import (
    PulseGenerateRequest,
    PulseGenerateResponse,
    PulseInsightResponse,
)
from app.services.auth_service import require_permission, get_current_workspace
from app.services.pulse_service import PulseService

router = APIRouter(prefix="/pulse", tags=["RicozPulse"])

@router.post("/generate", response_model=PulseGenerateResponse)
async def generate_pulse_insights(
    request: Optional[PulseGenerateRequest] = None,
    current_user: User = Depends(require_permission("ai:analyst")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    ds_id = request.dataset_id if request else None
    return await PulseService.generate_insights(
        db=db,
        workspace_id=current_workspace.id,
        user=current_user,
        dataset_id=ds_id,
    )

@router.get("", response_model=List[PulseInsightResponse])
async def list_pulse_insights(
    severity: Optional[str] = Query(None),
    dataset_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(require_permission("view:pulse")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await PulseService.list_insights(
        db=db,
        workspace_id=current_workspace.id,
        severity=severity,
        dataset_id=dataset_id,
    )
