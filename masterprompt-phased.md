# SentinelAI — Phased Build Prompts

Use these prompts sequentially in new sessions. Each phase assumes the previous phases are complete. At the start of any phase, paste the phase prompt into a fresh AI coding session to continue building.

---

## PHASE 0: Initial Context (use only for the very first session)

**What exists:** Nothing — empty directory.

**Goal:** Scaffold the entire project structure, install dependencies, and configure build tooling.

**Prompt to paste:**

```
You are an expert full-stack AI engineer. Build Phase 0 of SentinelAI — an AI-Powered Industrial Safety Intelligence Platform.

## Context
This is a fresh start. Nothing has been built yet.

## What to build

### 1. Folder Structure
Create the exact folder structure below (empty files for now, except where noted):

```
sentinelai/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── heatmap/page.tsx
│   │   ├── permits/page.tsx
│   │   ├── incidents/page.tsx
│   │   ├── alerts/page.tsx
│   │   ├── emergency/page.tsx
│   │   └── copilot/page.tsx
│   ├── components/
│   │   ├── layout/ (Sidebar.tsx, TopNav.tsx, PageWrapper.tsx)
│   │   ├── dashboard/ (RiskScoreGauge.tsx, SensorCard.tsx, AlertFeed.tsx, ZoneStatusGrid.tsx, CompoundRiskPanel.tsx)
│   │   ├── heatmap/ (PlantHeatmap.tsx, ZoneDetailDrawer.tsx)
│   │   ├── permits/ (PermitTable.tsx, PermitConflictAlert.tsx)
│   │   ├── charts/ (SensorTimeSeriesChart.tsx, RiskTrendChart.tsx, IncidentHistoryChart.tsx)
│   │   ├── copilot/ (CopilotChat.tsx)
│   │   └── ui/ (shadcn stubs for badge, button, card, slider, tabs)
│   ├── lib/ (api.ts, websocket.ts, types.ts, constants.ts, utils.ts)
│   ├── hooks/ (useSensorData.ts, useAlerts.ts, useRiskScore.ts, useWebSocket.ts)
│   ├── public/ (plant-layout.svg, sentinel-logo.svg)
│   ├── tailwind.config.ts / globals.css
│   ├── next.config.ts
│   └── package.json
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── agents/ (__init__.py, compound_risk_agent.py, permit_intelligence_agent.py, incident_rag_agent.py, emergency_orchestrator.py)
│   ├── models/ (__init__.py, risk_scorer.py, anomaly_detector.py, knowledge_graph.py)
│   ├── data/ (__init__.py, simulator.py, seed_data.py, sample_incidents.json)
│   ├── rag/ (__init__.py, document_loader.py, embeddings.py, retriever.py)
│   ├── api/ (__init__.py, sensors.py, alerts.py, permits.py, risk.py, incidents.py, copilot.py, emergency.py, workers.py)
│   ├── websocket/ (__init__.py, manager.py)
│   ├── db/ (__init__.py, models.py, connection.py, repository.py)
│   └── utils/ (__init__.py, logger.py)
├── data/
│   ├── regulations/ (oisd_guidelines.txt, factory_act_safety.txt, dgms_mining_safety.txt)
│   ├── incidents/ (historical_incidents.json)
│   └── plant/ (zones.json)
├── docker-compose.yml
├── .env.example
└── README.md
```

### 2. Initialize Frontend
- Run `npx create-next-app@latest` with TypeScript, App Router, Tailwind CSS
- Install: recharts, react-leaflet, leaflet, leaflet types, framer-motion, lucide-react, clsx, tailwind-merge, date-fns
- Create `globals.css` with Tailwind v4 directives and CSS custom properties for the dark theme (primary #0A0F1E, secondary #111827, accent #EF4444, warning #F59E0B, safe #10B981)
- Create placeholder page files that render a simple "PageName — Building" message

### 3. Initialize Backend
- Create `requirements.txt` with: fastapi, uvicorn, websockets, langchain, langchain-openai, langchain-community, langgraph, chromadb, openai, numpy, pandas, scikit-learn, psycopg2-binary, redis, python-dotenv, pydantic, httpx
- Create `main.py` with a minimal FastAPI app, CORS middleware, and /api/health endpoint

### 4. Docker & Config
- Create `docker-compose.yml` with 5 services: frontend (port 3000), backend (port 8000), postgres, redis (6379), chromadb (8001)
- Create `.env.example` with all env vars (OPENAI_API_KEY, DATABASE_URL, REDIS_URL, etc.)
- Create `backend/Dockerfile` (Python 3.11, uvicorn)

### 5. Data files
- Create `data/regulations/` with 3 text files containing realistic safety regulation content (OISD, Factory Act, DGMS)
- Create `data/incidents/historical_incidents.json` with 20 realistic incident records
- Create `data/plant/zones.json` with 6 zone definitions

Do NOT implement business logic yet — only scaffolding, configs, and placeholder files.
```

---

## PHASE 1: Data Layer & Simulation

**What exists:** Project scaffolding, folder structure, dependencies, Docker.

**Goal:** Build the complete simulated data layer — IoT sensor simulator, seed data, database models, and the demo scenario timeline.

**Prompt to paste:**

