# RicozViz — Build Execution Rules

## 1. General Instruction

Build RicozViz as a real production-quality SaaS application.

Do not create a collection of disconnected static pages.

The application should have a coherent architecture and working navigation.

---

# 2. Development Order

Build in this order:

### Phase 1 — Foundation

- Project setup
- Design system
- Routing
- Authentication
- Layout
- Navigation
- Responsive structure

### Phase 2 — Marketing Website

Build:

- Home
- Product
- Capabilities
- Features
- Use Cases
- CTA
- Footer

### Phase 3 — Application Shell

Build:

- Dashboard
- Sidebar
- Top navigation
- Workspace
- User menu
- Notifications

### Phase 4 — Core Analytics

Build:

- Datasets
- CSV upload
- Data preview
- Visualization Studio
- Charts
- Filters
- Dashboard builder

### Phase 5 — Sharing & Governance

Build:

- Users
- Roles
- Permissions
- Sharing
- Publishing
- Reports

### Phase 6 — AI

Build:

- AI Analyst
- AI Dashboard Generator
- Data Detective
- Anomaly Radar
- RicozPulse

### Phase 7 — Advanced

Build:

- Data lineage
- Marketplace
- Collaboration
- Predictive analytics

---

# 3. Functional Requirement

Every major interactive element must have a defined behavior.

Do NOT create:

- Dead buttons
- Fake navigation
- Fake dropdowns
- Non-functional filters
- Decorative forms
- Empty AI chat that does nothing

If a real backend integration is not available yet, use realistic mock data and clearly structured service interfaces so it can be replaced later.

---

# 4. Mock Data

Create realistic enterprise datasets.

Example:

Sales:

- Date
- Region
- Country
- Product
- Revenue
- Cost
- Profit
- Orders
- Customers

Customer:

- Customer ID
- Segment
- Region
- Revenue
- Churn
- Lifetime value

Use realistic values.

Do not use repetitive placeholder values such as:

"Lorem ipsum"
"Test User"
"123"

---

# 5. Dashboard

The dashboard should look like a real enterprise analytics dashboard.

Include:

- KPI cards
- Charts
- Filters
- Tables
- Insights
- Last updated time

Charts must respond to filters.

---

# 6. AI

For the first implementation, AI features may use deterministic mock responses based on the demo dataset.

However, design the architecture so real LLM integration can later replace the mock service.

AI responses should feel realistic.

Example:

User:
"Why did revenue decrease?"

Response:

"Revenue decreased 12.4% compared with the previous quarter. The largest contributor was the South region, where revenue declined 21%. Product A accounted for most of the decline."

Then show supporting charts.

---

# 7. Quality

Code must be:

- Clean
- Modular
- Readable
- Maintainable
- Type-safe
- Reusable

Avoid giant components.

Avoid duplicated logic.

Create reusable components.

---

# 8. Responsive

The application must work on:

Desktop
Tablet
Mobile

Do not simply shrink desktop UI.

Adapt layouts appropriately.

---

# 9. Visual Quality

The final result should feel like a premium enterprise SaaS product.

Prioritize:

Typography
Spacing
Alignment
Hierarchy
Consistency
Data visualization quality

---

# 10. Accessibility

All major controls should support:

Keyboard navigation
Focus states
Accessible labels
Good contrast

---

# 11. Security

Never expose:

- Passwords
- API keys
- Database credentials
- Secrets

Backend permissions must always be enforced.

---

# 12. Error States

Every major workflow needs:

Loading state
Empty state
Error state
Success state

---

# 13. Before Completing

Verify:

- All routes work
- Navigation works
- Buttons work
- Forms work
- Dashboard filters work
- Charts render
- Mock data loads
- Authentication works
- Permissions work
- Mobile layout works
- No console errors
- No broken links
- No obvious UI bugs

---

# 14. Final Requirement

Do not stop after creating the landing page.

Build the complete RicozViz product experience:

Marketing Website
+
Authentication
+
Analytics Workspace
+
Dashboard Builder
+
Data Explorer
+
AI Analyst
+
Governance
+
Publishing
+
RicozPulse
+
Data Marketplace

