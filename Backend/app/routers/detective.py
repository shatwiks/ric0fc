import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import User
from app.schemas.intelligence import DetectiveAnalyzeRequest, DetectiveAnalyzeResponse
from app.services.auth_service import require_permission
from app.services.detective_service import DetectiveService

router = APIRouter(prefix="/detective", tags=["Data Detective"])

@router.post("/analyze", response_model=DetectiveAnalyzeResponse)
async def analyze_variance(
    request: DetectiveAnalyzeRequest,
    current_user: User = Depends(require_permission("ai:detective")),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active workspace found for user organization.",
        )

    return await DetectiveService.analyze(
        db=db,
        request=request,
        workspace_id=primary_workspace.id,
        user=current_user,
    )
