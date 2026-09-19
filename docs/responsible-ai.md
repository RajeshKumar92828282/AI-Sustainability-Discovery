# Responsible AI — AI Sustainability Discovery

## Overview

AI Sustainability Discovery uses Artificial Intelligence, Retrieval-Augmented Generation (RAG), and an Autonomous ReAct AI Agent to assist human decision-making in sustainability problem management. This document outlines the responsible AI principles embedded in the platform's design.

---

## 1. Retrieval-Augmented Generation (RAG) Grounding

**Principle**: AI analysis must be grounded in verified project knowledge documents, avoiding hallucinated facts or fabricated policies.

**Implementation**:
- Prior to AI generation, the system retrieves relevant sustainability knowledge from `Backend/data/knowledge/` (`campus-survey.md`, `sdg11.md`, `waste-management.md`, `water-conservation.md`, etc.).
- Retrieved context is explicitly provided in the AI grounding prompt.
- Source documents, excerpts, section titles, and similarity match scores are displayed in the "Knowledge Used" UI section.
- **Campus survey evidence** ([`campus-survey.md`](file:///E:/AI-SUSTAINABILITY-DISCOVERY/Backend/data/knowledge/campus-survey.md)) is explicitly labelled with a `📋 Campus Survey Evidence` badge and treated as *respondent-reported evidence*, not verified operational facts.
- If retrieval confidence is low, a warning banner explicitly advises: *"Limited supporting knowledge was retrieved. Human review recommended."*

---

## 2. Human Oversight & Operational Status Control

**Principle**: AI assists, humans decide. AI must NEVER automatically mark a report as `Resolved` or `Verified`.

**Implementation**:
- AI analysis is a starting point for human review, not a final decision.
- Status transitions (e.g., `Submitted` → `Under Review` → `Action Planned` → `In Progress` → `Resolved` → `Verified`) can only be made by a human reviewer through the Admin Panel ([`/admin`](http://localhost:3000/admin)) or report detail page.
- Every status update allows an optional action note (e.g., *"Sanitation team notified for inspection"*), stored in `report_status_history`.
- A report cannot be marked `Resolved` or `Verified` based solely on AI output.
- The UI explicitly labels AI outputs as "AI-Assisted", "Probable", and "Qualitative".

---

## 3. Autonomous ReAct Agent Transparency

**Principle**: Tool execution and agent reasoning must be transparent, controlled, and read-only.

**Implementation**:
- The ReAct agent loop ([`agent_service.py`](file:///E:/AI-SUSTAINABILITY-DISCOVERY/Backend/app/services/agent_service.py)) accesses 4 strictly read-only tools (`get_report`, `retrieve_knowledge`, `get_report_history`, `get_dashboard_stats`).
- The agent NEVER performs database writes or changes report status.
- Tool selection rationale and step-by-step activity summaries are displayed transparently under "Agent Activity".
- Internal chain-of-thought is not exposed; only actionable tool results and recommendations are presented.

---

## 4. Confidence & Evidence Transparency

**Principle**: Every AI output includes a confidence level, source relevance, and clear separation of user evidence.

**Implementation**:
- AI analysis returns a confidence score between 0.0 and 1.0, displayed as a percentage in the UI (e.g., 85%).
- When confidence is below 70%, the UI explicitly states: *"Human review recommended"*.
- User-provided photo evidence is displayed separately from AI interpretations.
- Retrieved sources are displayed transparently with exact filenames and excerpts.

---

## 5. Privacy Protection

**Principle**: No unnecessary personal data is collected.

**Implementation**:
- Reports require only: description, category, optional location, optional photo.
- No user accounts, names, emails, or personal identifiers are required for reporting.
- Photos capture places and environmental issues, not individuals.

---

## 6. Honest Labelling & Qualitative Impact

**Principle**: AI outputs must be clearly labelled and avoid fabricated environmental savings.

**Implementation**:
- Priority is labelled "AI-Assisted Priority", root cause is labelled "Probable Root Cause".
- Impact estimates are explicitly labelled "Qualitative Estimate" with a note that quantitative environmental measurement requires physical monitoring.
- The Impact Dashboard displays "Reports Submitted" and "Reports Resolved" from real database data — not fake CO₂ or energy savings numbers.
- Campus survey observations are explicitly framed: *"Campus survey observations are respondent-reported evidence and should not be interpreted as verified campus-wide measurements."*

---

## Governance Summary

| Principle | Implementation Status |
|---|---|
| RAG Grounding | ✅ Grounded in 9 project knowledge documents including `campus-survey.md` |
| Source Transparency | ✅ "Knowledge Used" UI displays sources, match scores, and survey badges |
| Agent Transparency | ✅ ReAct agent tools read-only (`get_report`, `retrieve_knowledge`, `get_report_history`, `get_dashboard_stats`) |
| Human Oversight | ✅ Status updates human-only via Admin Panel (`/admin`) with inspector notes |
| Confidence Transparency | ✅ Confidence % shown, low-confidence flagged |
| Evidence-Based Analysis | ✅ User evidence & retrieved text separated |
| Privacy Protection | ✅ No personal data collected |
| Honest Labelling | ✅ All AI outputs clearly labelled |
| Honest Impact Claims | ✅ Qualitative only, no fabricated numbers |
| No Autonomous Status Changes | ✅ AI assists, humans decide |