```
You are building the Data Layer of SentinelAI. The project scaffolding (folders, dependencies, configs) is already in place. Now implement the following files with full logic.

## What to build

### 1. backend/db/models.py
Create SQLAlchemy ORM models for:
- Zone: id, name, risk_level, description
- SensorReading: id, zone_id, sensor_type, value, unit, timestamp
- Worker: worker_id, name, zone, shift, role, location_x, location_y, last_updated
- Permit: permit_id, permit_type (HOT_WORK|CONFINED_SPACE|ELECTRICAL|HEIGHT|EXCAVATION), zone_id, start_time, end_time, authorized_by, workers_involved (JSON), status (ACTIVE|SUSPENDED|COMPLETED)
- Alert: id, zone_id, severity (CRITICAL|HIGH|MEDIUM|LOW), title, description, timestamp, status (NEW|ACKNOWLEDGED|RESOLVED), risk_score, contributing_factors (JSON)
- Incident: incident_id, date, plant, zone, incident_type, fatalities, injuries, root_causes (JSON), description, warning_signs_missed (JSON), prevention_measures (JSON)
- RiskAssessment: id, zone_id, risk_score, risk_level, triggered_rules (JSON), timestamp

### 2. backend/db/connection.py
- PostgreSQL connection with SQLite fallback
- Session management
- create_tables() and drop_tables() helpers

### 3. backend/data/simulator.py
The core simulation engine. Implement:

**6 Plant Zones:**
- ZONE_A: Coke Oven Battery (HIGH RISK)
- ZONE_B: Blast Furnace Area (HIGH RISK)
- ZONE_C: Gas Processing Unit (MEDIUM RISK)
- ZONE_D: Control Room (LOW RISK)
- ZONE_E: Maintenance Workshop (MEDIUM RISK)
- ZONE_F: Raw Material Storage (LOW RISK)

**Sensor Types per zone (simulate ALL):**
1. Gas Sensors: CO (0-25/25-50/>50 ppm), H2S (0-5/5-10/>10 ppm), CH4 (0-10/10-25/>25 %LEL), O2 (19.5-23.5/<19.5/>23.5 %)
2. Environmental: Temperature (20-60/60-80/>80 °C), Pressure (0.8-1.2/1.2-1.5/>1.5 bar), Humidity (30-70%)
3. Equipment: Vibration (0-4/4-7/>7 mm/s), runtime (hours), last_maintenance (date)

**Simulation Behavior:**
- Generate readings every 2 seconds
- Normal readings 85% of time, gradual escalation 10%, sudden spike 5%
- Use numpy for realistic noise
- Store readings with timestamp, zone_id, sensor_id
- Maintain a global in-memory store of current readings (dict)

**Worker Data:**
- 50 workers across all zones
- Each: worker_id, name, zone, shift (A/B/C), role
- Location coordinates (x, y) within zone bounds
- Move workers within their zone every ~10 seconds

**Permit Data:**
- 15 active permits with various types
- Each: permit_id (PTW-2024-XXXX), permit_type, zone_id, start_time, end_time, authorized_by, workers_involved, status

**Demo Scenario: "Visakhapatnam Replay Prevention"**
- Embedded as a phase system in the simulator:
  - Phase 0 (T+0): Normal — Risk 18
  - Phase 1 (T+30s): Zone A CH4 rising 5 to 8 to 12%, confined space permit activates — Risk 35
  - Phase 2 (T+60s): Ventilation goes offline, CH4 15% — Risk 62
  - Phase 3 (T+90s): Compound Rule 6 triggers, Risk 82 — EMERGENCY
  - Phase 4 (T+120s): Show "without SentinelAI" comparison
- Simulator checks demo_phase from config and adjusts readings accordingly

### 4. backend/data/seed_data.py
- Function to seed initial data (zones, workers, permits) into the database
- Read zones from data/plant/zones.json

### 5. backend/data/sample_incidents.json
Create 20 realistic industrial incident records with this structure:
{
  "incident_id": "INC-2023-001",
  "date": "2023-03-15",
  "plant": "Bhilai Steel Plant",
  "zone": "Coke Oven Battery",
  "type": "Gas Explosion",
  "fatalities": 2,
  "injuries": 5,
  "root_causes": [...],
  "warning_signs_missed": [...],
  "regulatory_violations": [...],
  "prevention_measures": [...],
  "description": "..."
}

### 6. backend/data/demo_scenario.py
Standalone script that orchestrates the demo:
- Controls phase transitions
- Prints timeline events
- Can be imported and called from API endpoints

Make the simulator importable as a singleton — other modules access Simulator.get_instance() to read current data.
```

---

## PHASE 2: Backend API & WebSocket Layer

**What exists:** Project scaffolding + full data layer with simulator, DB models, and seed data.

**Goal:** Build all FastAPI endpoints, WebSocket manager, and wire everything together in main.py.

**Prompt to paste:**

