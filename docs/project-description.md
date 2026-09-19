# Project Description — AI Sustainability Discovery

## Project Title
**AI Sustainability Discovery** — An AI-powered sustainability problem reporting and action platform with Retrieval-Augmented Generation (RAG) and Autonomous ReAct AI Agent.

---

## Problem Statement
Urban and campus communities generate sustainability problems daily — overflowing waste bins, water leaks, inefficient energy use — yet most observations go unreported or are lost in informal communication channels. Without structured data and documented knowledge, decision-makers cannot prioritize interventions or measure whether actions produce results.

This project addresses the gap between observation and action. By providing a structured reporting platform with Retrieval-Augmented Generation (RAG), real campus survey evidence integration, an Autonomous ReAct AI Agent, and AI-assisted analysis, it enables community members to submit sustainability problems with photo evidence, receive grounded AI insights (root cause, priority, recommended action, retrieved sources, agent tool steps), and track each issue from submission through to verified resolution. This directly supports SDG 11: Sustainable Cities and Communities.

---

## Detailed Solution

AI Sustainability Discovery is a full-stack web application that implements the following workflow:

**Discover → Retrieve Knowledge (RAG) → ReAct Agentic Analysis → Human Action → Measure Impact**

### User Journey
1. A community member observes a sustainability problem (e.g., overflowing waste bins near a campus entrance).
2. They submit a report with description, category, location, and optional photo evidence.
3. The report is stored in a structured SQLite database with status `submitted`.
4. The Autonomous ReAct Agent (`agent_service.py`) dynamically selects tools (`get_report`, `retrieve_knowledge`, `get_report_history`, `get_dashboard_stats`).
5. The RAG service retrieves relevant sustainability knowledge chunks (including campus survey evidence from `campus-survey.md`) from `Backend/data/knowledge/` using local vector similarity search (`sentence-transformers` / FAISS).
6. The AI service constructs a grounded prompt and analyzes the report, returning:
   - Category classification
   - Priority score (1–10)
   - Confidence level (0–100%)
   - Probable root cause
   - Recommended action
   - Qualitative impact estimate
   - Retrieved knowledge sources (source filename, relevance score, excerpt)
   - Agent tool selection rationale & execution activity log
7. A human reviewer opens the Admin Panel ([`/admin`](http://localhost:3000/admin)) and moves the report through lifecycle stages with notes:
   `submitted → under_review → action_planned → in_progress → resolved → verified`
8. Every status transition is recorded in a status history log with optional inspector comments.
9. The Impact Dashboard shows aggregate metrics from real database data.

### Technical Architecture
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts
- **Backend**: FastAPI (Python), SQLAlchemy ORM, SQLite database
- **RAG Engine**: `Backend/app/services/rag_service.py` using `sentence-transformers` (`all-MiniLM-L6-v2`) and FAISS vector search (`IndexFlatIP`)
- **Agent Service**: `Backend/app/services/agent_service.py` introducing a controlled ReAct Agent tool loop
- **AI Service**: `Backend/app/services/ai_service.py` supporting Google Gemini API (`GEMINI_API_KEY`), IBM watsonx, and structured RAG simulation fallback
- **Storage**: Local file storage for photo uploads, SQLite for report data, status history, and retrieved sources

---

## AI & RAG Elements

### RAG Knowledge Base (`Backend/data/knowledge/`)
- `campus-survey.md`: Real campus survey reported observations covering electricity, water, plastic, food, and paper waste
- `sdg11.md`: Sustainable Cities and Communities targets & urban planning actions
- `waste-management.md`: Solid waste segregation, circular economy, and composting
- `water-conservation.md`: Infrastructure leak repairs, float valves, rainwater harvesting
- `energy-efficiency.md`: Smart HVAC, LED lighting retrofits, solar power
- `air-quality.md`: Idling bans, dust suppression, natural green bio-filters
- `sustainable-cities.md`: Active transport corridors, green urban planning
- `responsible-consumption.md`: Procurement policies, e-waste collection, paperless workflows
- `responsible-ai.md`: Ethical AI principles, human oversight, transparency

### Retrieval & AI Agent Execution Flow
1. **Tool Selection**: ReAct Agent evaluates report context and selects tools (`get_report`, `retrieve_knowledge`, `get_report_history`, `get_dashboard_stats`).
2. **Vector Retrieval**: Top-3 relevant chunks are retrieved from the knowledge base with similarity match scores.
3. **Grounded Prompt**: Retrieved chunks are injected into the prompt as supporting context, separating user facts from retrieved knowledge.
4. **AI Generation & Fallback**: Called via Google Gemini API (if key present), watsonx, or structured local RAG simulation fallback.
5. **Validation & UI**: Output validated via Pydantic and displayed in frontend under "Knowledge Used", "Agent Activity", and "What is RAG?".

---

## Target Users
1. **Students & Campus Community** — observing and reporting sustainability issues on campus
2. **Campus Sustainability Officers / Reviewers** — reviewing reports in Admin Panel, setting action plans, and managing resolutions
3. **Community Members** — reporting local urban sustainability problems
4. **Local Government / NGOs** — monitoring and resolving city-level issues

---

## SDG Alignment

**Primary: SDG 11 — Sustainable Cities and Communities**
- Data-driven identification and resolution of urban environmental problems.

**Secondary:**
- SDG 6 (Clean Water and Sanitation): Water leak and drainage reporting
- SDG 7 (Affordable and Clean Energy): Energy efficiency retrofits
- SDG 12 (Responsible Consumption and Production): Waste segregation and circular economy
- SDG 13 (Climate Action): Reduction of emissions and urban heat island effects

---

## Anticipated / Actual Impact

**Actual** (prototype stage):
- Real local RAG vector retrieval providing grounded recommendations with source attribution.
- Controlled ReAct Agent tool-selection logic.
- Structured, trackable sustainability problem reporting.
- Status history providing accountability and transparency.
- Dashboard giving real-time metrics of sustainability issue resolution.

**Anticipated** (with community adoption):
- Reduced response time from problem identification to resolution.
- Data foundation for campus sustainability planning.
- Increased student engagement in sustainability governance.
