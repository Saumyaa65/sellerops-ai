# SellerOps AI 🚀

SellerOps AI is an AI-powered autonomous operations manager designed for e-commerce marketplace (Meesho) sellers. It automates catalog compliance checks, monitors store operations, audits payouts, diagnoses suspensions, and drafts policy-compliant appeals using a multi-agent orchestration workflow.

---

## 🌟 Key Features

1. **Unified Seller Dashboard:** Real-time visibility into store health metrics, listing statuses, and payout anomalies, prioritized by severity (`Critical` → `High` → `Medium`).
2. **Multi-Agent AI Diagnostics (LangGraph):** Orchestrated pipelines that trace events step-by-step:
   * **Monitoring:** Watches metrics and flags listing issues.
   * **Investigation:** Gathers context and checks historical memory caches.
   * **Policy:** Queries Qdrant RAG database to extract relevant rules.
   * **Planning:** Formulates response strategies.
   * **Execution:** Drafts finalized, professional appeal letters.
3. **Preventive Policy Scanner:** Semantic policy RAG verifying product catalog metadata against official marketplace rules before listings go live.
4. **Financial Payout Audits:** Compares settled payout figures against standard commission brackets to identify settlement discrepancies.
5. **Simulated Customer Ticket Solver:** Instantly generates context-aware, helpful replies to customer support queries.

---

## 🛠️ Technology Stack

* **Backend:** FastAPI (Python 3.11/3.13), SQLite (async via `aiosqlite`/SQLAlchemy), LangGraph (Agent State Orchestrator), Qdrant (Vector Database), FastEmbed (ONNX Local Embedding Engine), Groq API (Llama 3.3 70B model).
* **Frontend:** Next.js (TypeScript, App Router), Tailwind CSS (v4), Axios, Sonner toasts, Lucide icons.

---

## ⚡ Architectural Performance Highlights

To support deployment on highly resource-constrained hosting (e.g. Render Free Tier with 512 MB RAM), the codebase features the following optimizations:
* **FastEmbed ONNX Migration:** Replaced heavyweight PyTorch (`torch`/`sentence-transformers`) with a lightweight ONNX runtime wrapper. Memory usage drops from `~800 MB` to **`~120 MB`** without requiring database re-indexing.
* **SQLite WAL & Concurrency Mode:** Configured SQLite connection listeners to run in `journal_mode=WAL` and `synchronous=NORMAL` to support high concurrent reads and writes.
* **Decoupled DB Sessions:** Closed active SQLite connections prior to launching slow network calls (e.g. LLM generations, external APIs) to prevent "database is locked" errors.
* **Render Boot UX Guard:** The frontend intercepts network failures during cold starts, showing an elegant booting screen with automatic retries instead of loading broken pages or raw API failures.

---

## 📁 Repository Structure

```text
├── backend/                   # FastAPI Python server
│   ├── agents/                # LangGraph node agents (Monitoring, Investigation, Policy, etc.)
│   ├── api/v1/                # Routes (auth, listings, payout anomalies, tickets, scenarios)
│   ├── config/                # Environment config setups and settings
│   ├── models/                # SQLite base models, schema initializations, and WAL pragmas
│   ├── rag/                   # Policy retrievers and FastEmbed wrapper implementations
│   ├── main.py                # FastAPI lifecycle, cors setup, and application factory
│   └── requirements.txt       # Streamlined production dependencies
│
├── frontend/                  # Next.js Typescript SPA
│   ├── app/                   # App Router pages (dashboard views, login pages, layout protectors)
│   ├── components/            # Sidebar layouts, visual metrics panels
│   ├── store/                 # Global UI state stores
│   └── next.config.ts         # Turbopack rewrites config
│
└── data/                      # Mock dataset definitions
    ├── mock/                  # Seed dataset for orders, listings, payouts, and tickets
    └── policies/              # Raw marketplace text guidelines for RAG retrieval
```

---

## 🚀 Setup & Execution Guide

### 1. Prerequisites
* Python 3.11 or 3.13
* Node.js v18+ and npm

### 2. Backend Installation & Start
Navigate to the backend directory, create a Python virtual environment, install the required packages, and start the server:

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

#### Seed Database
The SQLite database auto-seeds on initial application boot. If you need to force re-seeding:
```bash
python seed.py
```

#### Run Server
Launch the Uvicorn local development server:
```bash
uvicorn main:app --port 8000 --reload
```
The API documentation will be available at `http://localhost:8000/docs`.

---

### 3. Frontend Installation & Start
Navigate to the frontend directory, configure environment variables, install node packages, and launch:

```bash
cd ../frontend
npm install
```

#### Setup Environment File
Create a `.env.local` file inside the `frontend/` directory (refer to `.env.example`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` with your browser to explore the dashboard.

---

## 🔑 Demo Workspace Accounts
You can log in instantly by selecting one of the workspace accounts on the login page:
* **Rohan Enterprises** (`rohan@sellerops.ai` / `demo123`) - Enterprise Workspace
* **Priya Fashion** (`priya@sellerops.ai` / `demo123`) - Apparel Workspace
* **ElectroKart** (`electro@sellerops.ai` / `demo123`) - Electronics Workspace

---

## ☁️ Deployment Guidelines

### Backend (Render)
1. Deploy as a **Web Service** on Render pointing to the root repository folder.
2. Root Directory: `backend`
3. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Set the required Environment Variables in Render's dashboard (e.g. `GROQ_API_KEY`, `DATABASE_URL=sqlite+aiosqlite:///./sellerops.db`, `ALERT_EMAIL`).

### Frontend (Vercel)
1. Import the project repository into Vercel.
2. Root Directory: `frontend`
3. Configure the environment variable:
   * `NEXT_PUBLIC_API_URL` = Your backend Render deployment URL (e.g., `https://sellerops-ai.onrender.com`)