```
You are building the API layer of SentinelAI. The data layer (simulator, DB models, seed data) is already built. Now implement all API endpoints and WebSocket support.

## What to build

### 1. backend/websocket/manager.py
WebSocket connection manager:
- Track connected clients per zone
- broadcast(event_type, data) — send JSON to all or filtered clients
- Events to emit:
  - sensor_update: { zone_id, sensor_id, sensor_type, value, unit, timestamp }
  - risk_update: { zone_id, score, level, triggered_rules }
  - alert_new: { full alert object }
  - permit_flagged: { full permit object with conflicts }
  - emergency_triggered: { zone_id, risk_score, timeline, actions }

### 2. backend/api/sensors.py
Endpoints:
- GET /api/sensors/current -> All current readings across all zones (from simulator in-memory store)
- GET /api/sensors/{zone_id} -> Sensors for specific zone
- GET /api/sensors/{zone_id}/history -> Last 2 hours of readings (from DB or in-memory ring buffer)
- GET /api/sensors/anomalies -> Current anomalies (readings beyond warning thresholds)

### 3. backend/api/risk.py
Endpoints:
- GET /api/risk/plant -> Overall plant risk score (average of all zones)
- GET /api/risk/zones -> Risk score per zone
- GET /api/risk/{zone_id} -> Detailed risk for zone (score, rules triggered, evidence)
- GET /api/risk/history -> Risk score history for last 2 hours
- POST /api/risk/analyze -> Trigger manual risk analysis for all zones

### 4. backend/api/alerts.py
Endpoints:
- GET /api/alerts -> All alerts (filterable by severity, zone, status)
- GET /api/alerts/active -> Active unacknowledged alerts
- POST /api/alerts/{id}/acknowledge -> Acknowledge alert
- POST /api/alerts/{id}/resolve -> Resolve alert
- POST /api/alerts/trigger -> Create alert manually

### 5. backend/api/permits.py
Endpoints:
- GET /api/permits -> All permits
- GET /api/permits/active -> Active permits
- GET /api/permits/conflicts -> Detected permit conflicts
- POST /api/permits/{id}/suspend -> Suspend a permit
- GET /api/permits/simops -> SIMOPS matrix data (grid showing which permit combos are dangerous)
- GET /api/permits/intelligence -> Full permit intelligence output
- POST /api/permits/intelligence/{permit_id} -> Analyze specific permit

### 6. backend/api/incidents.py
Endpoints:
- GET /api/incidents -> List all historical incidents
- POST /api/incidents/query -> Query incidents via RAG (body: { query: string, zone?: string })
- GET /api/incidents/patterns -> Pattern analysis (incident freq by type, root cause distribution)
- GET /api/incidents/similar -> Similar incidents to current conditions
- POST /api/incidents/agent-query -> Full agent-powered query with RAG
- GET /api/incidents/intelligence -> Auto-generated prevention brief if risk > 60

### 7. backend/api/copilot.py
Endpoints:
- POST /api/copilot/chat -> Chat with AI safety copilot
  Body: { message: string, context?: { zone_id?: string, risk_data?: any } }
  Returns: { response: string, sources: string[], confidence: number }
  System prompt: "You are SentinelAI Copilot, an expert industrial safety AI assistant..."

### 8. backend/api/emergency.py (bonus)
Endpoints:
- GET /api/emergency/status -> Current emergency status
- POST /api/emergency/trigger -> Manual emergency trigger
- POST /api/emergency/resolve -> Resolve emergency
- GET /api/emergency/timeline -> Emergency response timeline

### 9. backend/api/workers.py (bonus)
Endpoints:
- GET /api/workers -> All workers
- GET /api/workers/zone/{zone_id} -> Workers in specific zone
- GET /api/workers/at-risk -> Workers in elevated/critical risk zones

### 10. backend/main.py (wire everything)
- Mount all routers with /api prefix
- CORS middleware (allow localhost:3000)
- Startup event: create tables, seed data, start simulator background task
- WebSocket endpoint at /ws
- Background task: simulator loop + periodic risk calculation + WebSocket broadcasts
- Health check endpoint

All API responses should be JSON. All endpoints should pull from the simulator's in-memory data store (Simulator.get_instance()) rather than requiring a live database connection.
```

---

## PHASE 3: AI Agents (Risk Engine, Permits, RAG, Emergency)

**What exists:** All scaffolding, data layer, and API endpoints.

**Goal:** Build all 4 AI agents — compound risk detection with LangGraph, permit intelligence, incident RAG, emergency orchestrator.

**Prompt to paste:**

