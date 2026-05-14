# Technical Handover: Smart Behavioral Re-Engagement Engine
**System Architecture & Developer Documentation v1.0**

## 1. Project Mission
The **Smart Behavioral Re-Engagement Engine** is a high-performance system designed to capture user micro-hesitations (friction) in real-time, analyze psychological intent using LLMs (GPT-4o), and trigger personalized interventions to recover abandoned sessions.

---

## 2. System Architecture
The system is divided into two distinct environments sharing a unified telemetry pipeline.

### **A. The Lure (Consumer-Facing)**
*   **Purpose**: A simulated financial platform designed with "Friction Traps."
*   **Tech**: Next.js 14 (App Router), Tailwind CSS.
*   **Key Feature**: **Ghost SDK** — A non-blocking Vanilla JS library that tracks:
    *   **Hover Zones**: Elements hovered for >3s (e.g., "Tax Fees," "Exit Load").
    *   **Friction Signals**: Erratic mouse movements, text highlighting.
    *   **Exit Velocity**: Speed and direction of cursor before tab closure.

### **B. The War Room (Admin Dashboard)**
*   **Purpose**: A dark-mode tactical command center for behavioral analysts.
*   **Tech**: Next.js, Framer Motion, Recharts.
*   **Key Features**:
    *   **Live Funnel Node Graph**: Real-time visualization of user drop-offs.
    *   **Intent Inspector**: Slide-in panel showing raw telemetry vs. AI analysis.
    *   **Dispatch Queue**: Automated intervention drafting and management.

### **C. The Backend (The Brain)**
*   **Purpose**: Telemetry ingestion, session persistence, and LLM orchestration.
*   **Tech**: Python (FastAPI), SQLAlchemy (Async), SQLite/PostgreSQL, OpenAI SDK.

---

## 3. The Telemetry Pipeline (Data Flow)

1.  **Capture**: Ghost SDK monitors browser events on the consumer site.
2.  **Dispatch**: On tab-close or hide, `navigator.sendBeacon()` fires a JSON payload to the backend.
3.  **Ingest**: FastAPI accepts the beacon instantly (HTTP 200) and offloads database persistence to a `BackgroundTasks` worker.
4.  **Analyze**: The "Nightly Brain" engine queries abandoned sessions and sends them to GPT-4o with a specialized behavioral system prompt.
5.  **Visualize**: The Admin Dashboard polls the backend for real-time updates and AI-generated insights.

---

## 4. Technical Specifications

### **Directory Structure**
```text
Root/
├── frontend/             # Next.js Application
│   ├── app/              # Routes (Admin, Consumer pages)
│   ├── components/       # UI Components (War Room components)
│   ├── services/         # API & Auth clients
│   └── public/           # Static assets & Ghost SDK (tracker.js)
└── backend/              # FastAPI Application
    ├── main.py           # Entry point & API routes
    ├── engine.py         # GPT-4o Intent Logic & Fallback Heuristics
    ├── database.py       # SQLAlchemy Models & Session Management
    ├── auth.py           # JWT Security & Admin verification
    ├── models.py         # Pydantic Schemas
    └── .env              # Secrets & Configuration
```

### **Core API Endpoints**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/ingest-telemetry` | Public endpoint for Ghost SDK beacons. |
| `POST` | `/api/auth/login` | Secure admin authentication. |
| `GET` | `/api/admin/funnel-stats` | Real-time aggregate data for node graphs. |
| `GET` | `/api/admin/bounced-sessions` | Detailed behavioral logs for the dispatch queue. |
| `POST` | `/api/admin/run-engine` | Triggers the AI analysis of unprocessed sessions. |
| `POST` | `/api/admin/dispatch` | Marks interventions as sent. |

### **Security Layer**
*   **Admin Auth**: JWT-based session management.
*   **Role Gating**: All `/api/admin/*` routes require a valid `Bearer` token with `admin` scope.
*   **Default Credentials**: `admin` / `fidelity2024`.

---

## 5. Setup & Execution Instructions

### **Backend Initialization**
```bash
cd backend
python -m venv venv
source venv/Scripts/activate # Windows
pip install -r requirements.txt
python main.py
```

### **Frontend Initialization**
```bash
cd frontend
npm install
npm run dev
```

---

## 6. Developer Roadmap (Future Build-outs)

1.  **CRM Integration**: Connect the `dispatch` endpoint to actual email services (SendGrid/AWS SES).
2.  **WebSocket Feed**: Replace the 5s polling in the dashboard with real-time WebSockets for "Live Stream" telemetry.
3.  **A/B Intent Testing**: Use the engine to serve different UI modifications dynamically based on captured friction (Edge personalization).
4.  **Heatmap Overlay**: Implement a visual overlay on the consumer site based on aggregated `hesitation_zones` data.

---
**Handover Status**: Deployment Ready. Core telemetry pipeline and AI logic fully implemented and verified.
