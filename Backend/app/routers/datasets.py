import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import User, Workspace
from app.schemas.dataset import DatasetResponse, DatasetPreviewResponse
from app.services.auth_service import get_current_user, get_current_workspace, require_permission
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.post("/upload", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def upload_csv(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(require_permission("create:datasets")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DatasetService.create_from_csv(
        db=db,
        file=file,
        user=current_user,
        workspace_id=current_workspace.id,
        name=name,
        description=description,
    )

@router.get("", response_model=List[DatasetResponse])
async def list_datasets(
    current_user: User = Depends(get_current_user),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DatasetService.list_datasets(db, current_workspace.id)

@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    dataset = await DatasetService.get_dataset(db, dataset_id, current_workspace.id)
    res = DatasetResponse.model_validate(dataset)
    res.column_count = len(dataset.columns)
    return res

@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
async def get_dataset_preview(
    dataset_id: uuid.UUID,
    limit: int = 25,
    current_user: User = Depends(get_current_user),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DatasetService.get_preview(db, dataset_id, current_workspace.id, limit=limit)

@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: uuid.UUID,
    current_user: User = Depends(require_permission("create:datasets")),
    current_workspace: Workspace = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await DatasetService.delete_dataset(db, dataset_id, current_workspace.id, current_user)