```
You are building the AI Agent layer of SentinelAI. The data layer and API scaffolding exist. Now implement the full intelligence layer.

## What to build

### 1. backend/agents/compound_risk_agent.py
LangGraph multi-agent system with 5 agents:

**Agent 1: SensorAnalysisAgent**
- Takes raw sensor readings per zone
- Computes Individual Sensor Risk (0-40 points)
- Weight: Gas sensors 1.5x, Pressure 1.2x, Temperature 1.0x
- Detects anomalies (readings above warning thresholds)
- Outputs: list of sensor risk scores + anomaly flags

**Agent 2: PermitCrossReferenceAgent**
- Takes active permits for a zone
- Takes current sensor anomalies
- Checks: confined space + gas, hot work + gas, etc.
- Outputs: permit conflict flags

**Agent 3: WorkerSafetyAgent**
- Takes worker locations
- Cross-references with zone risk levels
- Counts workers in danger zones
- Outputs: affected worker list + count

**Agent 4: CompoundRiskSynthesizer (Supervisor)**
- Takes outputs from Agents 1-3
- Applies compound rules below
- Generates final risk score (0-100)
- Outputs: structured risk assessment

**Compound Rules (apply each that matches):**
- Rule 1: CONFINED_SPACE + ELEVATED_GAS -> +25, CRITICAL
- Rule 2: HOT_WORK + CH4>10%LEL or H2S>5ppm -> +30, CRITICAL (immediate suspension)
- Rule 3: MAINTENANCE + PRESSURE_ANOMALY -> +20, HIGH
- Rule 4: SHIFT_CHANGEOVER (within 30min) + ELEVATED_SENSOR -> +15, MEDIUM
- Rule 5: >2 PERMITS_SAME_ZONE simultaneously -> +15, MEDIUM
- Rule 6: VENTILATION_OFFLINE + CONFINED_SPACE -> +35, CRITICAL
- Rule 7: NIGHT_SHIFT + EQUIPMENT_OVERDUE_MAINTENANCE -> +20, HIGH

**Time Escalation:** If elevated >15min x1.2, >30min x1.5

**Thresholds:** 0-25 SAFE, 26-50 CAUTION, 51-75 HIGH, 76-100 CRITICAL

**Agent 5: RecommendationAgent**
- Uses GPT-4o to generate natural language recommendations
- Based on triggered rules and evidence
- Outputs: list of actionable recommendations with rationale

**LangGraph workflow:** SensorAnalysis -> PermitCrossReference -> WorkerSafety -> CompoundRiskSynthesizer -> RecommendationAgent (sequential)

**Output JSON format:**
{
  "zone_id": "ZONE_A",
  "risk_score": 82,
  "risk_level": "CRITICAL",
  "triggered_rules": [{
    "rule_id": "RULE_6",
    "description": "Ventilation offline + confined space permit",
    "contribution": 35,
    "evidence": { "ventilation_status": "OFFLINE", "permit_id": "PTW-2024-0847", "permit_type": "CONFINED_SPACE" }
  }],
  "individual_sensors": [...],
  "recommended_actions": ["Suspend permit", "Evacuate Zone A"],
  "workers_affected": 5,
  "prediction_horizon": "45 minutes to critical threshold",
  "confidence": 0.89,
  "timestamp": "..."
}

### 2. backend/agents/permit_intelligence_agent.py
SIMOPS detection + conflict analysis:
- Check active permits against gas readings in same zone
- Check permit combinations in same zone
- Equipment maintenance status
- Worker density

**Conflict Rules:**
1. HOT_WORK + GAS_ELEVATED -> IMMEDIATE SUSPENSION (CRITICAL)
2. HOT_WORK + CONFINED_SPACE (same zone) -> FLAG (HIGH)
3. ELECTRICAL_WORK + WET_CONDITIONS -> FLAG (MEDIUM)
4. CONFINED_SPACE + VENTILATION_OFFLINE -> IMMEDIATE SUSPENSION (CRITICAL)
5. >3 permits in single zone -> FLAG FOR REVIEW (MEDIUM)
6. Permit duration >8 hours -> FLAG (LOW)

**Output:**
{
  "permit_id": "PTW-2024-0847",
  "status": "FLAGGED",
  "conflicts": [{ "conflict_type": "GAS_HAZARD", "description": "...", "action_required": "IMMEDIATE_SUSPENSION", "urgency": "CRITICAL" }],
  "recommendation": "...",
  "notified_parties": ["Zone Supervisor", "Safety Officer"]
}

### 3. backend/agents/incident_rag_agent.py + rag/ system

**rag/document_loader.py:**
- Load text files from data/regulations/
- Load JSON incidents from data/incidents/
- Chunk documents (chunk_size=500, overlap=50)
- Return list of Document objects

**rag/embeddings.py:**
- OpenAIEmbeddings with text-embedding-3-small model
- Fallback: SentenceTransformer if OpenAI unavailable

**rag/retriever.py:**
- ChromaDB vector store (persist to chroma_db/ directory)
- similarity_search with k=5
- as_retriever() for LangChain integration
- Fallback: keyword-based search if ChromaDB unavailable

**incident_rag_agent.py capabilities:**
1. Pattern Query: Find incidents similar to current conditions -> summarize patterns -> generate prevention alert
2. Regulation Query: Return cited regulatory guidance for a query
3. Prevention Intelligence (auto-triggered at risk > 60):
   - Find 3 most similar historical incidents
   - Extract warning signs missed
   - Compare with current conditions
   - Generate: "This situation is X% similar to [incident]. Key missed signals: [Y]. Recommend: [Z]"

### 4. backend/agents/emergency_orchestrator.py
Trigger: Risk Score > 75 (CRITICAL)

**Automated Response Sequence (6 steps):**
- Step 1 (T+0): Generate structured emergency alert
- Step 2 (T+5): Notify Safety Officer, Shift Supervisor, Plant Manager (simulated)
- Step 3 (T+10): Auto-flag/suspend all active permits in affected zone
- Step 4 (T+15): Preserve complete sensor state as evidence
- Step 5 (T+30): Generate evacuation instructions, list workers, identify muster points
- Step 6 (T+60): Auto-generate OISD-compliant incident report draft

**Incident report template includes:** Plant, Date/Time, Zone, Type, Risk Score, Timeline, Contributing Factors, Workers Affected, Active Permits, Actions Taken, Regulatory Notifications, Preliminary Root Cause, Recommendations

### 5. Wire into existing API endpoints
- risk.py endpoints should call compound_risk_agent for analysis
- permits.py should call permit_intelligence_agent
- incidents.py should call incident_rag_agent
- emergency.py should call emergency_orchestrator
- The simulator background task in main.py should periodically run risk analysis and broadcast results via WebSocket
```

