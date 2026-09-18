# Project Description — AI Sustainability Discovery

## Project Title
**AI Sustainability Discovery** — An AI-powered sustainability problem reporting and action platform with Retrieval-Augmented Generation (RAG).

---

## Problem Statement
Urban and campus communities generate sustainability problems daily — overflowing waste bins, water leaks, inefficient energy use — yet most observations go unreported or are lost in informal communication channels. Without structured data and documented knowledge, decision-makers cannot prioritize interventions or measure whether actions produce results.

This project addresses the gap between observation and action. By providing a structured reporting platform with Retrieval-Augmented Generation (RAG) and AI-assisted analysis, it enables community members to submit sustainability problems with photo evidence, receive grounded AI insights (root cause, priority, recommended action, retrieved sources), and track each issue from submission through to verified resolution. This directly supports SDG 11: Sustainable Cities and Communities.

---

## Detailed Solution

AI Sustainability Discovery is a full-stack web application that implements the following workflow:

**Discover → Retrieve Knowledge (RAG) → Grounded AI Analysis → Human Action → Measure Impact**

### User Journey
1. A community member observes a sustainability problem (e.g., overflowing waste bins near a campus entrance).
2. They submit a report with description, category, location, and optional photo evidence.
3. The report is stored in a structured SQLite database with status `submitted`.
4. The RAG service retrieves relevant sustainability knowledge chunks from `Backend/data/knowledge/` using local vector similarity search (`sentence-transformers` / FAISS).
5. The AI service constructs a grounded prompt and analyzes the report, returning:
   - Category classification
   - Priority score (1–10)
   - Confidence level (0–100%)
   - Probable root cause
   - Recommended action
   - Qualitative impact estimate
   - Retrieved knowledge sources (source filename, relevance score, excerpt)
6. A human reviewer reviews the AI output and moves the report through lifecycle stages:
   `submitted → under_review → action_planned → in_progress → resolved → verified`
7. Every status transition is recorded in a status history log.
8. The Impact Dashboard shows aggregate metrics from real database data.

### Technical Architecture
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts
- **Backend**: FastAPI (Python), SQLAlchemy ORM, SQLite database
- **RAG Engine**: `Backend/app/services/rag_service.py` using `sentence-transformers` (`all-MiniLM-L6-v2`) and FAISS vector search with TF-IDF cosine fallback
- **AI Service**: `Backend/app/services/ai_service.py` supporting Google Gemini API (`GEMINI_API_KEY`) and structured RAG simulation fallback
- **Storage**: Local file storage for photo uploads, SQLite for report data and retrieved sources

---

## AI & RAG Elements

### RAG Knowledge Base (`Backend/data/knowledge/`)
- `sdg11.md`: Sustainable Cities and Communities targets & urban planning actions
- `waste-management.md`: Solid waste segregation, circular economy, and composting
- `water-conservation.md`: Infrastructure leak repairs, float valves, rainwater harvesting
- `energy-efficiency.md`: Smart HVAC, LED lighting retrofits, solar power
- `air-quality.md`: Idling bans, dust suppression, natural green bio-filters
- `sustainable-cities.md`: Active transport corridors, green urban planning
- `responsible-consumption.md`: Procurement policies, e-waste collection, paperless workflows
- `responsible-ai.md`: Ethical AI principles, human oversight, transparency

### Retrieval & AI Execution Flow
1. **Query Formulation**: Report category and description are formatted into a search query.
2. **Vector Retrieval**: Top-3 relevant chunks are retrieved from the knowledge base with similarity match scores.
3. **Grounded Prompt**: Retrieved chunks are injected into the prompt as supporting context, separating user facts from retrieved knowledge.
4. **AI Generation & Fallback**: Called via Google Gemini API (if key present) or structured local RAG simulation.
5. **Validation & UI**: Output validated via Pydantic and displayed in frontend under "Knowledge Used" and "What is RAG?".

---

## Target Users
1. **Students** — observing and reporting sustainability issues on campus
2. **Campus Sustainability Officers** — reviewing reports and planning action
3. **Community Members** — reporting local urban sustainability problems
4. **Local Government / NGOs** — monitoring and resolving city-level issues

---

## SDG Alignment

**Primary: SDG 11 — Sustainable Cities and Communities**
- Data-driven identification and resolution of urban environmental problems.

**Secondary:**
- SDG 3 (Good Health and Well-being): Waste and air quality mitigation
- SDG 6 (Clean Water and Sanitation): Water leak and drainage reporting
- SDG 7 (Affordable and Clean Energy): Energy efficiency retrofits
- SDG 12 (Responsible Consumption and Production): Waste segregation and circular economy
- SDG 13 (Climate Action): Reduction of emissions and urban heat island effects

---

## Anticipated / Actual Impact

**Actual** (prototype stage):
- Real local RAG vector retrieval providing grounded recommendations with source attribution.
- Structured, trackable sustainability problem reporting.
- Status history providing accountability and transparency.
- Dashboard giving real-time metrics of sustainability issue resolution.

**Anticipated** (with community adoption):
- Reduced response time from problem identification to resolution.
- Data foundation for campus sustainability planning.
- Increased student engagement in sustainability governance.
