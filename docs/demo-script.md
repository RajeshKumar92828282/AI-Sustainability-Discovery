# Demo Script — AI Sustainability Discovery
## 2–3 Minute Demo for 1M1B Submission

---

### 0:00 — The Problem (0:00–0:20)

**[Show home page]**

"Every day, students and community members notice sustainability problems around them — overflowing waste bins, water leaks, poor air quality, energy being wasted. But most of these observations go unreported, get lost in group chats, or never reach the people who can fix them.

Without structured data and documented knowledge, there's no priority, no accountability, and no way to measure whether anything actually improved.

AI Sustainability Discovery changes that."

---

### 0:20 — The Solution & RAG Architecture (0:20–0:40)

**[Point to workflow on home page: Discover → RAG Knowledge Retrieval → Grounded AI Analysis → Human Action → Measure Impact]**

"Our platform implements Retrieval-Augmented Generation (RAG).

When a community member reports a problem, the system first retrieves relevant sustainability knowledge from our 8 project knowledge documents — covering waste management, energy, water, air quality, SDG 11, and responsible AI.

This knowledge grounds the AI analysis in documented solutions rather than relying on unverified general model knowledge."

---

### 0:40 — Submitting a Report (0:40–1:00)

**[Navigate to: Report a Sustainability Issue → New Report form]**

"Let me show you a real submission. I'm going to report a waste management issue — overflowing bins near the campus entrance."

**[Type description: 'Overflowing waste bins near the college entrance are causing unmanaged waste accumulation.', select category: Waste, enter location: College Entrance]**

**[Upload photo]**

**[Click: Submit Sustainability Report]**

"Report submitted. We're taken directly to its detail page."

---

### 1:00 — Photo Evidence (1:00–1:15)

**[Show the evidence section on the report detail page]**

"The photo is stored and served securely. Notice how it's labelled 'User-Provided Photo Evidence' — clearly separate from AI interpretation."

---

### 1:15 — Running RAG AI Analysis (1:15–1:40)

**[Click: Run AI Analysis button]**

"Now I'll trigger AI analysis. In the background, our local RAG vector retrieval engine (`rag_service.py`) searches our knowledge base, finds matching chunks, and passes them into the AI grounding prompt."

**[Analysis results appear]**

"Look at what we get:
- AI Priority Score: 8 out of 10 — High
- AI Confidence: 85%
- Probable Root Cause: Insufficient waste collection frequency
- Recommended Action: Increase collection frequency & install 3-bin source segregation units
- Knowledge Used: `waste-management.md` (92% Match) & `sdg11.md` (67% Match)
- What is RAG explanation panel"

"The 'Knowledge Used' section shows exact document sources, match percentages, and retrieved excerpts — complete transparency!"

---

### 1:40 — Status Lifecycle Tracking (1:40–2:15)

**[Show status timeline: Submitted → Under Review → Action Planned → In Progress → Resolved → Verified]**

"AI assists decision-making — it does not make operational decisions. Only a human can update status.

Let's transition this report:
Submitted → Under Review → Action Planned → In Progress → Resolved → Verified."

**[Select statuses and show real-time history log]**

---

### 2:15 — Impact Dashboard & Responsible AI (2:15–2:55)

**[Navigate to: Impact Dashboard]**

"The Impact Dashboard shows real data from the database — no fabricated numbers. We track active vs resolved issues and distribution across categories."

**[Scroll to Responsible AI section]**

"Our Responsible AI safeguards include:
- Grounded RAG Retrieval
- Transparent Source Attribution
- Human Oversight Required
- Confidence & Low-Knowledge Warnings
- Privacy & Honest Labelling"

---

### 2:55 — Closing (2:55–3:00)

**[Return to home page]**

"AI Sustainability Discovery turns informal observations into grounded, transparent, AI-assisted action — supporting SDG 11: Sustainable Cities and Communities.

Thank you."