---

## PHASE 4: Frontend Foundation (Layout, Design System, Lib, Hooks)

**What exists:** Full backend with all agents, APIs, and data layer.

**Goal:** Build the frontend foundation — design system, layout components, lib modules, hooks, and shared UI.

**Prompt to paste:**

```
You are building the Frontend Foundation of SentinelAI. The backend (APIs, agents, simulator) is fully built. Now implement the frontend shared layer — design system, layout, lib files, hooks, and shadcn UI components.

## What to build

### 1. Design System (globals.css + constants)
Use Tailwind CSS with this dark industrial theme:
- Background: #0A0F1E (dark navy)
- Card bg: #111827
- Accent/Red: #EF4444
- Warning/Amber: #F59E0B
- Safe/Green: #10B981
- Orange: #F97316
- Text primary: #F9FAFB
- Text secondary: #9CA3AF
- Border: #1F2937
- Font: Inter (import from next/font)
- Full dark theme, no light mode

### 2. lib/types.ts
Comprehensive TypeScript types:
Zone, SensorReading, Worker, Permit, Alert, Incident, RiskAssessment
CompoundRule, RuleEvidence, PermitConflict, EmergencyStatus
WebSocketEvent, ChatMessage, PlantContext, PreventionBrief
All with proper typing — no 'any' types.

### 3. lib/constants.ts
- PLANT_ZONES array with 6 zones (id, name, riskLevel, bounds)
- RISK_THRESHOLDS: SAFE(25), CAUTION(50), HIGH(75), CRITICAL(100)
- SEVERITY_COLORS, SEVERITY_ORDER
- PERMIT_TYPES with icons and descriptions
- COMPOUND_RULES array with all 7 rules
- SENSOR_THRESHOLDS for all sensor types
- MUSTER_POINTS: 4 locations with coordinates
- WEBSOCKET_URL, API_URL from env

### 4. lib/utils.ts
- cn() using clsx + tailwind-merge
- formatTimestamp(), formatDuration()
- getRiskColor(score), getRiskLabel(score)
- getSeverityIcon(severity)
- formatSensorValue(value, unit)
- debounce(), throttle()

### 5. lib/api.ts
API client with typed functions:
- getCurrentReadings(), getZoneReadings(zoneId), getReadingHistory(zoneId)
- getPlantRisk(), getZoneRisk(zoneId), getRiskHistory()
- getAlerts(), getActiveAlerts(), acknowledgeAlert(id), resolveAlert(id)
- getPermits(), getActivePermits(), getPermitConflicts(), suspendPermit(id), getSimopsMatrix()
- getIncidents(), queryIncidents(query), getSimilarIncidents(), getPatterns()
- copilotChat(message, context?)
- getEmergencyStatus(), triggerEmergency(), resolveEmergency()
All with proper error handling and loading states.

### 6. lib/websocket.ts
WebSocket client:
- Connect/disconnect with auto-reconnect
- Event listeners: onSensorUpdate, onRiskUpdate, onAlertNew, onPermitFlagged, onEmergencyTriggered
- Zone filtering
- Singleton pattern

### 7. hooks/useSensorData.ts
- Returns current readings for all/specific zones
- Auto-updates via WebSocket events
- Loading and error states

### 8. hooks/useAlerts.ts
- Returns all/active alerts
- Auto-updates via WebSocket
- Mark as read, resolve functions

### 9. hooks/useRiskScore.ts
- Returns current risk scores by zone + overall
- Auto-updates via WebSocket
- Historical data

### 10. hooks/useWebSocket.ts
- WebSocket connection management
- Connection status tracking
- Auto-reconnect with exponential backoff

### 11. components/ui/ (Shadcn-style)
Build unstyled, reusable UI primitives:
- Badge (variant: default, secondary, destructive, outline)
- Button (variant: default, destructive, outline, ghost, link)
- Card (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- Slider
- Tabs (Tabs, TabsList, TabsTrigger, TabsContent)
- Toast/Toaster (minimal toast notification system)
- ErrorBoundary (React error boundary component)

### 12. components/layout/Sidebar.tsx
Dark sidebar, 260px wide:
- Top: SentinelAI logo + shield icon, "Vizag Steel Plant"
- Current shift display: "Shift B | 06:00-14:00"
- 8 nav items with icons (Dashboard, Heatmap, Permits, Incidents, Alerts, Emergency, Copilot, Settings)
- Active route highlighting
- Alert badge on Alerts with live count, pulse animation on critical
- Bottom: Plant status indicator (colored dot + text), live date/time, "Safety Officer - Rajan M."

### 13. components/layout/TopNav.tsx
Top navigation bar:
- Page title (dynamic based on route)
- Search bar (placeholder)
- Notification bell with unread count
- User avatar/name
- Global risk indicator mini-badge

### 14. components/layout/PageWrapper.tsx
Wrapper for all pages:
- Integrates Sidebar + TopNav
- Main content area with padding
- Page title from props
- Breadcrumb optional

### 15. app/layout.tsx
Root layout:
- HTML with dark class
- Inter font import
- Sidebar + TopNav + main content
- Toast provider
- WebSocket connection initialization
- Error boundary wrapper
```

