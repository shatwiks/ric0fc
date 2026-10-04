# Technical Concerns & Hardening Notes — RicozViz

## Security Posture (Audited & Hardened)
- **Authentication**: JWT signature verification with strict HS256 algorithm enforcement. Deactivated user token validation blocks revoked accounts immediately.
- **SQL & DuckDB Injection**: High-risk injection vectors previously identified in CSV exports and widget queries have been parameterized or checked against column allowlists. Continuous regression tests (`Backend/test_security.py`) ensure zero regressions.
- **Path Traversal**: File upload paths and report downloads strictly confined to `settings.UPLOAD_DIR` using `os.path.commonpath`.
- **RBAC**: Server-side permission dependencies enforced on all routes. Frontend UI buttons dynamically hide/disable actions based on user permissions.

## Scalability & Performance Considerations
1. **DuckDB In-Memory vs Disk**:
   - DuckDB currently runs embedded per-process. For ultra-large datasets (>10GB), partitioned Parquet files on NVMe or external distributed query engines (ClickHouse/Trino) can be introduced.
2. **PostgreSQL Connection Pool**:
   - Monitored to avoid pool exhaustion under concurrent API usage. Default pool size set to 10 with max overflow 20.
3. **Frontend Bundle & Chart Optimization**:
   - Large dashboards with 20+ charts should employ virtualized scrolling or deferred chart rendering to maintain 60 FPS UI responsiveness.
