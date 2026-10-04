from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import User
from app.schemas.dataset import AggregateQueryRequest, AggregateQueryResponse
from app.services.auth_service import get_current_user
from app.services.query_service import QueryService

router = APIRouter(prefix="/query", tags=["Analytics & Query Engine"])

@router.post("/aggregate", response_model=AggregateQueryResponse)
async def execute_aggregate_query(
    request: AggregateQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    primary_workspace = current_user.organization.workspaces[0] if current_user.organization.workspaces else None
    if not primary_workspace:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active workspace found for user organization.",
        )

    return await QueryService.execute_aggregate_query(
        db=db,
        request=request,
        workspace_id=primary_workspace.id,
        user=current_user,
    )
