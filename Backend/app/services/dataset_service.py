import os
import re
import uuid
import duckdb
import datetime
import decimal
import math
import logging
from typing import Optional, List, Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.auth import User
from app.models.data import Dataset, DatasetColumn
from app.schemas.dataset import DatasetResponse, DatasetColumnResponse, DatasetPreviewResponse
from app.services.audit_service import log_audit_event

logger = logging.getLogger(__name__)

def serialize_sample_value(val):
    """Recursively converts DuckDB / Python objects to JSON-serializable primitives for PostgreSQL JSONB."""
    if val is None:
        return None
    if isinstance(val, (datetime.date, datetime.datetime, datetime.time)):
        return val.isoformat()
    if isinstance(val, decimal.Decimal):
        return float(val)
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
        return val
    if isinstance(val, (int, str, bool)):
        return val
    if hasattr(val, "item"):  # numpy / duckdb scalar
        try:
            return serialize_sample_value(val.item())
        except Exception:
            pass
    return str(val)

def sanitize_error_message(err: Exception) -> str:
    """Sanitizes server-side exception details to protect against internal information leakage."""
    msg = str(err)

    if "Object of type" in msg and "is not JSON serializable" in msg:
        return "Data formatting error: one or more column values could not be serialized."
    if "CSV does not contain any valid columns" in msg:
        return "CSV file does not contain any valid columns or headers."
    if "is empty (0 bytes)" in msg:
        return "Uploaded CSV file is empty (0 bytes)."
    if "exceeds maximum allowed size" in msg:
        return "Uploaded file exceeds the maximum allowed size of 50 MB."
    if "Invalid file format" in msg:
        return "Invalid file format. Only CSV (.csv) files are supported."

    # Strip SQL query dumps and parameters
    if "[SQL:" in msg:
        msg = msg.split("[SQL:")[0].strip()

    # Strip filesystem paths (both Windows and Unix)
    msg = re.sub(r'[A-Za-z]:[\\/][^\s\'"]+', '[file]', msg)
    msg = re.sub(r'/[a-zA-Z0-9_\.\-]+/[a-zA-Z0-9_\.\-]+[^\s\'"]*', '[file]', msg)

    # Strip parameter dumps and UUIDs
    msg = re.sub(r'UUID\([^\)]+\)', '[id]', msg)
    msg = re.sub(r'0x[0-9a-fA-F]+', '', msg)
    msg = re.sub(r'\[parameters:[^\]]*\]', '', msg, flags=re.DOTALL)

    # Strip database connection details & internal exception types
    msg = re.sub(r'postgresql(\+[a-z]+)?://[^\s]+', '[db_connection]', msg)
    msg = re.sub(r'asyncpg\.exceptions\.[A-Za-z]+', 'DatabaseError', msg)
    msg = re.sub(r'sqlalchemy\.[A-Za-z\.]+', 'DatabaseError', msg)

    # Clean whitespace
    msg = " ".join(msg.split())
    if not msg or len(msg) > 180 or "Traceback" in msg:
        return "Failed to parse CSV file: Invalid formatting or corrupted rows."

    return msg

def sanitize_filename(filename: str) -> str:
    base = os.path.basename(filename)
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', base)
    return clean[:100] or "data.csv"

def map_duckdb_type(dtype: str) -> Tuple[str, bool, bool]:
    """Maps DuckDB data type to platform type, is_dimension, is_measure."""
    dtype_upper = dtype.upper()
    if any(k in dtype_upper for k in ["INT", "BIGINT", "SMALLINT", "TINYINT", "HUGEINT"]):
        return "integer", False, True
    if any(k in dtype_upper for k in ["DOUBLE", "FLOAT", "DECIMAL", "NUMERIC", "REAL"]):
        return "float", False, True
    if any(k in dtype_upper for k in ["DATE", "TIME", "TIMESTAMP"]):
        return "datetime", True, False
    if "BOOL" in dtype_upper:
        return "boolean", True, False
    return "string", True, False

