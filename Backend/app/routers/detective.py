import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import User, Workspace
from app.schemas.intelligence import DetectiveAnalyzeRequest, DetectiveAnalyzeResponse
from app.services.auth_service import require_permission, get_current_workspace
from app.services.detective_service import DetectiveService

router = APIRouter(prefix="/detective", tags=["Data Detective"])

@router.post("/analyze", response_model=DetectiveAnalyzeResponse)
async def analyze_variance(
    request: DetectiveAnalyzeRequest,
    current_user: User = Depends(require_permission("ai:detective")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DetectiveService.analyze(
        db=db,
        request=request,
        workspace_id=current_workspace.id,
        user=current_user,
    )
