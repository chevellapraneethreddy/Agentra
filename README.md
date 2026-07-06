# Agentra — Production-Grade AI Workforce Platform

> Hire AI Employees that work inside your business.

Agentra is a state-of-the-art **Generative AI as a Service (GaaS)** platform that enables businesses to hire autonomous AI Employees (Operations, Sales, HR, Finance, Support, Marketing) to execute real-world operational tasks using connected business integrations.

Instead of building automations manually, Agentra allows AI Employees to reason, plan, and execute work using connected business integrations. Agentra is **not** a chat window or a sequential workflow programmer; it is an agentic platform where employees autonomously perform business activities via connected business tools.

---

## 🚀 Platform Architecture & Features

### 🤖 1. AI Employees
- **Operations Employee**
- **Sales Employee**
- **Support Employee**
- **Finance Employee**
- **HR Employee**
- **Marketing Employee**

### 🧠 2. Autonomous ReAct AI Runtime
Every employee runs on a standardized **LangGraph ReAct loop** (`Think` $\to$ `Plan` $\to$ `Execute` $\to$ `Observe` $\to$ `Reflect`). AI employees choose which tools to call dynamically to complete business objectives:
- **No hardcoded flowcharts**: The AI plans and adjusts its execution steps dynamically.
- **Failures recovery**: Retries transient API glitches automatically, escalates to human notifications, and logs issues to the timeline.
- **Actions performed**: Read/Send Emails, Schedule Meetings, Update CRM, Create Tasks, Upload Files, Notify Teams, Manage Inventory, and Execute Multi-step Workflows.

### 🔌 3. Unified Tool Registry & Live Integrations
Connected integrations instantly register inside the central Tool Engine:
- **Google Workspace Inheritance**: Connecting Google once automatically configures `Gmail`, `Google Calendar`, `Google Drive`, and `Google Sheets`.
- **Supported APIs**: Gmail, Google Calendar, Google Drive, Google Sheets, WhatsApp Business API, Slack, Shopify, HubSpot CRM, and Supabase Storage.
- **MCP Integration**: Fully ready to absorb Model Context Protocol (MCP) servers in production.

### 🔒 4. Enterprise-Grade Security & Tenancy
- **Tenancy Isolation**: SQL columns segregate credentials, records, and activities by `business_id` (tenant ID).
- **Credentials Encryption**: Sensitive credentials (refresh tokens, API keys) are symmetrically encrypted in transit and at rest using `cryptography` Fernet blocks.
- **JWT Authorization**: Protects REST endpoints using Supabase JWT authentication.

### ⚡ 5. AI Automation Center
Monitor autonomous AI workflows in real time.
- **Examples**: Lead Follow-up, Invoice Reminder, Meeting Scheduler, Customer Support Routing, Daily Summary.
- **Monitoring & Logging**: Each workflow automatically logs execution history, success rate, activity timeline, AI decisions, and tool usage.

---

## 🏗️ Technical Architecture Flowchart

```text
User
  │
  ▼
Agentra Runtime
  │
  ▼
Planner (LangGraph ReAct loop)
  │
  ▼
Memory ──► Knowledge Base (RAG)
  │
  ▼
Unified Tool Registry
  │
  ▼
Dynamic Tool Selection
  │
  ▼
Business Integrations (Gmail, Slack, HubSpot, CRM, Shopify, WhatsApp)
  │
  ▼
Activity Timeline
```

---

## 🛠️ Technology Stack
- **Frontend**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS, Lucide icons, Recharts, shadcn/ui
- **Backend**: FastAPI (Python 3.11+), LangGraph, SQLite (Development) / PostgreSQL (Production), SQLAlchemy
- **Databases & Auth**: Supabase Auth (JWT), Supabase PostgreSQL / SQLite

---

## ⚙️ Environment Variables Config

Create a `.env` file in the `backend` folder (and configure equivalents for local execution):

```ini
# Core Backend Settings
CORS_ORIGINS=["http://localhost:3000","http://localhost:3005","https://your-domain.vercel.app"]
DEBUG=False
PORT=8000

# Supabase Configurations
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here

# Security Encryption Key (32-byte urlsafe base64 key)
ENCRYPTION_KEY=your-32-byte-fernet-key-here

# LLM APIs
GEMINI_API_KEY=AIzaSy...

# Google OAuth Integration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/connections/oauth2callback
```

---

## 💾 Database Setup (Supabase PostgreSQL)
Initialize your production database by executing the queries in [migrations.sql](file:///c:/Users/cheve/OneDrive/Desktop/agentra/backend/migrations.sql) directly inside the Supabase SQL Editor.

---

## ⚙️ Local Installation & Development

### Clone the repository
```bash
git clone https://github.com/yourusername/agentra.git
cd agentra
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

---

## 📦 Production Deployment

### Frontend (Vercel)
1. Link your `frontend` directory to Vercel:
   ```bash
   cd frontend
   vercel
   ```
2. Configure Environment Variables matching your auth keys.
3. Deploy!

### Backend (Railway / Render)
1. Deploy using the multi-stage [Dockerfile](file:///c:/Users/cheve/OneDrive/Desktop/agentra/backend/Dockerfile):
   ```bash
   cd backend
   railway up
   ```
2. Inject required environment variables (`ENCRYPTION_KEY`, `GEMINI_API_KEY`, `SUPABASE_JWT_SECRET`, etc.).

---

## ⚡ Deployment Checklist
- [x] Frontend builds cleanly with zero TypeScript errors.
- [x] ESLint checks pass with zero static analysis errors.
- [x] Credentials encrypted dynamically on database writes.
- [x] FastAPI route health checks return `200 OK` on all endpoints.
- [x] SQLite database schema matches production Postgres SQL migration scripts.

---

## 🗺️ Roadmap
- AI Agent Runtime
- Dynamic Tool Discovery
- MCP Integration
- Multi-Agent Collaboration
- Browser Automation
- Voice AI Employees
- Enterprise Workspace
- Mobile Application

---

## 📄 License
MIT License

---

## 👨‍💻 Author
**Chevella Praneeth Reddy**  
Building the future of AI Employees.
