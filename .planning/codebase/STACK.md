# Technology Stack — RicozViz

## Runtime Environments
- **Python**: 3.12 (Virtualenv: `Backend/.venv/Scripts/python.exe`)
- **Node.js**: v20+ / npm v10+
- **Database Engine**: PostgreSQL 18 (`Database/data`, port 5432)
- **Analytical Query Engine**: DuckDB 1.1+ (in-process columnar OLAP for high-speed CSV/Parquet aggregates)

## Backend Stack
- **Framework**: FastAPI (Async ASGI framework)
- **ORM / Database Driver**: SQLAlchemy 2.0+ with `psycopg2-binary`
- **Security & Cryptography**:
  - `python-jose` for JWT validation & signing (HS256)
  - `passlib[bcrypt]` for secure password hashing with truncation checks
  - `secrets` for cryptographic random share tokens (192-bit)
- **Data Processing**:
  - `pandas` & `duckdb` for tabular operations and SQL-on-files
  - `pydantic` v2 for strict request/response data validation and serialization
- **AI & LLM Services**:
  - Google Gemini API (`google-generativeai`) with parameter-safe fallback queries and schema introspection

## Frontend Stack
- **Framework**: Next.js 15+ (App Router architecture)
- **Language**: TypeScript 5.x
- **UI & Styling**:
  - Vanilla Tailwind CSS with custom HSL design tokens
  - `lucide-react` for enterprise icon systems
  - Glassmorphic card styling, dynamic dark-mode surfaces
- **Data Visualization**:
  - Recharts for responsive SVG/Canvas interactive charts
  - Custom KPI Metric cards with delta indicators and sparklines
- **State Management**:
  - React Context (`AuthContext`, `WorkspaceContext`)
  - React Query / Native Fetch client for backend API communication

## Infrastructure & Testing
- **E2E Testing**: Playwright (Chromium headless/headed)
- **Integration Testing**: Python `requests` & `pytest` harnesses
- **Dev Servers**:
  - FastAPI: `uvicorn app.main:app --port 8000`
  - Next.js: `next dev --turbopack --port 3000`
