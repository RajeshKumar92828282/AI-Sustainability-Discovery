# 📚 AI Sustainability Discovery — Documentation Hub

Welcome to the central documentation portal for the **AI Sustainability Discovery Platform** (1M1B AI for Sustainability Virtual Internship Project in collaboration with IBM SkillsBuild & AICTE).

---

## 🧭 Documentation Index

| Document | Description | Key Topics |
|---|---|---|
| 📄 [**Project Description**](project-description.md) | High-level summary of the platform | Core Features, User Journey, Architecture |
| 🔍 [**Problem Discovery & SDG Alignment**](problem-discovery.md) | Context, problem statement & SDGs | Campus Survey Evidence, SDG 11/6/7/12/13 Alignment |
| ⚙️ [**Project Requirements & Specs**](project-requirements.md) | Technical requirements & database schema | Functional & Non-Functional Requirements, DB Schema, Env Vars |
| ⚡ [**API Documentation**](api-documentation.md) | REST API reference & schemas | Endpoints, Schemas, cURL Examples, Error Codes |
| 🤖 [**AI & RAG Workflow Architecture**](ai-workflow.md) | Deep-dive into AI & RAG engines | FAISS Vector Search, ReAct Agent Tools, Fallback Pipeline |
| 🛡️ [**Responsible AI Framework**](responsible-ai.md) | Ethical guidelines & governance | Human-in-the-loop, RAG Grounding, Privacy |
| 📊 [**Impact Assessment**](impact.md) | Sustainability impact metrics | Actual Prototype Results & Scalability Model |
| 🎬 [**Step-by-Step Demo Script**](demo-script.md) | Interactive demonstration walkthrough | 5-Minute Live Presentation & Walkthrough |
| 📢 [**Presentation Outline**](presentation-outline.md) | Pitch deck structure | 10-Slide Structure & Key Talking Points |
| 📝 [**Submission Summary**](submission-content.md) | Formal internship submission specs | Project Details, Team Info, Verification Links |

---

## 🛠️ Quick System Start

```bash
# 1. Backend Setup & Startup
cd Backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# 2. Run Automated Pytest Suite
python -m pytest tests/ -v

# 3. Frontend Setup & Startup (in another terminal)
cd frontend
npm install
npm run dev
```

- **Frontend Application:** [`http://localhost:3000`](http://localhost:3000)
- **Admin Review Panel:** [`http://localhost:3000/admin`](http://localhost:3000/admin)
- **Impact Dashboard:** [`http://localhost:3000/dashboard`](http://localhost:3000/dashboard)
- **Interactive API Docs:** [`http://127.0.0.1:8000/docs`](http://127.0.0.1:8000/docs)
