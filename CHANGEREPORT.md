# Change Report

## 2026-11-22 07:10 IST — Pre-LinkedIn Production Security Hardening

### Objective
Harden public repository, API middleware, authentication, CORS, error handling, and CI workflow permissions prior to public LinkedIn sharing.

### Files Modified & Created
- `render.yaml` — Replaced wildcard `CORS_ORIGINS: "*"` with `https://ricozviz.vercel.app`, set `ENVIRONMENT=production`, `ENABLE_DOCS=false`, and explicit `SEED_DEMO_USERS`.
- `Backend/app/config.py` — Added `ENVIRONMENT`, `ENABLE_DOCS`, `SEED_DEMO_USERS`, and fail-closed production validator refusing weak/default `SECRET_KEY`.
- `Backend/app/main.py` — Disabled `/docs`, `/redoc`, `/openapi.json` in production unless `ENABLE_DOCS=true`, disabled `allow_credentials` if wildcard CORS is ever present, added per-IP auth rate limiting (`20 req/min`) on `/api/auth/login` & `/api/auth/signup`, added prod `HSTS`, and gated demo user seeding on `SEED_DEMO_USERS`.
- `Backend/app/services/report_service.py` — Enforced `UPLOAD_DIR` realpath confinement & single-quote escaping (`_safe_sql_storage_path`) on all DuckDB `read_csv_auto`/`COPY` queries, escaped ReportLab `Paragraph` XML with `html.escape`, and removed raw exception details from PDF output.
- `Frontend/app/vercel.json` — Added production HTTP security headers.
- `SECURITY.md` — Added responsible vulnerability disclosure policy.

### Verification Results
- `python -m py_compile Backend/app/config.py Backend/app/main.py Backend/app/services/report_service.py` (PASS), path-confinement assertions (PASS), `json.load(Frontend/app/vercel.json)` (PASS), `yaml.safe_load(render.yaml)` (PASS).
