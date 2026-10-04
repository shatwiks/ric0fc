# RicozViz — User Flows & Functional Specification

## 1. New User Flow

Landing page
↓
Get Started
↓
Signup
↓
Create Organization
↓
Create Workspace
↓
Onboarding
↓
Connect Data
↓
Create First Dashboard

---

# 2. Dashboard Creation

Dashboard
↓
Create Dashboard
↓
Select Dataset
↓
Select Visualization
↓
Configure fields
↓
Add filters
↓
Customize
↓
Save

---

# 3. Data Upload

Datasets
↓
Add Dataset
↓
Upload CSV
↓
Validate file
↓
Preview data
↓
Configure fields
↓
Create dataset
↓
Dataset available to dashboards

---

# 4. Visualization Creation

Add visualization
↓
Select chart type
↓
Select dataset
↓
Select dimension
↓
Select measure
↓
Apply filters
↓
Preview
↓
Add to dashboard

---

# 5. Dashboard Interaction

User opens dashboard.

System loads:

- Filters
- KPI cards
- Charts
- Tables
- Insights

When user changes a filter:

All connected visualizations should update.

---

# 6. AI Analyst Flow

User opens AI Analyst.

User:

"Show me revenue by region."

System:

Understand question
↓
Identify dataset
↓
Generate query
↓
Execute safely
↓
Generate chart
↓
Explain result

User can then ask:

"Why is Karnataka lower?"

The system continues the conversation.

---

# 7. AI Dashboard Generator

User selects:

Generate Dashboard

System:

Analyze dataset
↓
Identify important fields
↓
Identify metrics
↓
Select visualizations
↓
Generate layout
↓
Show preview

User can:

Accept
Edit
Regenerate

---

# 8. Data Detective

User clicks:

"Explain this change"

System shows:

Metric
↓
Contributing dimensions
↓
Largest changes
↓
Potential drivers
↓
Supporting visualizations

---

# 9. Anomaly Flow

System detects anomaly.

Show:

Anomaly
Metric
Magnitude
Time
Affected dimension

User clicks:

Investigate

System opens Data Detective.

---

# 10. Sharing

Dashboard
↓
Share
↓
Select users/roles
↓
Select permission
↓
Save
↓
Recipients gain access

---

# 11. Publishing

Dashboard
↓
Publish
↓
Select audience
↓
Configure permissions
↓
Publish

Published dashboards should clearly show publication status.

---

# 12. Scheduled Reports

Dashboard
↓
Schedule Report
↓
Select frequency
↓
Select recipients
↓
Select format
↓
Save schedule

Supported:

Daily
Weekly
Monthly

---

# 13. Data Lineage

User selects metric.

Click:

View Lineage

Display:

Dashboard
↓
Metric
↓
Transformation
↓
Dataset
↓
Table
↓
Source

---

# 14. Collaboration

User opens chart.

Click:

Comment

Write comment.

Mention another user.

User receives notification.

---

# 15. Data Marketplace

Marketplace
↓
Search dataset
↓
Open dataset
↓
View metadata
↓
View owner
↓
View freshness
↓
Request access / Open

---

# 16. RicozPulse

Pulse opens.

Show:

Critical alerts
Important changes
Opportunities
Anomalies
Forecast changes

User clicks an insight.

Open related dashboard or Data Detective.

---

# 17. Permissions

Viewer:
Can view.

Explorer:
Can view and interact.

Analyst:
Can create/edit.

Publisher:
Can publish.

Admin:
Can manage everything.

Backend must enforce permissions.