The final application should feel like a coherent enterprise analytics platform.

# 15. PROJECT COMPLETION LEVELS

RicozViz must be developed according to clearly defined completion levels.

The percentage represents the overall maturity of the product, not simply the number of screens completed.

Antigravity must NOT consider the project complete merely because the UI has been implemented.

---

## 0–20% — FOUNDATION

At 20%, the project should have:

### Technical
- Project initialized
- Next.js/React/TypeScript configured
- Tailwind configured
- Component system established
- Routing established
- Basic folder architecture
- Environment configuration
- Git-ready structure

### UI
- Design system established
- Typography established
- Colors established
- Buttons
- Cards
- Inputs
- Navigation
- Basic responsive system

### Expected state

The application can run successfully, but most product functionality is not implemented.

This is NOT a usable product.

---

# 20–40% — MARKETING + APPLICATION SHELL

At 40%, RicozViz should have:

### Marketing website

- Homepage
- Hero
- Overview
- Capabilities
- Benefits
- Features
- Use cases
- AI section
- CTA
- Footer

### Application

- Login
- Signup
- Dashboard shell
- Sidebar
- Top navigation
- User profile
- Settings
- Basic workspace

### Navigation

All major routes should exist and be connected.

### Expected state

The product looks like a real SaaS application, but the analytics functionality is still limited.

It should NOT be considered an MVP.

---

# 40–60% — FUNCTIONAL MVP

At 60%, the core RicozViz product must actually work.

### Authentication

- Login
- Signup
- Logout
- Session management

### Data

- CSV upload
- Dataset creation
- Dataset preview
- Basic PostgreSQL connection
- Dataset management

### Visualization

- Line chart
- Bar chart
- Pie chart
- Table
- KPI
- Visualization configuration

### Dashboard

- Create dashboard
- Add visualization
- Remove visualization
- Resize
- Rearrange
- Save
- Edit
- Delete

### Filters

- Date filters
- Category filters
- Multi-select filters

Charts must react to filters.

### Sharing

- Share dashboard
- Viewer permissions
- Editor permissions

### Export

- CSV
- PDF

### Expected state

A real user can:

Connect data
→ create visualizations
→ build dashboard
→ filter dashboard
→ save dashboard
→ share dashboard
→ export dashboard

This is the minimum level that should be considered a FUNCTIONAL MVP.

---

# 60–75% — COMPLETE CORE PLATFORM

At 75%, RicozViz should feel like a serious BI platform.

Add:

### Data

- Multiple data sources
- Data blending
- Live queries
- Cached extracts
- Data refresh
- Data schema management

### Visualization Studio

- More visualization types
- Advanced configuration
- Dashboard templates
- Drill-down
- Cross-filtering
- Parameters

### Explorer

- Sorting
- Grouping
- Filtering
- Drill-down
- Data exploration
- Interactive analysis

### Publishing

- Dashboard publishing
- Role-based access
- Embedded dashboards
- Scheduled reports
- Email reports

### Governance

- Users
- Roles
- Permissions
- Dataset permissions
- Dashboard permissions
- Audit logs

### Expected state

RicozViz should now be comparable to a serious traditional enterprise BI product in its core functionality.

---

# 75–90% — INTELLIGENT RICOZVIZ

At 90%, the advanced intelligence layer must be functional.

## Ricoz AI Analyst

Users can ask:

"Why did revenue decrease?"

The system should return:

- Relevant data
- Explanation
- Supporting metrics
- Visualization
- Follow-up questions

---

## AI Dashboard Generator

User selects a dataset.

Click:

Generate Dashboard

System generates:

- KPIs
- Charts
- Filters
- Layout
- Insights

---

## Data Detective

Users can select:

Explain this change

System performs:

Metric analysis
→ Dimension analysis
→ Contribution analysis
→ Root-cause visualization

---

## Anomaly Radar

System identifies:

- Unusual values
- Sudden changes
- Unexpected trends
- KPI anomalies

Users can investigate anomalies.

---

## Predictive Analytics

Support:

- Forecasts
- Trend predictions
- Historical vs predicted visualization

Predicted values must be clearly identified as predictions.

---

## RicozPulse

Create executive intelligence feed containing:

