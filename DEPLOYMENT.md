# RicozViz Enterprise SaaS — Cloud Deployment Guide
## Vercel (Frontend) + Render / Supabase (Backend & Database)

This guide walks you through deploying **RicozViz** into production using:
- **Frontend:** [Vercel](https://vercel.com) (Next.js 16 with Turbopack)
- **Backend:** [Render](https://render.com) (FastAPI + Uvicorn + DuckDB analytical engine via Docker)
- **Database:** [Supabase](https://supabase.com) or [Render Managed PostgreSQL](https://render.com)

---

### Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │             End Users / Team           │
                      └───────────────────┬────────────────────┘
                                          │ HTTPS
                                          ▼
                      ┌────────────────────────────────────────┐
                      │           Vercel Edge Network          │
                      │     Next.js 16 Enterprise Frontend     │
                      │       (https://ricozviz.vercel.app)     │
                      └───────────────────┬────────────────────┘
                                          │ REST API / JWT
                                          ▼
                      ┌────────────────────────────────────────┐
                      │           Render Web Service           │
                      │       FastAPI Production Docker        │
                      │   (https://ricozviz.onrender.com/api)  │
                      └───────────────────┬────────────────────┘
                                          │ asyncpg (SSL)
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Supabase / Render PostgreSQL 16+    │
                      │       Multi-Tenant Isolated Data       │
                      └────────────────────────────────────────┘
```

---

### Step 1: Provision Cloud PostgreSQL (Supabase or Render)

#### Option A: Supabase (Recommended)
1. Log into [Supabase](https://supabase.com) and click **New Project**.
2. Name your project (e.g., `ricozviz-prod`), choose a region close to your users, and set a secure database password.
3. In **Project Settings** → **Database** → **Connection string**:
   - Copy the **URI** connection string:
     ```text
     postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```
4. *(Optional)* In the **SQL Editor**, you can paste the contents of [`Database/supabase_setup.sql`](file:///d:/PROJECTS/RICOZ%20VIZ/Database/supabase_setup.sql) to pre-create tables. *Note: FastAPI also automatically creates and migrates all tables on startup via SQLAlchemy lifespan.*

#### Option B: Render Managed PostgreSQL
1. On [Render](https://render.com), click **New +** → **PostgreSQL**.
2. Name: `ricozviz-db`, Database: `ricozviz`.
3. Copy the **Internal Database URL** (if deploying backend on Render) or **External Database URL**.

---

### Step 2: Deploy Backend to Render

You can deploy the backend using the included [`render.yaml`](file:///d:/PROJECTS/RICOZ%20VIZ/render.yaml) blueprint or as a Docker Web Service.

#### Deploy via Render Dashboard (Docker Web Service):
1. Push your repository to GitHub or GitLab:
   ```bash
   git add .
   git commit -m "feat: enterprise multi-tenant cloud release"
   git push origin main
   ```
2. In [Render Dashboard](https://dashboard.render.com), click **New +** → **Web Service**.
3. Select your repository.
4. Configure service details:
   - **Name:** `ricozviz-backend`
   - **Region:** Same region as your database (e.g., Oregon or Frankfurt)
   - **Language:** **Docker**
   - **Dockerfile Path:** `Backend/Dockerfile`
   - **Docker Context Directory:** `Backend`
   - **Instance Type:** Starter (or Free tier)
5. Set Environment Variables:

   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql+asyncpg://postgres:...` | Your Supabase or Render database URI *(auto-converted if starting with `postgres://`)* |
   | `SECRET_KEY` | `your-secure-random-32-char-string` | JWT signing secret |
   | `CORS_ORIGINS` | `https://your-frontend.vercel.app,*` | Allowed frontend domains (comma-separated or `*`) |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | 24-hour token validity |
   | `PORT` | `8000` | Port for Uvicorn |

6. Click **Deploy Web Service**.
7. Once deployed, verify your backend health check:
   ```text
   GET https://ricozviz-backend.onrender.com/api/health
   # Returns: {"status": "healthy", "service": "RicozViz Analytics Platform", ...}
   ```

---

### Step 3: Deploy Frontend to Vercel

1. Log into [Vercel](https://vercel.com) and click **Add New...** → **Project**.
2. Select your RicozViz repository.
3. Configure project settings:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click **Edit** and set to `Frontend/app`
   - **Build Command:** `next build` *(verified with zero errors)*
   - **Output Directory:** `.next`
4. Configure Environment Variables:

   | Variable | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_API_URL` | `https://ricozviz-backend.onrender.com/api` |

   *(Replace `ricozviz-backend.onrender.com` with your actual Render backend domain)*

5. Click **Deploy**.
6. Vercel will build and assign your production domain: `https://ricozviz.vercel.app`.

---

### Step 4: Finalize CORS on Render

Once your Vercel URL is live:
1. Go to your Render backend service → **Environment**.
2. Update `CORS_ORIGINS` to include your exact Vercel production URL:
   ```text
   CORS_ORIGINS=https://ricozviz.vercel.app,https://your-custom-domain.com
   ```
3. Save changes (Render will automatically re-deploy in ~30 seconds).

---

### Step 5: Verification & Production Smoke Test

Once deployed, verify the complete SaaS workflow:
- [ ] Visit `https://your-app.vercel.app/auth/signup`
- [ ] Sign up with your company name, industry, and credentials
- [ ] Verify automatic organization & workspace creation
- [ ] Visit `/dashboard/settings/organization` and review tenant metrics
- [ ] Upload a test CSV dataset and execute analytical queries
- [ ] Generate an employee invitation link and verify `/invite/[token]`
- [ ] Open AI Analyst, Detective, and Pulse tabs to verify isolated intelligence feeds

---

### Local Production Preview (Optional)

To test production containerization locally before deploying to the cloud:
```bash
# Start backend in production mode
cd Backend
docker build -t ricozviz-backend .
docker run -p 8000:8000 -e DATABASE_URL="postgresql+asyncpg://postgres@host.docker.internal:5432/ricozviz" ricozviz-backend

# Start frontend in production mode
cd ../Frontend/app
npm run build
npm start
```
