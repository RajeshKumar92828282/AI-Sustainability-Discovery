# AI Sustainability Discovery Platform

> **1M1B AI for Sustainability Virtual Internship Project**  
> *In collaboration with IBM SkillsBuild & AICTE*  
> **Submission Deadline:** 21 September 2026  
> **SDG Alignment:** Goal 11 (Sustainable Cities and Communities), Goal 6 (Clean Water and Sanitation), Goal 7 (Affordable & Clean Energy), Goal 12 (Responsible Consumption & Production), Goal 13 (Climate Action)

---

## 📌 Project Overview

**AI Sustainability Discovery** is an end-to-end AI-powered platform designed to crowdsource, analyze, prioritize, and track real-world sustainability issues across local communities using **Retrieval-Augmented Generation (RAG)** and an **Autonomous ReAct AI Agent**.

The platform follows a 5-step operational workflow:
$$\text{Discover} \longrightarrow \text{Understand (RAG \& Agent)} \longrightarrow \text{Prioritize} \longrightarrow \text{Act (Human Review)} \longrightarrow \text{Measure Impact}$$

---

## ✨ Key Features

1. **Community Issue Reporting (`Discover`)**
   - Public issue submission form with description, category, location, and optional photo evidence validation (JPG/PNG < 5MB).
   - Multi-category classification (Waste Management, Water Conservation, Energy Efficiency, Food Sustainability, Urban Transport, Air Quality).

