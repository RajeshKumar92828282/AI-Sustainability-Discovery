# Demo Script — AI Sustainability Discovery
## 3-Minute Live Submission & Review Demo

---

### 0:00 — Problem & Workflow Overview (0:00–0:25)

**[Show home page at http://localhost:3000]**

"Every day, students and community members observe sustainability problems around them — overflowing waste bins, water leaks, unmanaged energy waste. But most observations go unreported or get lost in informal communication channels.

Without structured data, there is no priority, no accountability, and no way to measure impact.

AI Sustainability Discovery solves this through a 5-step operational workflow:
**Discover → Understand → Prioritize → Act → Measure Impact**"

---

### 0:25 — Submitting a Public Sustainability Issue (0:25–0:50)

**[Click: Report an Issue on nav bar]**

"Community users can submit issues via a clean form with description, category, location, and optional photo evidence. No public survey upload is permitted — public input remains focused on real-world issue reporting."

**[Enter Description: "Overflowing waste bins near the college entrance are causing unmanaged waste accumulation."]**
**[Select Category: Waste | Location: College Entrance]**
**[Click: Submit Sustainability Report]**

"Our report is created, assigned ID #1, set to status `Submitted`, and redirected to the detail page."

---

### 0:50 — Running Autonomous ReAct AI Agent (0:50-[1:25])

**[On report detail page, click: Run AI Agent Analysis]**

"Now watch our autonomous ReAct AI Agent (`agent_service.py`) run. The agent dynamically evaluates report context and selects specialized tools:
- `get_report`: Reads report description and location
- `retrieve_knowledge`: Queries our vector index (`SentenceTransformer` + `FAISS`)
- `get_report_history`: Reviews past lifecycle status transitions
- `get_dashboard_stats`: Checks campus-wide community context"

**[Show Agent Activity Log & Knowledge Used]**

"Under **Knowledge Used**, notice how RAG retrieves evidence from `campus-survey.md` labelled **📋 Campus Survey Evidence**, alongside general guidance from `waste-management.md` and `sdg11.md` with exact relevance percentages and excerpts."

---

### 1:25 — Grounded AI Analysis Output (1:25–1:55)

**[Point to AI Analysis cards]**

"The agent synthesizes the evidence and outputs:
- **AI-Assisted Priority**: 8/10 (High)
- **AI Confidence**: 85%
- **Probable Root Cause**: Insufficient collection frequency during peak hours based on campus survey evidence.
- **Recommended Action**: Implement 3-bin source segregation units and schedule twice-daily collection.
- **Impact Estimate**: Qualitative estimate highlighting reduced litter and improved hygiene."

---

### 1:55 — Admin & Reviewer Panel & Human-in-the-Loop (1:55–2:35)

**[Navigate to http://localhost:3000/admin]**

"Now we switch to the Admin & Reviewer Panel. The AI never changes report status automatically — human reviewers maintain full operational decision control.

Here in the Admin Panel:
- Real-time statistics show total, submitted, under review, in progress, resolved, verified, and high priority counts.
- Category distribution bar lets us filter by issue type.
- Interactive report registry table supports searching and status/priority filtering."

**[Click: Update Status on Report #1]**

"We transition status step-by-step:
`Submitted` → `Under Review` → `Action Planned` → `In Progress` → `Resolved` → `Verified`
And add an inspector note: *'Sanitation team notified for inspection.'*"

**[Show Status History Timeline with note]**

---

### 2:35 — Impact Dashboard & Responsible AI (2:35–3:00)

**[Navigate to http://localhost:3000/dashboard]**

"Finally, our Impact Dashboard displays real-time metrics pulled directly from SQLite database records — no fake numbers.

Our Responsible AI safeguards ensure:
1. Human oversight required for operational status transitions.
2. Campus survey observations clearly labelled as respondent-reported evidence.
3. Transparent confidence ratings and qualitative impact estimates.

AI Sustainability Discovery transforms informal observations into grounded, actionable, and verified sustainability impact — aligned with UN SDG 11."
