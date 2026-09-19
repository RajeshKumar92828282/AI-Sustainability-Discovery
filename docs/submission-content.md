# 1M1B Submission Content — Final Release

## 1. Project Title
**AI Sustainability Discovery** — An AI-powered sustainability problem reporting and action platform with Retrieval-Augmented Generation (RAG) and Autonomous ReAct AI Agent.

---

## 2. SDG Alignment

**Primary SDG**: SDG 11 — Sustainable Cities and Communities

**Secondary SDGs**:
- SDG 3 — Good Health and Well-being (waste & air quality reports)
- SDG 6 — Clean Water and Sanitation (water leak reports)
- SDG 7 — Affordable and Clean Energy (energy waste reports)
- SDG 12 — Responsible Consumption and Production (food waste, circular economy)
- SDG 13 — Climate Action (emissions reduction & climate resilience)

---

## 3. Technologies Used

**Frontend:**
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Recharts (data visualization)
- Lucide React (icons)

**Backend:**
- FastAPI (Python)
- SQLAlchemy ORM
- SQLite (database)
- Pydantic v2 (schema validation)
- Uvicorn (ASGI server)

**RAG & AI:**
- Custom RAG service (`Backend/app/services/rag_service.py`)
- Vector retrieval: `sentence-transformers` (`all-MiniLM-L6-v2`) and FAISS vector index (`IndexFlatIP`)
- Autonomous ReAct Agent service (`Backend/app/services/agent_service.py`) with 4 read-only tools (`get_report`, `retrieve_knowledge`, `get_report_history`, `get_dashboard_stats`)
- AI providers: Google Gemini API (`GEMINI_API_KEY`) / IBM watsonx with deterministic fallback
- 9 Sustainability Knowledge Base documents in `Backend/data/knowledge/` (including `campus-survey.md`)

---

## 4. Problem Statement
Urban and campus communities generate sustainability problems daily — overflowing waste bins, water leaks, inefficient energy use — yet most observations go unreported or are lost in informal communication channels. Without structured data and documented knowledge, decision-makers cannot prioritize interventions or measure whether actions produce results. This project addresses the gap between observation and action. By providing a structured reporting platform with Retrieval-Augmented Generation (RAG), real campus survey evidence, an Autonomous ReAct AI Agent, and an Admin Panel, it enables community members to submit sustainability problems with photo evidence, receive grounded AI insights, and track each issue from submission through to verified resolution. This directly supports SDG 11: Sustainable Cities and Communities.

---

## 5. Detailed Solution

See [project-description.md](./project-description.md) for the full solution write-up.

**Summary:**
1. Community members submit sustainability problem reports with description, category, location, and photo evidence.
2. The ReAct Agent selects tools and queries the RAG engine for knowledge chunks (including `campus-survey.md` campus evidence).
3. The AI service constructs a grounded prompt and generates priority score (1–10), confidence, root cause, recommended action, impact estimate, and retrieved knowledge sources.
4. Human reviewer reviews the report in Admin Panel (`/admin`) and moves it through lifecycle stages with notes: `Submitted → Under Review → Action Planned → In Progress → Resolved → Verified`.
5. Every status change is logged with timestamp in a status history table.
6. Impact Dashboard shows aggregate metrics from real database data.

---

## 6. AI & RAG Elements

**Implemented AI & RAG Capabilities:**
- Real local vector retrieval using `sentence-transformers` and FAISS.
- 9 curated sustainability knowledge base documents (`campus-survey.md`, `sdg11.md`, `waste-management.md`, etc.).
- Controlled ReAct Agent tool execution loop (`agent_service.py`).
- Grounded prompt engineering separating user report facts from retrieved context and survey observations.
- Google Gemini API / IBM watsonx support with local fallback.
- Pydantic-validated structured outputs.
- Source transparency UI ("Knowledge Used" section displaying source filenames, `📋 Campus Survey Evidence` badges, match percentages, and excerpts).
- Low-confidence and limited-knowledge warning banners.

---

## 7. Target Users

1. **Students / Campus Community Members** — primary reporters of sustainability issues
2. **Campus Sustainability Officers / Reviewers** — reviewers and action planners managing reports via Admin Panel (`/admin`)
3. **Local Community Members** — urban sustainability observers
4. **Municipal / NGO Officers** — city-level sustainability tracking

---

## 8. Anticipated / Actual Impact

**Actual (prototype)**:
- Real local RAG vector retrieval providing grounded recommendations with source attribution.
- Controlled ReAct Agent tool execution.
- Structured report database replacing ad-hoc informal reporting.
- Admin Panel enabling human status management with inspector notes.
- Full lifecycle tracking with history log creating accountability.
- Real-time dashboard providing aggregate visibility.

---

## 9. Responsible AI Considerations

See [responsible-ai.md](./responsible-ai.md) for full responsible AI documentation.

**Summary of Principles:**
1. Grounded RAG Retrieval — backed by 9 project knowledge documents including `campus-survey.md`.
2. Source Transparency — "Knowledge Used" section displays exact sources, match scores, and survey badges.
3. ReAct Agent Transparency — read-only tools (`get_report`, `retrieve_knowledge`, `get_report_history`, `get_dashboard_stats`).
4. Human Oversight — status updates human-only via Admin Panel (`/admin`) with inspector notes.
5. Confidence Transparency — confidence % shown, low-confidence flagged.
6. Evidence-based Analysis — user evidence separated from AI interpretation.
7. Privacy Protection — no personal data required.
8. Honest Labelling — all AI outputs clearly marked as AI-assisted.
9. Honest Impact Claims — qualitative estimates only, no fabricated numbers.
