# SellerOps AI

SellerOps AI is an operations management application designed for e-commerce marketplace (Meesho) sellers. It facilitates catalog compliance checks, monitors store alert metrics, logs payout anomalies, diagnoses store health alerts, and generates policy-compliant appeals using an orchestrated multi-agent workflow.

---

## 🌟 Key Features

1. **Unified Seller Dashboard:** Shows store health metrics, listing compliance statuses, and payout anomalies, categorized by severity (`Critical`, `High`, `Medium`).
2. **Orchestrated Diagnostics (LangGraph):** Orchestrates multi-agent pipelines to handle store issues:
   * **Monitoring:** Evaluates listing stats and logs ticket counts.
   * **Investigation:** Assesses problem context and queries historical memory caches.
   * **Policy:** Queries Qdrant vector database to load relevant rules.
   * **Planning:** Formulates response strategies.
   * **Execution:** Drafts professional compliance appeal letters.
3. **Preventive Policy Scanner:** Uses a semantic search (RAG) to cross-reference listing details against official marketplace policy rules before publication.
4. **Payout Monitoring & Anomaly Detection:** Compares orders data against estimated payout schedules to identify and flag discrepancies.

---

## 🛠️ Technology Stack

* **Backend:** FastAPI (Python 3.11/3.13), SQLite (async via `aiosqlite`/SQLAlchemy), LangGraph (Agent Orchestrator), Qdrant (Vector Database), FastEmbed (ONNX Local Embedding Engine), Groq API (Llama 3.1 8B model).
* **Frontend:** Next.js (TypeScript, App Router), Tailwind CSS (v4), Axios, Sonner toasts, Lucide icons.

---

## ⚡ Architectural Performance Details

To ensure the backend runs reliably under Render's free tier memory constraints (512 MB RAM), the following design decisions were implemented:
* **FastEmbed ONNX Migration:** Replaced the heavyweight `sentence-transformers` library (PyTorch) with `fastembed` (ONNX Runtime). This avoids importing PyTorch or Transformers, reducing the runtime memory footprint to fit within the Render free-tier budget.
* **SQLite Concurrency (WAL Mode):** Configured database connections to run in Write-Ahead Logging (`WAL`) mode with `synchronous=NORMAL` to allow concurrent database reads while writes are active.
* **Decoupled Database Sessions:** Structured the agent background execution loop to commit and release database connections prior to running slow network requests (such as Groq LLM generations), preventing SQLite file-lock collisions.
* **Render Cold-Start Resilience:** Implemented client-side API interceptors and retry loops on `/login` and the dashboard layout to show a loading screen while waiting for the sleeping container to wake up.

---

## 📁 Repository Structure

```text
├── backend/                   # FastAPI Python server
│   ├── agents/                # LangGraph node agents (Monitoring, Investigation, Policy, etc.)
│   ├── api/v1/                # Routes (auth, listings, payout anomalies, chats, tickets)
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
4. Set the required Environment Variables in Render's dashboard (e.g. `GROQ_API_KEY`, `DATABASE_URL=sqlite+aiosqlite:///./sellerops-ai.db`, `ALERT_EMAIL`).

### Frontend (Vercel)
1. Import the project repository into Vercel.
2. Root Directory: `frontend`
3. Configure the environment variable:
   * `NEXT_PUBLIC_API_URL` = Your backend Render deployment URL (e.g., `https://sellerops-ai.onrender.com`)

---

## 📜 Open Source Attribution

This project is built using the following open-source libraries and services:

| Dependency | Version | License | Role in Project | Repository Link |
| :--- | :--- | :--- | :--- | :--- |
| **FastAPI** | `0.115.5` | MIT | ASGI web application framework. | [GitHub](https://github.com/fastapi/fastapi) |
| **Next.js** | `16.2.10` | MIT | React-based frontend web framework. | [GitHub](https://github.com/vercel/next.js) |
| **React** | `19.2.4` | MIT | UI rendering and client-side component state. | [GitHub](https://github.com/facebook/react) |
| **Tailwind CSS** | `^4.0.0` | MIT | CSS styling framework. | [GitHub](https://github.com/tailwindlabs/tailwindcss) |
| **LangGraph** | `0.2.60` | MIT | State-based agent graph orchestration engine. | [GitHub](https://github.com/langchain-ai/langgraph) |
| **SQLAlchemy** | `2.0.36` | MIT | Database object-relational mapping (ORM) layer. | [GitHub](https://github.com/sqlalchemy/sqlalchemy) |
| **aiosqlite** | `0.20.0` | MIT | Asynchronous driver wrapper for SQLite database engine. | [GitHub](https://github.com/omnilib/aiosqlite) |
| **Qdrant Client** | `1.12.1` | Apache-2.0 | API interface to query Qdrant Cloud vector collections. | [GitHub](https://github.com/qdrant/qdrant-client) |
| **FastEmbed** | `0.8.0` | Apache-2.0 | ONNX-based lightweight local embedding generation. | [GitHub](https://github.com/qdrant/fastembed) |
| **Axios** | `1.18.1` | MIT | Promise-based HTTP request client. | [GitHub](https://github.com/axios/axios) |
| **Groq API Client**| `0.13.0` | Apache-2.0 | Python SDK client for external Groq Cloud inference services. | [GitHub](https://github.com/groq/groq-python) |