- KPI changes
- Anomalies
- Important insights
- Opportunities
- Forecast changes
- Recommended investigations

---

## Data Lineage

Users can trace:

Dashboard
→ Metric
→ Transformation
→ Dataset
→ Table
→ Data source

---

## Expected state

RicozViz should no longer feel like only a dashboard builder.

It should feel like an intelligent analytics platform.

---

# 90–95% — ENTERPRISE READY

At 95%, focus on reliability, security, scalability, and completeness.

### Security

- Strong authentication
- RBAC
- Row-level security
- Column-level security
- PII detection
- Data masking
- Secure credentials
- Audit logs

### Enterprise

- Organizations
- Workspaces
- Teams
- User management
- Permission management
- Data governance
- Data catalog

### Collaboration

- Comments
- Mentions
- Annotations
- Notifications
- Data stories

### Data Marketplace

- Dataset discovery
- Dataset metadata
- Owners
- Freshness
- Quality information
- Related dashboards
- Access requests

### Reliability

- Error handling
- Loading states
- Empty states
- Retry handling
- Logging
- Monitoring

### Testing

- Unit tests
- Integration tests
- API tests
- Permission tests
- End-to-end tests

### Expected state

The platform should be stable enough to demonstrate as a serious enterprise SaaS product.

---

# 95–100% — PRODUCTION-QUALITY RICOZVIZ

100% means the complete product vision has been implemented.

## Product

All core and advanced features are functional.

## Data

Users can:

Connect
→ ingest
→ model
→ blend
→ query
→ visualize
→ explore

## Visualization

Users can:

Create
→ customize
→ filter
→ drill down
→ interact
→ save
→ publish

## AI

Users can:

Ask
→ analyze
→ explain
→ investigate
→ predict
→ discover insights

## Governance

Organizations can:

Control
→ restrict
→ audit
→ monitor
→ govern

## Collaboration

Teams can:

Comment
→ discuss
→ annotate
→ share
→ act

## Intelligence

Executives can:

Open RicozPulse
→ see important changes
→ investigate
→ understand
→ make decisions

---

# 100% PRODUCT FLOW

The complete RicozViz experience should support:

Visitor
↓
Marketing Website
↓
Signup
↓
Organization
↓
Workspace
↓
Connect Data
↓
Data Modeling
↓
Visualization Studio
↓
Dashboard
↓
Interactive Explorer
↓
AI Analyst
↓
Data Detective
↓
Anomaly Detection
↓
Predictive Analytics
↓
Collaboration
↓
Governance
↓
Publishing
↓
Reports
↓
RicozPulse
↓
Business Decision

---

# 100% QUALITY REQUIREMENTS

At 100%:

### UI

- Premium enterprise design
- Consistent components
- Responsive
- Accessible
- Smooth interactions
- No broken layouts

### Functionality

- No dead buttons
- No fake navigation
- No unfinished flows
- No major placeholder screens
- All important interactions work

### Data

- Realistic demo data
- Proper data relationships
- Correct filtering
- Correct calculations
- Correct visualization behavior

### AI

AI features must have real service interfaces.

If production AI infrastructure is unavailable, mock services may be used for demonstration, but they must follow the same interfaces required for real AI integration.

### Security

No credentials or secrets exposed.

All sensitive operations require backend authorization.

### Performance

- Fast initial load
- Optimized dashboard rendering
- Efficient data queries
- Pagination for large datasets
- Appropriate caching

### Testing

Critical user journeys must be tested.

### Deployment

The application should be deployable as a production SaaS application.

---

# COMPLETION DEFINITION

Antigravity must report the project completion level based on the following:

20% = Foundation

40% = Marketing + Application Shell

60% = Functional MVP

75% = Complete Core BI Platform

90% = Intelligent RicozViz

95% = Enterprise Ready

100% = Production-quality complete product vision

Do NOT claim 100% completion if only the frontend or marketing website is finished.

A visually complete frontend does NOT equal 100% completion.

A feature is considered complete only when:

UI
+
Interaction
+
State management
+
Backend/service interface
+
Data behavior
+
Error handling
+
Responsive behavior

are implemented where applicable.