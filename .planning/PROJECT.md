# RicozViz

## What This Is

RicozViz is an enterprise data visualization and exploration platform that enables analysts, business users, and executives to connect enterprise data, create interactive dashboards, explore data, discover AI-driven insights, and securely share governed analytics. It combines traditional business intelligence with AI-powered data analytics.

## Core Value

Enable users to connect, explore, and visualize complex datasets in sub-second query speeds with enterprise-grade multi-tenant security and zero SQL expertise required.

## Business Context

- **Customer**: Enterprise data analysts, business operators, and executive leadership.
- **Revenue Model**: B2B SaaS platform with tiered per-workspace and role-based licensing.
- **Success Metric**: Sub-second dashboard query latency, 100% tenant isolation, and high self-serve analytics adoption.

## Requirements

### Validated

- [x] Secure authentication with JWT, bcrypt password hashing, and brute-force audit logging.
- [x] Server-side Role-Based Access Control (Admin, Publisher, Analyst, Explorer, Viewer).
- [x] Multi-tenant isolation at Organization and Workspace boundaries with IDOR defense.
- [x] CSV dataset upload and PostgreSQL database connector integration.
- [x] Columnar high-speed query engine powered by DuckDB with parameterized query safety.
- [x] Interactive Visualization Studio with Line, Bar, Area, Pie, KPI, and Table charts.
- [x] Dashboard builder with customizable layouts, widget resizing, and cross-filtering.
- [x] Natural language AI query assistant with schema introspection and validated query execution.
- [x] Secure dashboard publishing and high-entropy share tokens (192-bit).
- [x] Governed user management and security audit logging.
- [x] Full Playwright E2E browser verification across all 12 platform pages with 0 console errors.

### Active

- [x] Hardened backend security posture (42/42 regression tests passing).
- [ ] Automated scheduled reports email delivery (SMTP integration).
- [ ] Additional external connectors (Snowflake, BigQuery, MySQL).
- [ ] Advanced anomaly detection alerts on live streaming data feeds.

### Out of Scope

- Direct arbitrary SQL terminal execution by unprivileged viewers — prevents query abuse and database injection.
- Plaintext secret storage — all tokens and credentials must be salted and hashed.

## Context

- Dual-storage architecture: PostgreSQL for transactional metadata, DuckDB for local analytics execution.
- App Router Next.js 15 frontend on port 3000, FastAPI backend on port 8000, PostgreSQL 18 on port 5432.
- Fully verified Day 1 through Day 7 milestones.

## Constraints

- Backend must strictly enforce all authorization rules; frontend UI visibility cannot be the sole gate.
- No unvalidated queries executed against underlying database engines.
