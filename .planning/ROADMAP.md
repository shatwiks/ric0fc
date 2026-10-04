# Roadmap: RicozViz

## Overview

RicozViz delivers an enterprise-grade analytics and visualization platform built with Next.js, FastAPI, PostgreSQL, and DuckDB. The roadmap spans initial foundation, data connectors, visualization studio, AI analytics, and enterprise security hardening.

## Phases

- [x] **Phase 1: Foundation & Authentication** - Multi-tenant PostgreSQL models, JWT authentication, and RBAC enforcement.
- [x] **Phase 2: Data Ingestion & DuckDB Query Engine** - CSV uploads, schema discovery, and parameterized OLAP queries.
- [x] **Phase 3: Visualization Studio & Dashboards** - Recharts components, draggable layout grids, and secure sharing.
- [x] **Phase 4: AI Analyst & Pulse Feed** - Natural language query pipeline, schema-safe execution, and anomaly feed.
- [x] **Phase 5: Security Audit & Hardening** - Comprehensive vulnerability remediation, injection defense, and Playwright E2E scans.
- [ ] **Phase 6: Cloud Connectors & Scheduled Distribution** - Snowflake, BigQuery, and automated report email delivery.

## Phase Details

### Phase 1: Foundation & Authentication
**Goal**: Establish PostgreSQL schema, organization/workspace tenancy, JWT sessions, and RBAC.
**Depends on**: Nothing (first phase)
**Requirements**: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]
**Success Criteria**:
  1. Users can authenticate with JWT tokens and bcrypt password verification.
  2. Role permissions (Admin, Publisher, Analyst, Explorer, Viewer) enforced server-side.
  3. Deactivated accounts immediately rejected across all endpoints.
**Plans**: 1 plan complete

### Phase 2: Data Ingestion & DuckDB Query Engine
**Goal**: Enable high-speed tabular ingestion and sub-second OLAP queries with DuckDB.
**Depends on**: Phase 1
**Requirements**: [DATA-01, DATA-02, DATA-03]
**Success Criteria**:
  1. CSV files securely uploaded and schema inferred automatically.
  2. Analytical queries executed through DuckDB with parameterized expressions.
  3. Tenant isolation guarantees zero cross-tenant dataset reads.
**Plans**: 1 plan complete

### Phase 3: Visualization Studio & Dashboards
**Goal**: Provide interactive drag-and-drop dashboard editing, multi-chart rendering, and sharing.
**Depends on**: Phase 2
**Requirements**: [VIZ-01, VIZ-02, VIZ-03]
**Success Criteria**:
  1. Six chart types render seamlessly with live cross-filtering.
  2. Dashboard layouts saved to PostgreSQL and retrieved with user permissions.
  3. 192-bit share tokens allow secure public access only when explicitly published.
**Plans**: 1 plan complete

### Phase 4: AI Analyst & Pulse Feed
**Goal**: Conversational analytics powered by Google Gemini with strict schema enforcement.
**Depends on**: Phase 3
**Requirements**: [AI-01, AI-02, AI-03]
**Success Criteria**:
  1. Natural language questions converted into safe queries matching column whitelists.
  2. Pulse feed highlights key KPI variations and statistical anomalies.
  3. AI chat histories isolated strictly to the requesting user and workspace.
**Plans**: 1 plan complete

### Phase 5: Security Audit & Hardening
**Goal**: Complete zero-vulnerability security hardening, HTTP header injection, and Playwright verification.
**Depends on**: Phase 4
**Requirements**: [SEC-01, SEC-02, SEC-03]
**Success Criteria**:
  1. 42/42 backend security integration tests pass with 0 regressions.
  2. 12/12 platform pages verified with Playwright with 0 console and 0 network errors.
  3. Security audit logging tracks all administrative actions and failed login attempts.
**Plans**: 1 plan complete

### Phase 6: Cloud Connectors & Scheduled Distribution
**Goal**: Integrate remote warehouse data sources and automated email schedules.
**Depends on**: Phase 5
**Requirements**: [CONN-01, NOTIF-01, EXP-01]
**Success Criteria**:
  1. Live querying against external Snowflake and BigQuery data sources.
  2. Automated daily/weekly PDF and CSV report delivery via SMTP.
**Plans**: In planning
