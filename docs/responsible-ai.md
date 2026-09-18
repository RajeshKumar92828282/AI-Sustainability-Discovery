# Responsible AI — AI Sustainability Discovery

## Overview

AI Sustainability Discovery uses Artificial Intelligence and Retrieval-Augmented Generation (RAG) to assist human decision-making in sustainability problem management. This document outlines the responsible AI principles embedded in the platform's design.

---

## 1. Retrieval-Augmented Generation (RAG) Grounding

**Principle**: AI analysis must be grounded in verified project knowledge documents, avoiding hallucinated facts or fabricated policies.

**Implementation**:
- Prior to AI generation, the system retrieves relevant sustainability knowledge from `Backend/data/knowledge/` (`sdg11.md`, `waste-management.md`, `water-conservation.md`, etc.).
- Retrieved context is explicitly provided in the AI grounding prompt.
- Source documents, excerpts, and similarity match scores are displayed in the "Knowledge Used" UI section.
- If retrieval confidence is low, a warning banner explicitly advises: *"Limited supporting knowledge was retrieved. Human review recommended."*

---

## 2. Human Oversight

**Principle**: AI assists, humans decide.

**Implementation**:
- AI analysis is a starting point for human review, not a final decision.
- Status transitions (e.g., Submitted → Under Review → Action Planned → In Progress → Resolved → Verified) can only be made by a human through the UI.
- A report cannot be marked Resolved or Verified based solely on AI output.
- The UI explicitly labels AI outputs as "AI-Assisted" and "Probable".

---

## 3. Confidence Transparency

**Principle**: Every AI output includes a confidence level and source relevance.

**Implementation**:
- AI analysis returns a confidence score between 0.0 and 1.0.
- This is displayed as a percentage in the UI (e.g., 82%).
- When confidence is below 70%, the UI explicitly states: *"Human review recommended"*.
- Confidence is labelled with an explanation: *"Reflects AI model confidence. Not a guarantee of accuracy."*

---

## 4. Evidence-Based Analysis & Source Attribution

**Principle**: AI analyzes what is provided — it does not fabricate evidence.

**Implementation**:
- AI analysis is based on user description, category, and retrieved knowledge base context.
- Photo evidence is displayed separately from AI interpretation.
- Retrieved sources are displayed transparently with exact filenames and excerpts.

---

## 5. Privacy Protection

**Principle**: No unnecessary personal data is collected.

**Implementation**:
- Reports require only: description, category, optional location, optional photo.
- No user accounts, names, emails, or personal identifiers are required.
- Photos capture places and environmental issues, not individuals.
- A privacy notice is shown in the report submission form.

---

## 6. Bias Awareness & Honest Labelling

**Principle**: AI outputs may reflect training biases and must be clearly labelled.

**Implementation**:
- Priority is labelled "AI-Assisted Priority" not "Priority".
- Root cause is labelled "Probable Root Cause" not "Root Cause".
- Impact estimates are labelled "Qualitative" with an explicit note that quantitative measurement data is required.
- Model name and analysis timestamp are displayed on every analysis.
- Structured fallback analysis is labelled clearly: "AI-Assisted Analysis (Simulated — Live AI provider not configured)".

---

## 7. Honest Impact Claims

**Principle**: Do not fabricate environmental savings.

**Implementation**:
- The Impact Dashboard shows "Reports Resolved" not "CO₂ tonnes saved".
- A visible Honest Impact Reporting notice on the dashboard explains why.
- No specific environmental savings are claimed without supporting measurement data.

---

## Technology Architecture & Governance

This platform uses:
- **Development & AI Assistant:** Google Gemini / Antigravity
- **RAG Engine:** Local vector retrieval via `sentence-transformers` / FAISS / TF-IDF (`Backend/app/services/rag_service.py`)
- **AI Service:** `Backend/app/services/ai_service.py` with support for Google Gemini API (`GEMINI_API_KEY`) and structured fallback.

---

## Governance Summary

| Principle | Implementation Status |
|---|---|
| RAG Grounding | ✅ Grounded in 8 project knowledge documents |
| Source Transparency | ✅ "Knowledge Used" UI displays sources & match scores |
| Human Oversight | ✅ Status updates human-only |
| Confidence Transparency | ✅ Confidence % shown, low-confidence flagged |
| Evidence-Based Analysis | ✅ User evidence & retrieved text separated |
| Privacy Protection | ✅ No personal data collected |
| Honest Labelling | ✅ All AI outputs clearly labelled |
| Honest Impact Claims | ✅ Qualitative only, no fabricated numbers |
| No Autonomous Decisions | ✅ AI assists, humans decide |