2. **RAG Vector Knowledge Engine (`Retrieve Knowledge`)**
   - Vector similarity search using `sentence-transformers` (`all-MiniLM-L6-v2`) and FAISS index (`IndexFlatIP`).
   - 9 curated sustainability knowledge base documents (`Backend/data/knowledge/`), including real **Campus Sustainability Survey evidence** ([`campus-survey.md`](file:///E:/AI-SUSTAINABILITY-DISCOVERY/Backend/data/knowledge/campus-survey.md)).
   - Transparent attribution with relevance percentage, section title, and evidence excerpts.

3. **Autonomous ReAct AI Agent (`Understand` & `Prioritize`)**
   - Controlled tool-selection ReAct agent ([`agent_service.py`](file:///E:/AI-SUSTAINABILITY-DISCOVERY/Backend/app/services/agent_service.py)) with 4 specialized read-only tools:
     - `get_report`: Retrieves report details and location.
     - `retrieve_knowledge`: Queries RAG vector index.
     - `get_report_history`: Reviews report lifecycle status transitions.
     - `get_dashboard_stats`: Checks campus-wide community statistics.
   - Structured JSON analysis: Priority Score (1–10), Confidence Rating (0–100%), Probable Root Cause, Action Recommendation, Qualitative Impact Estimate.
   - Live AI Provider Support (Google Gemini / IBM watsonx) with honest local fallback when credentials are not configured.

4. **Admin & Reviewer Panel (`Act`)**
   - Admin registry dashboard ([`/admin`](http://localhost:3000/admin)) with real-time statistics, category distribution, search, status, and priority filters.
   - Manual status management with optional action notes (e.g. *"Sanitation team notified for inspection"*).
   - 6-Stage Status Lifecycle: `Submitted` $\rightarrow$ `Under Review` $\rightarrow$ `Action Planned` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved` $\rightarrow$ `Verified`.

5. **Analytics & Impact Dashboard (`Measure Impact`)**
   - Real-time data visualisations built with Recharts at [`/dashboard`](http://localhost:3000/dashboard).
   - Reports by status distribution and category breakdown from database metrics.

6. **Responsible AI Framework**
   - Human-in-the-loop guarantee: AI never automatically marks reports as `Resolved` or `Verified`.
   - Campus survey observations explicitly labelled as *respondent-reported evidence*, not verified operational facts.
   - Qualitative impact labelling without fabricated environmental savings.

## 📚 Project Documentation

Comprehensive documentation is available in the [`docs/`](file:///e:/ai-sustainability-discovery/docs/README.md) directory:

- 🧭 [**Documentation Hub Index**](file:///e:/ai-sustainability-discovery/docs/README.md) — Master index of all docs
- ⚡ [**API Documentation**](file:///e:/ai-sustainability-discovery/docs/api-documentation.md) — Endpoints, Schemas, cURL Examples, Error Codes
- 🤖 [**AI & RAG Workflow Architecture**](file:///e:/ai-sustainability-discovery/docs/ai-workflow.md) — FAISS Index, ReAct Agent Tools, Fallback Pipeline
- 🔍 [**Problem Discovery & SDG Alignment**](file:///e:/ai-sustainability-discovery/docs/problem-discovery.md) — Context, Campus Survey Evidence, SDG 11/6/7/12/13
- ⚙️ [**Project Requirements & Specs**](file:///e:/ai-sustainability-discovery/docs/project-requirements.md) — Functional/Non-Functional Specs, DB Schema, Env Vars
- 🛡️ [**Responsible AI Framework**](file:///e:/ai-sustainability-discovery/docs/responsible-ai.md) — Ethical principles, Human-in-the-loop governance
- 📊 [**Impact Assessment**](file:///e:/ai-sustainability-discovery/docs/impact.md) — Prototype results & impact metrics
- 🎬 [**Step-by-Step Demo Script**](file:///e:/ai-sustainability-discovery/docs/demo-script.md) — Interactive walkthrough guide
- 📢 [**Presentation Outline**](file:///e:/ai-sustainability-discovery/docs/presentation-outline.md) — Pitch deck structure
- 📝 [**Submission Summary**](file:///e:/ai-sustainability-discovery/docs/submission-content.md) — Formal submission details

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (React 19, TypeScript, Lucide Icons, Recharts, Tailwind CSS)
- **Backend:** Python FastAPI, SQLite, SQLAlchemy ORM, Pydantic v2
- **RAG Engine:** `sentence-transformers`, `faiss-cpu`, `scikit-learn`
- **Agentic AI:** Autonomous ReAct loop with controlled tool execution (`agent_service.py`)
- **AI Providers:** Google Gemini API (`GEMINI_API_KEY`) / IBM watsonx with deterministic fallback

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

---

### Step 1: Backend Setup & Server Execution

```bash
cd Backend

# 1. Install dependencies
pip install -r requirements.txt

# 2. Start FastAPI Server
uvicorn app.main:app --reload
```

- FastAPI backend running at: `http://127.0.0.1:8000`  
- Interactive Swagger API Docs: `http://127.0.0.1:8000/docs`

---

### Step 2: Run Automated Test Suite

In a separate terminal window:
```bash
cd Backend
python -m pytest tests/ -v
```
Runs 20 automated pytest tests verifying RAG vector retrieval, campus survey retrieval, agent tool selection, status non-mutation, and API endpoints.

---

### Step 3: Frontend Setup & Execution

In another terminal window:
```bash
cd frontend

# 1. Build frontend (verifies TypeScript & routes)
npm run build

# 2. Start Next.js Development Server
npm run dev
```

- Access Application: `http://localhost:3000`
- Access Admin Panel: `http://localhost:3000/admin`
- Access Impact Dashboard: `http://localhost:3000/dashboard`

---

## 💻 Step-by-Step Demo Workflow

1. **Submit Issue**: Open `http://localhost:3000/report/new` and submit a report (e.g., *"Overflowing waste bins near the college entrance"*).
2. **Run AI Agent**: Open report detail page and click **Run AI Agent Analysis**. Observe tool execution, RAG evidence retrieval, and priority score.
3. **Inspect RAG Knowledge**: Review the **Knowledge Used** section displaying `campus-survey.md` and `waste-management.md` excerpts with relevance percentages.
4. **Admin Review**: Open `http://localhost:3000/admin`. Search and filter reports. Advance report status from `Submitted` $\rightarrow$ `Under Review` $\rightarrow$ `Action Planned` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved` $\rightarrow$ `Verified` with custom inspector notes.
5. **Impact Dashboard**: Open `http://localhost:3000/dashboard` to verify real-time status and category distribution metrics.

---

## 📄 License & Attribution
Prepared for the **1M1B AI for Sustainability Virtual Internship 2026** in partnership with IBM SkillsBuild & AICTE.