---

## PHASE 5: Frontend Pages — Dashboard & Heatmap

**What exists:** Full backend + frontend foundation (layout, hooks, types, API client).

**Goal:** Build the Dashboard and Geospatial Heatmap pages with real-time data.

**Prompt to paste:**

```
You are building the Dashboard and Heatmap pages of SentinelAI. The backend, frontend foundation, and layout components are complete. Now implement the two most data-rich pages.

## What to build

### PAGE 1: Dashboard (app/dashboard/page.tsx)

**Real-time:** Connect to WebSocket. Update sensor readings every 2s, risk scores every 5s, alerts immediately.

**Layout:**

**Top Bar:** Full-width global risk status bar
"PLANT STATUS: [level] | [N] ZONES ELEVATED | [N] PERMITS FLAGGED"
Background color changes by overall risk. Live-updating.

**Row 1 (4 cards, grid):**
1. Overall Plant Risk Score - Large gauge/donut chart (0-100), current score with trend arrow, risk level label
2. Active Alerts - Count of CRITICAL/HIGH/MEDIUM alerts, last alert timestamp, "View All" button
3. Active Permits - Total active, flagged count, suspended count
4. Workers at Risk - In elevated zones, in critical zones, total on-shift

**Row 2 (2 columns, 60/40 split):**
- Left: Sensor Time-Series Chart - Multi-line (CO, CH4, H2S, Temperature, Pressure), last 30 min, zone selector dropdown, real-time updating, dashed threshold lines
- Right: Live Alert Feed - Scrollable, icon + zone + description + time + severity badge, color-coded left border, click to expand

**Row 3 (2 columns, 50/50 split):**
- Left: Compound Risk Panel - List of active detections, rule name, zones, contributing sensors, expandable evidence
- Right: Zone Status Grid - 2x3 grid, each zone card: name, risk score, active permits, worker count, background by risk level, clickable

**Bottom:** Risk Trend Chart - Line chart of overall plant risk over last 2 hours, show incident predictions

**components/dashboard/ files (can be modular or inline in page):**
- RiskScoreGauge: Circular gauge animation (0-100), color transitions
- SensorCard: Mini card showing single sensor with value, unit, status indicator
- AlertFeed: Scrollable list with filtering
- ZoneStatusGrid: 2x3 clickable zone cards
- CompoundRiskPanel: Expandable rule cards with evidence

### PAGE 2: Geospatial Heatmap (app/heatmap/page.tsx)

Uses React-Leaflet for the base map, with SVG plant layout overlay.

**Plant Layout SVG:**
- Main plant boundary rectangle
- Zone A: Coke Oven Battery (top-left)
- Zone B: Blast Furnace (top-right)
- Zone C: Gas Processing Unit (center)
- Zone D: Control Room (bottom-center)
- Zone E: Maintenance Workshop (bottom-left)
- Zone F: Raw Material Storage (bottom-right)
- Pathways between zones
- Entry/exit gates (4)
- Emergency muster points (4, green triangles)

**Heatmap Visualization:**
- Color zones by risk score (green to amber to orange to red with transparency)
- Zone borders matching risk level
- Risk score label in zone center
- CRITICAL zones get pulsing animation

**Worker Dots:**
- Small colored dots at worker locations
- White normally, red in high-risk zones
- Hover: name, role, zone, shift
- Update every 10 seconds

**Sensor Markers:**
- Small icons on map at sensor locations
- Color by reading status (normal/warning/critical)
- Click to show reading popup

**Active Permit Overlays:**
- Highlight areas with active permits
- Patterns: Hot work = red cross-hatch, Confined space = blue diagonal, Electrical = yellow solid

**Controls Panel (right sidebar):**
- Layer toggles (workers, sensors, permits)
- Zone filter checkboxes
- Risk threshold slider
- Permit type filter
- Time slider (replay last 2 hours)

**Zone Detail Drawer:**
When zone clicked -> drawer slides open:
- Zone name, current risk score
- Live mini sensor charts
- Active permits list
- Workers in zone
- Recent alerts
- AI recommendation

**components/heatmap/PlantHeatmap.tsx** - Main heatmap component with Leaflet + SVG overlay
**components/heatmap/ZoneDetailDrawer.tsx** - Slide-out drawer with zone details
```

---

## PHASE 6: Frontend Pages — Permits & Incidents

**What exists:** Full backend, frontend foundation, Dashboard, Heatmap.

**Goal:** Build the Permit Intelligence and Incident RAG Intelligence pages.

**Prompt to paste:**

