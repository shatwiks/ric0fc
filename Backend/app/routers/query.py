from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import User, Workspace
from app.schemas.dataset import AggregateQueryRequest, AggregateQueryResponse
from app.services.auth_service import get_current_user, get_current_workspace
from app.services.query_service import QueryService

router = APIRouter(prefix="/query", tags=["Analytics & Query Engine"])

@router.post("/aggregate", response_model=AggregateQueryResponse)
async def execute_aggregate_query(
    request: AggregateQueryRequest,
    current_user: User = Depends(get_current_user),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await QueryService.execute_aggregate_query(
        db=db,
        request=request,
        workspace_id=current_workspace.id,
        user=current_user,
    )
