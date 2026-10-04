# Engineering Conventions — RicozViz

## Backend Code Conventions
1. **Pydantic Validation**:
   - Every input payload must be modeled with Pydantic v2 schemas with strict bounds (e.g. `max_length=72` on passwords, limit bounds on pagination).
   - Responses must use explicit response models (`response_model=...`) to prevent internal database schema or password hash leakage.
2. **Database Queries & SQL Safety**:
   - DuckDB queries must never interpolate raw strings. Always use parameterized queries (`?`) or whitelist column identifiers against dataset schemas.
   - SQLAlchemy transactions must cleanly handle commits/rollbacks in `get_db` dependency yields.
3. **Authorization & RBAC Pattern**:
   - Use `current_user = Depends(get_current_user)` and `require_permission(...)` dependency factories on all protected routes.
   - Check resource tenant isolation (`resource.workspace_id == current_user.workspace_id`) inside services or route dependencies.
4. **Audit Logging**:
   - Sensitive operations (failed logins, permission changes, dashboard exports, user deactivations) must emit `audit_service.log_event(...)`.

## Frontend Code Conventions
1. **Next.js & React**:
   - App Router standard with client components marked with `'use client'` where hooks or interactivity are needed.
   - Clean separation of UI components, layout wrappers, and contextual state providers.
2. **Styling & Tokens**:
   - Consistent modern dark-mode palette using HSL CSS variables.
   - Dynamic micro-interactions, responsive flex/grid layouts, clean typography.
3. **Error Handling & State**:
   - Graceful fallbacks on fetch errors with human-readable notifications.
   - Authentication tokens stored in secure browser storage (`localStorage` / HTTP-only cookies) with interceptors handling 401s.