```
You are building the Permit Intelligence and Incident RAG Intelligence pages of SentinelAI. Dashboard and Heatmap are done. Now implement these two pages.

## What to build

### PAGE 3: Permit Intelligence (app/permits/page.tsx)

**Top: Summary Cards (4 in a row)**
- Total Active Permits
- Flagged Permits (warning color)
- Suspended Permits (red)
- Expiring Soon (within 2 hours)

**Main: Permits Table**
Columns: Permit ID | Type (with icon) | Zone | Start/End Time | Workers Involved | Status Badge (ACTIVE/FLAGGED/SUSPENDED/SAFE) | Risk Indicator (colored dot) | Actions (View/Suspend/Details)
- Sortable by any column
- Filterable by type, zone, status
- Real-time updates when permits are flagged

**Right Panel: Conflict Detection Feed**
- Real-time list of detected conflicts
- Each: permit ID, conflict type, severity badge, recommended action
- Auto-scrolls to newest
- Click to highlight on table

**Permit Detail Modal (when permit clicked):**
- Full permit details
- Real-time sensor readings for permit's zone (mini chart)
- Conflict analysis
- Affected workers list
- Regulatory basis for any flags
- Action buttons: Suspend, Notify Supervisor, View Zone

**SIMOPS Matrix:**
- Grid visualization of all active permits
- Rows and columns = permit IDs
- Cell colors: GREEN (safe), AMBER (caution), RED (dangerous combo)
- Click cell -> explanation of why combination is flagged

**components/permits/PermitTable.tsx:** Full table with sorting, filtering, status rendering
**components/permits/PermitConflictAlert.tsx:** Individual conflict alert card

### PAGE 4: Incident RAG Intelligence (app/incidents/page.tsx)

**Left Panel: RAG Chat Interface**
- Chat input: "Ask anything about past incidents or regulations..."
- Message history with AI responses
- Source citations below each AI response (showing document name, section)
- Loading indicator during AI response
- Suggested questions (clickable chips):
  - "What happened in similar gas accumulation incidents?"
  - "What does OISD say about confined space entry?"
  - "Show me incidents involving hot work and gas leaks"
  - "What are the most common root causes in coke oven accidents?"

**Right Panel: Pattern Intelligence Dashboard**
- Top: "Current Conditions vs Historical Incidents" - similarity percentage bar
- Incident frequency by type (bar chart, last 5 years)
- Root cause distribution (pie/donut chart)
- Table: Top 5 similar historical incidents to current plant state (with similarity score, date, zone, fatalities)
- Auto-generated Prevention Brief card (when risk > 60):
  "PREVENTION INTELLIGENCE ACTIVE
  Current Zone A conditions are 87% similar to Bhilai Steel Plant incident (March 2023).
  Key missed signals: [X, Y, Z]. Recommended immediate actions: [...]"

**API Integration:**
- POST /api/incidents/query for chat queries
- GET /api/incidents/patterns for chart data
- GET /api/incidents/similar for similarity table
- GET /api/incidents/intelligence for prevention brief

**components/charts/IncidentHistoryChart.tsx:** Bar/donut charts for incident data
```

---

## PHASE 7: Frontend Pages — Alerts, Emergency & Copilot

**What exists:** Full backend, all previous pages (Dashboard, Heatmap, Permits, Incidents).

**Goal:** Build the final 3 pages — Alert Center, Emergency Response Command Center, and AI Copilot.

**Prompt to paste:**

```
You are building the final 3 frontend pages of SentinelAI: Alert Center, Emergency Response, and AI Copilot. All previous pages exist. Now complete the application.

## What to build

### PAGE 5: Alert Center (app/alerts/page.tsx)

**Filter Bar:** All | Critical | High | Medium | Resolved | Acknowledged - toggle buttons, active filter highlighted

**Alert Timeline (chronological, newest first):**
Each alert card with: severity icon + label | Zone | Timestamp | Description | Risk Score | Action buttons (Acknowledge, Suspend Permits, Evacuate, View on Heatmap, View Evidence) | Contributing factors

**Alert Statistics Section:**
- Today's alert count by severity (horizontal bar or stacked)
- Alert frequency over last 8 hours (line chart)
- Zone with most alerts (bar chart, horizontal)
- Mean Time to Acknowledge (metric card)
- False Positive Rate (metric card, this shift)

### PAGE 6: Emergency Orchestrator (app/emergency/page.tsx)

**Header:** "EMERGENCY RESPONSE COMMAND CENTER" - full-width red banner when active

**Status Badge:** Current status - NORMAL (green) / STANDBY (amber) / ACTIVE (red, pulsing)

**Emergency Trigger Panel:**
- Manual "TRIGGER EMERGENCY" button (guarded - requires confirmation dialog)
- Auto-trigger status indicator (ENABLED/DISABLED)

**Automated Response Timeline (when emergency active):**
Live-updating checklist showing 6 steps with status icons (done/in-progress/pending):
- T+0s Alert Generated
- T+5s Notifications Dispatched
- T+10s Permits Suspended
- T+15s Sensor Snapshot Preserved
- T+30s Evacuation Protocol
- T+60s Incident Report Draft

**Evacuation Map:**
- Simplified plant map (SVG or Leaflet)
- Affected zone highlighted in red
- Evacuation routes as animated dashed arrows
- Muster points as pulsing green circles
- Worker count: "X workers need evacuation, Y reached muster point"

**Incident Report Preview:**
- Live auto-generated incident report
- All sections from the OISD-compliant template
- Download as PDF button
- Editable fields
- Regulatory submission checklist

### PAGE 7: AI Copilot (app/copilot/page.tsx)

**Full-screen chat interface.**

**Chat Area:**
- User messages: right-aligned, accent color background
- AI messages: left-aligned, card background
- AI messages include: response text + source citations + confidence indicator
- Empty state with "Ask me anything about plant safety"

**Input Area:**
- Multi-line text input
- Send button
- Enter to send, Shift+Enter for newline

**Suggested Prompts Sidebar (right side or collapsible):**
Clickable prompt chips for common questions

**Context Panel (right side):**
Live plant state summary: Plant Risk Score, Active Alerts, Flagged Permits, Zones at Risk

**Copilot API Integration:**
- POST /api/copilot/chat with message + context
- Handle loading, error, and empty states
- Maintain conversation history for context

**components/copilot/CopilotChat.tsx:** Main chat component

### Landing Page Update (app/page.tsx)
Update the landing page to show:
- Product name + tagline prominently
- Key features overview
- "Enter Dashboard" button
- Clean, minimal dark design
```

