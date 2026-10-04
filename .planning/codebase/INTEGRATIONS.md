# Integrations — RicozViz

## Data Source Connectors
1. **CSV / Delimited Files**:
   - Uploaded via FastAPI `multipart/form-data` endpoint.
   - Stored in confined `Backend/uploads/` directory with sanitize filename guards.
   - Queried via DuckDB native CSV reader with automatic type inference and indexing.
2. **PostgreSQL 18 Connector**:
   - Used both as metadata repository and analytical data source.
   - Connection pooling managed via SQLAlchemy session lifecycles.
3. **DuckDB In-Process OLAP**:
   - Columnar execution engine embedded in FastAPI worker threads.
   - Executes dynamic grouping, filtering, aggregations, and pagination for dashboard widgets.

## External Services & AI
1. **Google Gemini LLM (`google-generativeai`)**:
   - Generates natural language insights and SQL proposals from dataset schemas.
   - Strict output validation pipeline ensures queries match whitelist column names before DuckDB execution.
2. **Export & Report Engines**:
   - Server-side CSV streaming generator with filter injection protections.
   - Client-side and server-side PDF/PNG rasterization for dashboard distribution.
3. **Sharing System**:
   - Public token generator (`secrets.token_urlsafe(24)`) producing 192-bit unguessable share links for published dashboards.