class DatasetService:
    @staticmethod
    async def create_from_csv(
        db: AsyncSession,
        file: UploadFile,
        user: User,
        workspace_id: uuid.UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> DatasetResponse:
        # 1. Validation
        if not file.filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file uploaded.")
        
        if not file.filename.lower().endswith(".csv"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Only CSV (.csv) files are supported.",
            )

        sanitized = sanitize_filename(file.filename)
        dataset_name = (name or os.path.splitext(sanitized)[0]).strip()
        if not dataset_name:
            dataset_name = "Enterprise Dataset"

        # Unique file path segregated by tenant organization and workspace
        unique_filename = f"{uuid.uuid4().hex}_{sanitized}"
        tenant_dir = os.path.join(settings.UPLOAD_DIR, str(user.organization_id), str(workspace_id))
        os.makedirs(tenant_dir, exist_ok=True)
        dest_path = os.path.join(tenant_dir, unique_filename)

        # 2. Write file to disk with size check
        total_size = 0
        max_size = 50 * 1024 * 1024  # 50 MB
        try:
            with open(dest_path, "wb") as f:
                while chunk := await file.read(1024 * 1024):
                    total_size += len(chunk)
                    if total_size > max_size:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File exceeds maximum allowed size of 50 MB.",
                        )
                    f.write(chunk)
        except Exception as e:
            if os.path.exists(dest_path):
                os.remove(dest_path)
            if isinstance(e, HTTPException):
                raise e
            logger.exception("Failed to write uploaded file: %s", e)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to store uploaded file on server.")

        if total_size == 0:
            if os.path.exists(dest_path):
                os.remove(dest_path)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded CSV file is empty (0 bytes).")

        # 3. DuckDB Inspection & Schema Inference
        con = None
        try:
            con = duckdb.connect(":memory:")
            # Validate DuckDB can parse CSV
            normalized_path = dest_path.replace("\\", "/")
            describe_query = f"DESCRIBE SELECT * FROM read_csv_auto('{normalized_path}', sample_size=2048)"
            col_info = con.execute(describe_query).fetchall()
            
            if not col_info or any("\x00" in str(c[0]) for c in col_info):
                if os.path.exists(dest_path):
                    os.remove(dest_path)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV does not contain any valid columns or readable headers.")

            # Calculate row count
            count_query = f"SELECT COUNT(*) FROM read_csv_auto('{normalized_path}')"
            row_count = con.execute(count_query).fetchone()[0]

            # 4. Construct Dataset & Column Models
            dataset = Dataset(
                workspace_id=workspace_id,
                name=dataset_name,
                description=description,
                row_count=row_count,
                file_path=dest_path,
                file_name=sanitized,
                file_size_bytes=total_size,
                status="ready",
                created_by=user.id,
            )
            db.add(dataset)
            await db.flush()

            # Inspect sample values for each column
            columns_created = []
            for col_idx, (col_name, col_type, null_val, key_val, def_val, extra) in enumerate(col_info, start=1):
                clean_col_name = str(col_name).replace("\x00", "").strip()[:255]
                if not clean_col_name:
                    clean_col_name = f"column_{col_idx}"
                display_name = clean_col_name.replace("_", " ").title()[:255]
                platform_type, is_dim, is_meas = map_duckdb_type(col_type)

                # Get up to 5 sample values using the original DuckDB column identifier
                try:
                    escaped_name = str(col_name).replace('"', '""')
                    samples_query = f'SELECT DISTINCT "{escaped_name}" FROM read_csv_auto(\'{normalized_path}\') WHERE "{escaped_name}" IS NOT NULL LIMIT 5'
                    sample_rows = con.execute(samples_query).fetchall()
                    sample_vals = [serialize_sample_value(r[0]) for r in sample_rows]
                except Exception as ex:
                    logger.warning("Failed to extract sample values for column %s: %s", clean_col_name, ex)
                    sample_vals = []

                column = DatasetColumn(
                    dataset_id=dataset.id,
                    name=clean_col_name,
                    display_name=display_name,
                    data_type=platform_type,
                    is_dimension=is_dim,
                    is_measure=is_meas,
                    sample_values=sample_vals,
                )
                db.add(column)
                columns_created.append(column)

            await db.commit()

            # 5. Audit Logging
            await log_audit_event(
                db=db,
                action="dataset:upload",
                resource_type="dataset",
                resource_id=str(dataset.id),
                user_id=user.id,
                workspace_id=workspace_id,
                details={
                    "name": dataset.name,
                    "filename": sanitized,
                    "row_count": dataset.row_count,
                    "columns": len(columns_created),
                },
            )

            # Return response
            return DatasetResponse(
                id=dataset.id,
                workspace_id=dataset.workspace_id,
                name=dataset.name,
                description=dataset.description,
                row_count=dataset.row_count,
                file_path=dataset.file_path,
                file_name=dataset.file_name,
                file_size_bytes=dataset.file_size_bytes,
                status=dataset.status,
                is_sample=dataset.is_sample,
                created_at=dataset.created_at,
                updated_at=dataset.updated_at,
                column_count=len(columns_created),
                columns=[DatasetColumnResponse.model_validate(c) for c in columns_created],
            )
        except Exception as e:
            if os.path.exists(dest_path):
                os.remove(dest_path)
            if isinstance(e, HTTPException):
                raise e
            logger.exception("Failed to parse and ingest CSV: %s", e)
            safe_msg = sanitize_error_message(e)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse and ingest CSV: {safe_msg}",
            )
        finally:
            if con:
                con.close()

    @staticmethod
    async def list_datasets(db: AsyncSession, workspace_id: uuid.UUID) -> List[DatasetResponse]:
        stmt = (
            select(Dataset)
            .where(Dataset.workspace_id == workspace_id)
            .options(selectinload(Dataset.columns))
            .order_by(Dataset.created_at.desc())
        )
        result = await db.execute(stmt)
        datasets = result.scalars().all()
        
        responses = []
        for ds in datasets:
            res = DatasetResponse.model_validate(ds)
            res.column_count = len(ds.columns)
            responses.append(res)
        return responses

    @staticmethod
    async def get_dataset(db: AsyncSession, dataset_id: uuid.UUID, workspace_id: uuid.UUID) -> Dataset:
        stmt = (
            select(Dataset)
            .where(Dataset.id == dataset_id)
            .options(selectinload(Dataset.columns))
        )
        result = await db.execute(stmt)
        dataset = result.scalar_one_or_none()
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found.",
            )
        if dataset.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Dataset belongs to another organization or workspace.",
            )
        return dataset

    @staticmethod
    async def get_preview(
        db: AsyncSession,
        dataset_id: uuid.UUID,
        workspace_id: uuid.UUID,
        limit: int = 25,
    ) -> DatasetPreviewResponse:
        dataset = await DatasetService.get_dataset(db, dataset_id, workspace_id)
        if not dataset.file_path or not os.path.exists(dataset.file_path):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset file not found on storage.")

        con = duckdb.connect(":memory:")
        try:
            normalized_path = dataset.file_path.replace("\\", "/")
            preview_query = f"SELECT * FROM read_csv_auto('{normalized_path}') LIMIT {max(1, min(limit, 100))}"
            cursor = con.execute(preview_query)
            col_names = [d[0] for d in cursor.description]
            raw_rows = cursor.fetchall()

            rows = []
            for r in raw_rows:
                row_dict = {}
                for col_name, val in zip(col_names, r):
                    if val is None:
                        row_dict[col_name] = ""
                    else:
                        s_val = serialize_sample_value(val)
                        row_dict[col_name] = "" if s_val is None else s_val
                rows.append(row_dict)

            col_responses = [DatasetColumnResponse.model_validate(c) for c in dataset.columns]
            return DatasetPreviewResponse(
                dataset_id=dataset.id,
                name=dataset.name,
                total_rows=dataset.row_count,
                preview_count=len(rows),
                columns=col_responses,
                rows=rows,
            )
        finally:
            con.close()

    @staticmethod
    async def delete_dataset(db: AsyncSession, dataset_id: uuid.UUID, workspace_id: uuid.UUID, user: User) -> dict:
        dataset = await DatasetService.get_dataset(db, dataset_id, workspace_id)
        
        # Remove physical file
        if dataset.file_path and os.path.exists(dataset.file_path):
            try:
                os.remove(dataset.file_path)
            except Exception:
                pass

        await db.delete(dataset)
        await db.commit()

        await log_audit_event(
            db=db,
            action="dataset:delete",
            resource_type="dataset",
            resource_id=str(dataset_id),
            user_id=user.id,
            workspace_id=workspace_id,
            details={"name": dataset.name},
        )
        return {"message": f"Dataset '{dataset.name}' deleted successfully."}