---

## PHASE 8: Polish, Integration & Demo

**What exists:** Complete application - all 7 frontend pages, all backend agents, APIs, data layer.

**Goal:** Wire everything together, ensure real-time data flows end-to-end, verify the demo scenario plays correctly, and fix any remaining gaps.

**Prompt to paste:**

```
You are completing and polishing SentinelAI. The full application is built - backend with all agents/APIs, frontend with all 7 pages. Now ensure everything works together end-to-end.

## Tasks

### 1. End-to-End Data Flow Verification
Ensure the following data flows work:

**Sensor Data Flow:**
- Simulator generates readings every 2s -> stored in-memory -> WebSocket broadcasts "sensor_update" -> Dashboard sensor charts update -> Heatmap zone colors update

**Risk Score Flow:**
- Compound risk agent runs every 5s -> reads current sensors + permits -> applies rules -> generates risk score -> WebSocket broadcasts "risk_update" -> Dashboard risk gauge updates -> Sidebar status updates -> Heatmap colors update

**Alert Flow:**
- When risk > threshold -> alert generated -> stored in alert list -> WebSocket broadcasts "alert_new" -> Alert feed updates -> Sidebar badge count updates -> Toast notification appears

**Permit Flag Flow:**
- Permit intelligence agent runs -> detects conflicts -> WebSocket broadcasts "permit_flagged" -> Permits table updates -> Conflict feed updates

**Emergency Flow:**
- When risk > 75 -> emergency orchestrator triggers -> WebSocket broadcasts "emergency_triggered" -> Emergency page shows active response -> Timeline auto-advances -> Report generates

**Copilot Flow:**
- User sends message -> POST /api/copilot/chat -> Backend prepares context (current risk, sensors, permits) -> GPT-4o generates response with sources -> Response rendered with citations

### 2. Fix Known Gaps
- Rule 5: change from ">=2 permits" to ">2 permits" per spec
- Ensure Inter font is properly imported in layout.tsx
- Ensure logo.svg is referenced correctly (not sentinel-logo.svg)
- Worker movement timing: ensure ~10s updates (not 2s)
- Verify error boundaries are on all pages
- Verify loading states for all async operations
- Verify all API calls have error handling
- Remove any console.log statements in production code

### 3. Demo Scenario Automation
- Demo should auto-play when DEMO_MODE=true
- Phase transitions work from API (POST /api/demo/advance)
- Demo reset endpoint (POST /api/demo/reset)
- "WITHOUT SentinelAI" comparison renders correctly
- Side-by-side comparison view works

### 4. Compliance Check
- Every page has real-time data (no static mocks)
- AI responses include reasoning and citations
- Risk scores update every 5s live
- Demo scenario auto-plays
- All charts real-time updating
- Dark theme throughout
- Error boundaries on all pages
- Loading states for all async operations
- Toast notifications for alerts

### 5. Final Polish
- Proper loading spinner on initial data fetch
- Check for React errors or warnings in console
- Verify CORS headers on all API endpoints
- Ensure WebSocket reconnects gracefully on disconnect
- Clean up any debug logging
```

---

## How to use

1. When starting a new session, identify which phase you're on
2. Paste the **entire "Prompt to paste" block** into your AI coding session
3. The AI will have enough context about what exists and what to build

To identify your current phase:
- Only folder structure exists? -> Phase 0
- Simulator + DB models exist but no API? -> Phase 1 done -> Phase 2
- API endpoints exist but no AI agent logic? -> Phase 2 done -> Phase 3
- Backend complete but frontend blank? -> Phase 3 done -> Phase 4
- Layout/Sidebar exists but no pages? -> Phase 4 done -> Phase 5
- Dashboard exists but other pages missing? -> Phase 5 done -> Phase 6 or 7
- Everything exists but needs polish? -> Phase 8
