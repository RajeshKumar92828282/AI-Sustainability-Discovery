# API Documentation — AI Sustainability Discovery Platform

Welcome to the **AI Sustainability Discovery API** documentation. The backend is built using **FastAPI** (Python 3.10+) with **SQLAlchemy ORM** and SQLite, providing RESTful endpoints for issue submission, status management, audit history, RAG vector retrieval, autonomous ReAct AI agent analysis, and real-time impact metrics.

---

## 🌐 Base URL & Interactive Docs

- **Local Base URL:** `http://127.0.0.1:8000` or `http://localhost:8000`
- **Interactive Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc UI:** `http://127.0.0.1:8000/redoc`

---

## 🔒 Authentication & Headers

- Currently, all API endpoints are publicly accessible for open community reporting.
- **Content Types:**
  - Standard Requests: `application/json`
  - Issue Creation with Photo: `multipart/form-data`

---

## 📊 Core Data Models & Schemas

### 1. `ReportResponse`
```json
{
  "id": 1,
  "description": "Overflowing waste bins near the college entrance causing litter.",
  "category": "Waste Management",
  "location": "North Campus Gate 1",
  "photo_path": "uploads/reports/a1b2c3d4-5678-90ab-cdef-1234567890ab.jpg",
  "status": "submitted",
  "created_at": "2026-09-20T10:15:30",
  "updated_at": "2026-09-20T10:15:30"
}
```

### 2. `StatusUpdateRequest`
```json
{
  "status": "under_review",
  "note": "Assigned to campus sanitation team for site inspection."
}
```

### 3. `StatusHistoryResponse`
```json
{
  "id": 1,
  "report_id": 1,
  "previous_status": "submitted",
  "new_status": "under_review",
  "note": "Assigned to campus sanitation team for site inspection.",
  "timestamp": "2026-09-20T11:00:00"
}
```

### 4. `ReportAnalysisResponse`
```json
{
  "id": 1,
  "report_id": 1,
  "category": "Waste Management",
  "priority_score": 8.5,
  "confidence": 0.92,
  "root_cause": "Insufficient bin capacity combined with delayed collection cycles during peak hours.",
  "recommended_action": "Deploy additional 240L segregated bins and establish bi-daily collection.",
  "impact_estimate": "High reduction in campus littering and prevention of secondary vector pests.",
  "model_name": "gemini-1.5-flash",
  "provider": "google_gemini",
  "is_live": 1,
  "retrieved_sources": [
    {
      "source": "campus-survey.md",
      "relevance_score": 0.88,
      "excerpt": "Campus Survey Respondent 14: Bins at Gate 1 overflow by 2 PM daily.",
      "section_title": "Solid Waste & Segregation Issues"
    }
  ],
  "agent_selected_tools": ["get_report", "retrieve_knowledge", "get_dashboard_stats"],
  "agent_reasoning": "Evaluated report #1 details, searched RAG knowledge base for waste guidelines, and checked community statistics.",
  "agent_tool_results": {
    "get_report": {"id": 1, "category": "Waste Management"},
    "retrieve_knowledge": [{"source": "campus-survey.md", "score": 0.88}],
    "get_dashboard_stats": {"total_reports": 15}
  },
  "created_at": "2026-09-20T10:20:00"
}
```

---

## ⚡ Endpoints Reference

### Health & Diagnostics

#### `GET /`
- **Description:** Basic API root health check.
- **Response:**
  ```json
  {
    "message": "AI Sustainability Discovery API is running",
    "status": "online",
    "version": "2.0.0"
  }
  ```

#### `GET /api/reports/gemini-status`
- **Description:** Verifies Gemini API key configuration and live Google API connectivity without exposing credentials.
- **Response:**
  ```json
  {
    "gemini_configured": true,
    "key_hint": "AIzaSy...4x9Q",
    "gemini_request": "SUCCESS",
    "message": "Gemini API key is valid and connectivity confirmed."
  }
  ```

---

### Issue Reporting (`Discover`)

#### `POST /api/reports`
- **Description:** Submit a new sustainability issue. Supports multipart form data for uploading optional photo evidence.
- **Content-Type:** `multipart/form-data`
- **Form Parameters:**
  - `description` (string, required): Detailed problem description.
  - `category` (string, required): Valid category (e.g., `Waste Management`, `Water Conservation`, `Energy Efficiency`, `Food Sustainability`, `Urban Transport`, `Air Quality`).
  - `location` (string, optional): Specific location or landmark.
  - `photo` (file, optional): JPG/PNG image file (< 5 MB).
