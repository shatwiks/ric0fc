# Architecture — RicozViz

## High-Level Topology
```
[Browser / Next.js Client] (Port 3000)
         │ HTTP / REST / Bearer JWT
         ▼
[FastAPI Backend Layer] (Port 8000)
    ├── Security & RBAC Middleware
    ├── Auth Router & Token Verifier
    ├── Workspaces & Tenancy Boundary Enforcer
    ├── Services Layer
    │     ├── DatasetService (CSV upload, schema discovery)
    │     ├── QueryEngine (DuckDB / SQL parser & safety validator)
    │     ├── DashboardService (Layouts, widgets, share tokens)
    │     ├── AIService (Gemini AI analyst & query synthesis)
    │     ├── GovernanceService (Roles, policies, audit logs)
    │     └── PulseService (KPI anomalies, executive digests)
    ▼
[Storage & Data Engines]
    ├── PostgreSQL 18: Metadata, users, orgs, workspaces, dashboards, audit logs
    └── DuckDB: Columnar OLAP execution directly on uploaded files / CSV partitions
```

## Multi-Tenant Isolation & Security Model
1. **Hierarchical Boundary**:
   - `Organization` → `Workspace` → `Resources` (Datasets, Dashboards, Widgets, Reports).
   - Every protected API route enforces both `workspace_id` matching and user membership.
2. **Server-Side RBAC Enforcement**:
   - Roles: `ADMIN`, `PUBLISHER`, `ANALYST`, `EXPLORER`, `VIEWER`.
   - Permissions resolved server-side on every request (e.g. `dashboards:write`, `export:csv`, `governance:admin`).
3. **Dual Storage Pattern**:
   - PostgreSQL stores relational metadata, authorization tables, and audit logs.
   - DuckDB handles high-performance analytical queries without exhausting database connections.
4. **AI Pipeline Isolation**:
   - Natural language queries from users undergo prompt sanitization and schema introspection.
   - Generated SQL/aggregations are strictly validated against an allowable column whitelist before execution.
