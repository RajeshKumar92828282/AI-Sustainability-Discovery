# Presentation Outline — AI Sustainability Discovery
## 1M1B AI for Sustainability Virtual Internship

---

### Slide 1 — Project Title

**AI Sustainability Discovery**
*An AI-powered sustainability problem reporting and action platform with Retrieval-Augmented Generation (RAG)*

1M1B AI for Sustainability · IBM SkillsBuild · AICTE
SDG 11 — Sustainable Cities and Communities

[Team/Student Name] | [Institution] | September 2026

---

### Slide 2 — Problem Statement

**The Observation-Action Gap**

- Sustainability problems occur daily in urban and campus environments.
- Most are never formally reported or are lost in informal channels (group chats, verbal reports).
- Without structured data and documented knowledge: no priority, no accountability, no measurement.

**Result**: Problems persist because the right people never get the right information and evidence-based guidance in a usable format.

---

### Slide 3 — SDG Alignment

**Primary: SDG 11 — Sustainable Cities and Communities**
> "Make cities inclusive, safe, resilient, and sustainable"

| Alignment Area | Our Platform |
|---|---|
| Urban environmental problems | Structured reporting and tracking |
| Evidence-based decision making | RAG-grounded AI priority & root cause |
| Knowledge transparency | Source attribution ("Knowledge Used") |
| Accountability | Status history and lifecycle tracking |

Secondary SDGs: SDG 3 (Health), SDG 6 (Water), SDG 7 (Energy), SDG 12 (Consumption), SDG 13 (Climate Action).

---

### Slide 4 — Target Users

| User | Role |
|---|---|
| **Students / Community Members** | Report sustainability problems with photo evidence |
| **Campus Sustainability Officers** | Review RAG analysis, plan and track action |
| **Local Community Residents** | Report urban environmental issues |
| **Municipal / NGO Officers** | City-level tracking and resolution |

---

### Slide 5 — Proposed Solution & RAG Architecture

**AI Sustainability Discovery with Real RAG**

A full-stack web platform implementing the workflow:

```
Discover → Retrieve Knowledge (RAG) → Grounded AI Analysis → Human Action → Measure Impact
```

**Core capabilities:**
1. Structured report submission with photo evidence
2. Real RAG local vector similarity retrieval (`sentence-transformers` / FAISS / TF-IDF)
3. 8 curated sustainability knowledge base documents (`Backend/data/knowledge/`)
4. Grounded AI analysis (priority score, root cause, recommended action)
5. Transparent "Knowledge Used" UI with source files, match scores, and excerpts
6. Report lifecycle tracking (6 status stages) with audit history log
7. Impact Dashboard with real database metrics

---

### Slide 6 — Product Workflow

```
[User] ──► Submit Report ──► [Database]
                                │
                        ──► RAG Retriever ──► [Backend/data/knowledge/]
                                │
                    Retrieved Chunks + Scores
                                │
                        ──► AI Model (Gemini / RAG Grounded) ──►
                                │
                    Priority Score (1-10)
                    Confidence (0-100%)
                    Probable Root Cause
                    Recommended Action
                    Knowledge Used (Sources)
                                │
                        ──► Human Review ──►
                                │
                    Status: Under Review → Action Planned → In Progress → Resolved → Verified ──► Dashboard
```

---

### Slide 7 — RAG & AI Architecture

**RAG Service** (`rag_service.py`)
- Loads & chunks 8 knowledge files (`sdg11.md`, `waste-management.md`, `water-conservation.md`, etc.).
- Vector Embeddings: `SentenceTransformer` (`all-MiniLM-L6-v2`) with FAISS index & TF-IDF fallback.
- Retrieves Top-3 matching context chunks + similarity scores.

**AI Service** (`ai_service.py`)
- Builds Grounded Prompt separating report facts from retrieved context.
- Integrates Google Gemini API (`GEMINI_API_KEY`) or structured local RAG simulation fallback.
- Validates output using Pydantic schemas.

---

### Slide 8 — Responsible AI & Source Transparency

**Built-in Responsible AI Principles:**

1. ✅ **RAG Grounding**: AI outputs grounded in 8 documented project files.
2. ✅ **Source Transparency**: "Knowledge Used" UI displays exact filenames, match percentages, and excerpts.
3. ✅ **Human Oversight**: Status updates human-only (AI cannot mark resolved).
4. ✅ **Confidence Transparency**: % shown, low-confidence/low-knowledge flagged.
5. ✅ **Evidence Separation**: User evidence separate from AI interpretation.
6. ✅ **Privacy Protection**: No personal data collected.
7. ✅ **Honest Labelling**: All AI outputs clearly marked as AI-assisted.
8. ✅ **Honest Impact Claims**: Qualitative only, no fabricated numbers.

---

### Slide 9 — Action Tracking & Impact Dashboard

**6-Stage Report Lifecycle:**
`Submitted → Under Review → Action Planned → In Progress → Resolved → Verified`

- Every status change logged with timestamp in database.
- Dashboard shows real database counts (Reports Resolved, Active Issues, Category Breakdown).
- Prominent Honest Impact Note explaining why qualitative metrics are used.

---

### Slide 10 — Demo & Run Instructions

**Run instructions:**
```bash
# Backend
cd Backend
uvicorn app.main:app --reload

# Tests
python -m pytest

# Frontend
cd frontend
npm run dev
```
