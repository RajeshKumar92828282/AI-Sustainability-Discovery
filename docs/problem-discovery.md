# Problem Discovery & SDG Alignment — AI Sustainability Discovery

This document details the background problem context, campus survey findings, system solution workflow, SDG alignment, and target user personas for the **AI Sustainability Discovery Platform**.

---

## 📌 Problem Context

Urban environments and educational campuses encounter daily sustainability breakdowns — such as overflowing waste bins, undetected clean water pipe leaks, inefficient lighting, and localized air pollution. 

Despite growing awareness, traditional methods for discovering and rectifying these issues fail due to three core bottlenecks:

```
┌───────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│  1. Unstructured Data     │     │  2. Lack of Context       │     │  3. Absence of Audit      │
│ Community observations    │ ──► │ Reports lack grounding in │ ──► │ No transparent tracking   │
│ are informal, unorganized,│     │ operational guidelines or │     │ from report to verified   │
│ and easily overlooked.    │     │ survey data.              │     │ resolution.               │
└───────────────────────────┘     └───────────────────────────┘     └───────────────────────────┘
```

---

## 🎯 Problem Statement

Community members and students lack an accessible, intelligent platform to report sustainability challenges, while facility managers and administrators lack structured tools to prioritize interventions based on grounded knowledge and verify impact.

Without an end-to-end framework, reported problems remain unaddressed, resources are misallocated, and community engagement drops.

---

## 📋 Campus Survey Case Study Findings

During the discovery phase, real campus survey data was compiled into [`campus-survey.md`](file:///E:/AI-SUSTAINABILITY-DISCOVERY/Backend/data/knowledge/campus-survey.md), revealing key operational pain points reported by campus respondents:

1. **Waste Segregation & Littering:** 68% of respondents noted overflowing trash bins at high-footfall areas (gateways, cafeteria) after 2 PM due to fixed single-shift collection schedules.
2. **Water Waste:** Leaking float valves in overhead water tanks and continuous restroom tap drips caused estimated losses of hundreds of liters daily.
3. **Energy Inefficiency:** Air conditioning units in empty lecture halls running during off-peak hours and fluorescent tube lights left powered overnight.
4. **Single-Use Plastics:** Continued presence of non-biodegradable food containers at local vendor stalls despite institutional bans.

These empirical observations formed the primary evaluation benchmark for the RAG knowledge retrieval engine.

---

## 🔄 Solution Workflow Blueprint

The AI Sustainability Discovery Platform resolves these challenges through a 5-stage operational workflow:

$$\text{Discover} \longrightarrow \text{Retrieve Knowledge (RAG)} \longrightarrow \text{Understand (ReAct Agent)} \longrightarrow \text{Act (Human Review)} \longrightarrow \text{Measure Impact}$$

| Stage | Platform Mechanism | Outcome |
|---|---|---|
| **1. Discover** | Public report submission form with photo validation | Structured issue database record created with `submitted` status |
| **2. Retrieve Knowledge** | RAG vector search (`sentence-transformers` + FAISS) | Top-3 matching knowledge chunks & survey evidence retrieved |
| **3. Understand & Prioritize** | Autonomous ReAct AI Agent (`agent_service.py`) | Priority score (1-10), confidence %, root cause, & action plan generated |
| **4. Act** | Admin review panel (`/admin`) | Status advanced through 6 lifecycle stages with custom inspector notes |
| **5. Measure Impact** | Real-time analytics dashboard (`/dashboard`) | Live resolution rates, status distribution, and category metrics displayed |

---

## 🌍 UN Sustainable Development Goals (SDG) Alignment

The platform directly aligns with key targets of the **United Nations Sustainable Development Goals (SDGs)**:

```
  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
  │  SDG 11   │    │   SDG 6   │    │   SDG 7   │    │  SDG 12   │    │  SDG 13   │
  │Sustainable│    │Clean Water│    │Affordable │    │ Responsible│    │  Climate  │
  │  Cities   │    │& Sanitation│    │ Clean Energy│   │Consumption│    │  Action   │
  └─────┬─────┘    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
        │                │                │                │                │
        ▼                ▼                ▼                ▼                ▼
   Target 11.3      Target 6.4       Target 7.3       Target 12.5      Target 13.3
```

### Primary Focus
- **SDG 11: Sustainable Cities and Communities**
  - **Target 11.3:** Enhance inclusive and sustainable urbanization and capacity for participatory management.
  - **Target 11.6:** Reduce the adverse per capita environmental impact of cities, including municipal waste management.

### Supporting Focus Areas
- **SDG 6: Clean Water and Sanitation (Target 6.4):** Rapid detection and repair of water supply leaks.
- **SDG 7: Affordable and Clean Energy (Target 7.3):** Identification of HVAC and electrical energy waste.
- **SDG 12: Responsible Consumption and Production (Target 12.5):** Reduction of solid waste through segregation and composting.
- **SDG 13: Climate Action (Target 13.3):** Community awareness and localized mitigation of urban environmental hazards.

---

## 👥 Target User Personas & Stakeholder Analysis

### 1. Community Reporter (Student / Citizen)
- **Goal:** Quickly submit observable issues from mobile/desktop without tedious registration.
- **Value Delivered:** Instant submission form, photo evidence attachment, transparency into AI analysis and status progress.

### 2. Sustainability Officer / Reviewer
- **Goal:** Prioritize urgent issues, review AI root cause insights, assign maintenance teams, and record status notes.
- **Value Delivered:** Admin panel with multi-field search/filtering, grounded AI priority scoring, 6-stage lifecycle control.

### 3. Campus/Facility Maintenance Personnel
- **Goal:** Receive clear action plans and location details for physical repairs.
- **Value Delivered:** Actionable recommendations, photo evidence, and audit trails.

### 4. Institutional Executives & Policy Makers
- **Goal:** Track macro-level resolution rates, identify recurring problem hot-spots, and present sustainability impact reports.
- **Value Delivered:** Real-time analytics dashboard with interactive charts and resolution metrics.
