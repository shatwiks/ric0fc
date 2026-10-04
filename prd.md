# RicozViz — Product Requirements Document

## 1. Product Overview

RicozViz is an enterprise data visualization and exploration platform that enables analysts, business users, and executives to connect enterprise data, create interactive dashboards, explore data, discover insights, and securely share governed analytics.

The product should combine traditional BI capabilities with AI-powered analytics.

Core product flow:

Connect → Visualize → Explore → Explain → Predict → Collaborate → Govern → Act

---

## 2. Product Vision

Make enterprise data easy to understand, explore, and act upon without requiring users to be SQL or programming experts.

---

## 3. Target Users

### Data Analysts
Need to create dashboards, analyze data, combine datasets, and share insights.

### Business Users
Need to explore business data without depending on analysts.

### Executives
Need concise KPIs, trends, alerts, forecasts, and business insights.

### Administrators
Need to manage users, permissions, data sources, governance, and publishing.

---

## 4. Core Features

### 4.1 Visualisation Studio

Users can:

- Create dashboards
- Add charts
- Select chart types
- Drag and drop fields
- Configure dimensions and measures
- Add filters
- Resize components
- Rearrange components
- Save dashboards
- Edit dashboards

Supported visualizations:

- Line chart
- Bar chart
- Area chart
- Pie/donut
- Scatter plot
- KPI cards
- Tables
- Heatmaps
- Histograms
- Maps

---

### 4.2 Data Connector

Allow users/admins to connect:

- CSV
- PostgreSQL
- MySQL
- REST APIs

Future connectors:

- Snowflake
- BigQuery
- SQL Server
- Oracle
- Databricks
- Salesforce

Support:

- Live queries
- Cached extracts
- Data preview
- Refresh configuration
- Connection testing

---

### 4.3 Data Blending

Allow users to combine compatible datasets.

Users should be able to:

- Select datasets
- Define relationships
- Map fields
- Join datasets
- Preview the result
- Use blended data in dashboards

---

### 4.4 Interactive Explorer

Users can:

- Filter
- Sort
- Drill down
- Cross-filter charts
- Change date ranges
- Change parameters
- Explore detailed records

---

### 4.5 Publishing Centre

Users can:

- Publish dashboards
- Share dashboards
- Embed dashboards
- Export dashboards
- Schedule reports

Export formats:

- PDF
- CSV
- PNG

---

# 5. Advanced Features

## 5.1 Ricoz AI Analyst

Users can ask questions in natural language.

Example:

"What caused revenue to decrease last quarter?"

The system should:

1. Understand the question
2. Identify relevant data
3. Generate an appropriate query
4. Generate visualizations
5. Explain the result
6. Provide supporting metrics

---

## 5.2 AI Dashboard Generator

User provides a dataset and selects:

"Generate Dashboard"

The system automatically creates:

- KPI cards
- Charts
- Filters
- Layout
- Relevant metrics

---

## 5.3 Data Detective

Users can click:

"Explain this change"

The system performs root-cause analysis.

Example:

Revenue ↓ 14%

→ Region
→ Karnataka ↓ 21%

→ Product
→ Product A ↓ 32%

→ Customer segment
→ Enterprise customers ↓

The UI should visually show the investigation path.

---

## 5.4 Anomaly & Insight Radar

Detect unusual patterns automatically.

Examples:

- Revenue suddenly decreased
- Customer churn increased
- Orders increased unusually
- A region is performing outside normal range

Display alerts inside the dashboard and insights area.

---

## 5.5 Predictive Dashboards

Generate forecasts for supported datasets.

Examples:

- Revenue forecast
- Sales forecast
- Demand forecast
- Customer churn prediction

Clearly distinguish historical data from predictions.

---

## 5.6 Data Lineage Explorer

Show where a metric comes from.

Example:

Dashboard KPI
→ Calculated Metric
→ Dataset
→ Table
→ Database
→ Source System

---

## 5.7 Smart Data Governance

Support:

- Role-based access
- Row-level security
- Column-level security
- PII detection
- Sensitive data masking
- Audit logs
- Access policies

---

## 5.8 Collaborative Data Stories

Users can:

- Comment on charts
- Mention users
- Add annotations
- Highlight data points
- Create discussion threads
- Assign follow-up tasks

---

## 5.9 Ricoz Data Marketplace

Allow users to discover:

- Datasets
- Dashboards
- Metrics
- Data owners

Show:

- Description
- Owner
- Freshness
- Usage
- Quality information
- Related dashboards
- Data lineage

---

## 5.10 RicozPulse

Executive intelligence feed.

Show:

- Important KPI changes
- Alerts
- Opportunities
- Anomalies
- Forecast changes
- Recommended investigations

Example:

Revenue ↑ 8.2%

Customer churn ↑ 14%

Alert:
Enterprise churn increased significantly in South region.

---

# 6. User Roles

Viewer:
- View dashboards

Explorer:
- View
- Filter
- Explore

Analyst:
- Create
- Edit
- Explore

Publisher:
- Publish
- Share
- Schedule reports

Admin:
- Full access
- Users
- Permissions
- Data sources
- Governance

---

# 7. MVP

MVP must include:

- Authentication
- Workspace
- Dashboard
- CSV upload
- PostgreSQL connection
- Visualization Studio
- Basic charts
- Filters
- Dashboard saving
- Sharing
- RBAC
- PDF/CSV export

AI features can initially use mock/demo data but the architecture must support real implementation later.

---

# 8. Success Criteria

A user should be able to:

1. Login
2. Connect/upload data
3. Create a visualization
4. Build a dashboard
5. Filter the dashboard
6. Save it
7. Share it
8. Control access
9. Export it
10. Explore insights