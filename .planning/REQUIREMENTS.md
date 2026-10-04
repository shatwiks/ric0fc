# Requirements: RicozViz

**Defined:** 2026-10-05  
**Core Value:** Enable users to connect, explore, and visualize complex datasets in sub-second query speeds with enterprise-grade multi-tenant security and zero SQL expertise required.

## v1 Requirements

Requirements for initial release, fully mapped to validated milestones.

### Authentication & Authorization
- [x] **AUTH-01**: User can log in with email and password via JWT authentication.
- [x] **AUTH-02**: Passwords stored using bcrypt with constant-time verification and 72-char truncation defense.
- [x] **AUTH-03**: Deactivated users blocked immediately on subsequent API calls (403 Forbidden).
- [x] **AUTH-04**: Role-Based Access Control enforced server-side for Admin, Publisher, Analyst, Explorer, and Viewer.

### Data Management & Query Engine
- [x] **DATA-01**: User can upload CSV files with schema inference and safe file confinement.
- [x] **DATA-02**: In-process DuckDB executes analytical queries directly against datasets with parameterized filter values.
- [x] **DATA-03**: Multi-tenant dataset isolation prevents cross-tenant data leakage or preview.

### Visualization & Dashboards
- [x] **VIZ-01**: Visualization studio supports Line, Bar, Area, Pie, KPI, and Table charts.
- [x] **VIZ-02**: Dashboard builder supports draggable, resizable widget grids with interactive cross-filters.
- [x] **VIZ-03**: Dashboards can be published with 192-bit secure unguessable share tokens.

### AI Analyst
- [x] **AI-01**: Natural language queries converted to structured analytics through schema-aware LLM prompts.
- [x] **AI-02**: Generated queries validated against column whitelists before DuckDB execution.
- [x] **AI-03**: Conversation history isolated per user and tenant workspace.

### Governance & Security
- [x] **SEC-01**: Strict HTTP security headers injected on all responses (nosniff, DENY, Referrer-Policy).
- [x] **SEC-02**: Security audit log tracks administrative changes and failed authentication attempts.
- [x] **SEC-03**: Playwright E2E browser tests pass across all platform views with 0 console errors.

## v2 Requirements
- **CONN-01**: Cloud data connectors for Snowflake, BigQuery, and Databricks.
- **NOTIF-01**: Email and Slack webhook alerting for Pulse anomalies.
- **EXP-01**: Automated scheduled PDF/CSV report distribution via SMTP.

## Out of Scope
| Feature | Reason |
|---------|--------|
| Unsandboxed Raw SQL Queries | Prevents SQL injection and arbitrary database destruction |
| Plaintext Session Tokens | Violates enterprise security standards; all tokens must be cryptographically signed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01..04 | Phase 1 | Complete |
| DATA-01..03 | Phase 2 | Complete |
| VIZ-01..03  | Phase 3 | Complete |
| AI-01..03   | Phase 4 | Complete |
| SEC-01..03  | Phase 5 | Complete |
