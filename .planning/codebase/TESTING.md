# Testing Strategy & Test Suites — RicozViz

## Test Architecture
RicozViz enforces multi-tiered testing: unit, API integration, security vulnerability regression, and browser-driven end-to-end (Playwright).

## Active Test Suites

### 1. Backend Security Test Suite (`Backend/test_security.py`)
- **Coverage**: 42 automated security test cases spanning 8 security dimensions:
  1. Authentication & Session Security (tampered JWTs, deactivated user lockouts, credential enumeration)
  2. Role-Based Access Control (Admin, Publisher, Analyst, Explorer, Viewer boundary tests)
  3. Multi-Tenant Isolation & IDOR Protection (cross-tenant datasets, dashboards, AI conversations)
  4. SQL & DuckDB Injection Protections (column allowlist validation, parameterized values)
  5. File Security & Path Traversal (safe filename resolution, file extension whitelisting)
  6. Sharing & Token Security (192-bit token entropy, unpublish link revocation)
  7. HTTP Security Headers (`nosniff`, `DENY`, `strict-origin-when-cross-origin`)
  8. Security Audit Logging (failed login tracking, administrative action auditing)
- **Execution Command**:
  ```bash
  & "Backend/.venv/Scripts/python.exe" Backend/test_security.py
  ```

### 2. Static Architectural Audit (`Backend/security_audit.py`)
- **Coverage**: 13 automated checks verifying cryptographic entropy, hardcoded secrets scanning, and AST middleware structure.
- **Execution Command**:
  ```bash
  & "Backend/.venv/Scripts/python.exe" Backend/security_audit.py
  ```

### 3. Playwright Browser E2E Suite (`Backend/audit_frontend_playwright.py`)
- **Coverage**: 12 core application pages navigated under Admin and Viewer roles with Chromium.
- **Assertions**:
  - 0 unhandled console errors
  - 0 failed network requests (5xx/404)
  - Proper UI element rendering and RBAC component visibility
- **Execution Command**:
  ```bash
  & "Backend/.venv/Scripts/python.exe" Backend/audit_frontend_playwright.py
  ```

### 4. Milestone Day 1–7 Regression Tests
- `verify_day1_frontend_e2e.py`
- `verify_day2_e2e.py`
- `test_day3_backend.py` / `verify_day3_e2e.py`
- `test_day4_backend.py` / `verify_day4_e2e.py`
- `test_day5_backend.py` / `verify_day5_e2e.py`
- `test_day6_backend.py` / `verify_day6_e2e.py`
- `verify_day7_backend.py` / `verify_day7_e2e.py`
