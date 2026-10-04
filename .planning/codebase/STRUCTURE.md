# Directory Structure — RicozViz

```
RICOZ VIZ/
├── .agents/                 # Antigravity & GSD agent configs, skills, workflows
├── .planning/               # GSD planning directory (codebase maps, requirements, roadmap)
├── Backend/                 # Python FastAPI backend
│   ├── .venv/               # Virtual environment
│   ├── app/
│   │   ├── config.py        # Settings and environment variables
│   │   ├── database.py      # SQLAlchemy engine and session makers
│   │   ├── main.py          # FastAPI application factory and security middleware
│   │   ├── models/          # SQLAlchemy ORM models (User, Dashboard, Dataset, etc.)
│   │   ├── routers/         # API endpoint routers (auth, dashboards, datasets, ai, etc.)
│   │   ├── schemas/         # Pydantic v2 validation models
│   │   └── services/        # Business logic services (auth, query, ai, governance)
│   ├── uploads/             # Secure storage for uploaded datasets (CSV/Parquet)
│   ├── requirements.txt     # Python dependencies
│   ├── test_security.py     # 42-point backend security test suite
│   └── audit_frontend_playwright.py # Playwright browser diagnostic suite
├── Database/
│   └── data/                # PostgreSQL 18 data cluster
├── Frontend/
│   └── app/                 # Next.js 15 App Router frontend
│       ├── src/
│       │   ├── app/         # Routes: /login, /dashboard, /datasets, /explorer, /ai, /governance, /pulse, /reports
│       │   ├── components/  # Reusable UI components, charts, navigation, modal dialogs
│       │   └── context/     # React state providers (AuthContext, WorkspaceContext)
│       ├── package.json     # Node.js dependencies
│       └── next.config.ts   # Next.js configuration & security response headers
├── prd.md                   # Product Requirements Document
├── Tech arch.md             # Technical Architecture
├── buildrules.md            # Engineering and code quality rules
├── uiux.md                  # Design and UI/UX contract
└── userflow.md              # User flows and journey maps
```