- **Status Codes:**
  - `201 Created`: Report submitted successfully.
  - `400 Bad Request`: Empty description/category or invalid file type/size.

#### `GET /api/reports`
- **Description:** List all submitted sustainability reports in reverse chronological order.
- **Response:** Array of `ReportResponse` objects.

#### `GET /api/reports/{report_id}`
- **Description:** Fetch detailed record for a specific report ID.
- **Status Codes:**
  - `200 OK`: Success.
  - `404 Not Found`: Report ID does not exist.

---

### Status Lifecycle Management (`Act`)

#### `PATCH /api/reports/{report_id}/status`
- **Description:** Update report lifecycle status with an optional inspector note.
- **Valid Status Values:**
  1. `submitted`
  2. `under_review`
  3. `action_planned`
  4. `in_progress`
  5. `resolved`
  6. `verified`
- **Request Body:** `StatusUpdateRequest`
- **Status Codes:**
  - `200 OK`: Status updated successfully.
  - `400 Bad Request`: Invalid status value.
  - `404 Not Found`: Report ID does not exist.

#### `GET /api/reports/{report_id}/history`
- **Description:** Retrieve complete status audit trail for a report.
- **Response:** Array of `StatusHistoryResponse` objects.

---

### AI & Agent Analysis (`Understand & Prioritize`)

#### `POST /api/reports/{report_id}/analyze`
- **Description:** Run standard RAG AI analysis on a report. Retrieves top-3 knowledge sources and invokes LLM provider.
- **Response:** `ReportAnalysisResponse`

#### `GET /api/reports/{report_id}/analysis`
- **Description:** Fetch previously generated AI analysis for a report.
- **Status Codes:**
  - `200 OK`: Analysis found.
  - `404 Not Found`: Report or analysis does not exist.

#### `POST /api/reports/{report_id}/agent-analyze`
- **Description:** Run Autonomous ReAct AI Agent analysis. Dynamically selects and executes tools (`get_report`, `retrieve_knowledge`, `get_report_history`, `get_dashboard_stats`), builds grounded prompt, and saves analysis with tool execution logs.
- **Response:** `ReportAnalysisResponse` (includes `agent_selected_tools`, `agent_reasoning`, and `agent_tool_results`).

---

### Analytics & Impact Metrics (`Measure Impact`)

#### `GET /api/reports/stats`
- **Description:** Fetch real-time aggregate statistics, status distribution, category breakdown, and resolution rate calculated directly from SQLite database.
- **Response:**
  ```json
  {
    "total_reports": 24,
    "by_status": {
      "submitted": 5,
      "under_review": 4,
      "action_planned": 3,
      "in_progress": 4,
      "resolved": 6,
      "verified": 2
    },
    "by_category": {
      "Waste Management": 8,
      "Water Conservation": 6,
      "Energy Efficiency": 5,
      "Air Quality": 3,
      "Urban Transport": 2
    },
    "resolution_rate": 33.33,
    "latest_reports": [...]
  }
  ```

---

## 💻 cURL Examples

### 1. Submit a Report
```bash
curl -X POST "http://127.0.0.1:8000/api/reports" \
  -F "description=Water leaking from main supply pipe near Block B entrance." \
  -F "category=Water Conservation" \
  -F "location=Block B Main Entrance" \
  -F "photo=@/path/to/leak.jpg;type=image/jpeg"
```

### 2. Run ReAct AI Agent Analysis
```bash
curl -X POST "http://127.0.0.1:8000/api/reports/1/agent-analyze"
```

### 3. Update Report Status (Admin)
```bash
curl -X PATCH "http://127.0.0.1:8000/api/reports/1/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "note": "Plumbing team deployed to replace broken valve."}'
```

---

## 🛑 Error Codes & Response Format

All API errors return a standard JSON payload:
```json
{
  "detail": "Error message describing the issue."
}
```

| HTTP Code | Category | Cause |
|---|---|---|
| `400` | Bad Request | Missing description/category, invalid image format/size, or invalid status string |
| `404` | Not Found | Report ID or analysis resource does not exist |
| `500` | Internal Error | Database connection or server error |
| `503` | Service Unavailable | External AI Provider API timeout or unreachable |
