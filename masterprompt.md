You are an expert full-stack AI engineer and solutions architect.
Build me a complete, production-quality hackathon prototype called
"SentinelAI" — an AI-Powered Industrial Safety Intelligence Platform.

Follow every instruction below precisely. Do not skip any section.
Build the entire application end-to-end.

═══════════════════════════════════════════════════════════
SECTION 1: PROJECT OVERVIEW
═══════════════════════════════════════════════════════════

Project Name: SentinelAI
Tagline: "Data existed. Intelligence did not. Until now."

Purpose:
SentinelAI is an AI-powered industrial safety platform that detects
compound risk conditions — dangerous combinations of events that no
single sensor would flag alone — and triggers preemptive interventions
before fatalities occur.

Core Problem Solved:
In facilities like Visakhapatnam Steel Plant, gas sensors worked,
permits existed, but no intelligence layer connected them.
SentinelAI IS that intelligence layer.

═══════════════════════════════════════════════════════════
SECTION 2: TECH STACK
═══════════════════════════════════════════════════════════

Frontend:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/UI components
- Recharts (for sensor data visualization)
- Leaflet.js or React-Leaflet (for geospatial heatmap)
- Framer Motion (for animations)
- Lucide React (icons)

Backend:
- Next.js API Routes (serverless)
- Python FastAPI microservice (for AI agents)
- WebSockets for real-time data streaming

AI Layer:
- OpenAI GPT-4o (LLM reasoning + RAG)
- LangChain (agent orchestration)
- LangGraph (multi-agent workflows)
- ChromaDB (vector store for RAG)
- OpenAI Embeddings (text-embedding-3-small)

Data Layer:
- PostgreSQL (via Supabase or local)
- Redis (real-time alert queue)
- Simulated IoT data generator (Python)

Visualization:
- Recharts for time-series sensor graphs
- React-Leaflet for plant heatmap
- Custom SVG plant layout overlay

═══════════════════════════════════════════════════════════
SECTION 3: COMPLETE FOLDER STRUCTURE
═══════════════════════════════════════════════════════════

Create the following folder structure exactly:

sentinelai/
├── frontend/                          # Next.js App
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Landing/Login
│   │   ├── dashboard/
│   │   │   └── page.tsx               # Main Dashboard
│   │   ├── heatmap/
│   │   │   └── page.tsx               # Geospatial View
│   │   ├── permits/
│   │   │   └── page.tsx               # Permit Intelligence
│   │   ├── incidents/
│   │   │   └── page.tsx               # Incident RAG Agent
│   │   ├── alerts/
│   │   │   └── page.tsx               # Alert Center
│   │   ├── emergency/
│   │   │   └── page.tsx               # Emergency Orchestrator
│   │   └── copilot/
│   │       └── page.tsx               # AI Copilot Chat
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopNav.tsx
│   │   │   └── PageWrapper.tsx
│   │   ├── dashboard/
│   │   │   ├── RiskScoreGauge.tsx
│   │   │   ├── SensorCard.tsx
│   │   │   ├── AlertFeed.tsx
│   │   │   ├── ZoneStatusGrid.tsx
│   │   │   └── CompoundRiskPanel.tsx
│   │   ├── heatmap/
│   │   │   ├── PlantHeatmap.tsx
│   │   │   └── ZoneDetailDrawer.tsx
│   │   ├── permits/
│   │   │   ├── PermitTable.tsx
│   │   │   └── PermitConflictAlert.tsx
│   │   ├── charts/
│   │   │   ├── SensorTimeSeriesChart.tsx
│   │   │   ├── RiskTrendChart.tsx
│   │   │   └── IncidentHistoryChart.tsx
│   │   ├── copilot/
│   │   │   └── CopilotChat.tsx
│   │   └── ui/                        # Shadcn components
│   ├── lib/
│   │   ├── api.ts                     # API client
│   │   ├── websocket.ts               # WebSocket client
│   │   ├── types.ts                   # TypeScript types
│   │   ├── constants.ts               # App constants
│   │   └── utils.ts                   # Utility functions
│   ├── hooks/
│   │   ├── useSensorData.ts
│   │   ├── useAlerts.ts
│   │   ├── useRiskScore.ts
│   │   └── useWebSocket.ts
│   ├── public/
│   │   ├── plant-layout.svg           # Plant map SVG
│   │   └── sentinel-logo.svg
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── package.json
│
├── backend/                           # FastAPI Python Backend
│   ├── main.py                        # FastAPI entry point
│   ├── requirements.txt
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── compound_risk_agent.py     # Core risk detection
│   │   ├── permit_intelligence_agent.py
│   │   ├── incident_rag_agent.py
│   │   └── emergency_orchestrator.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── risk_scorer.py             # Risk scoring model
│   │   ├── anomaly_detector.py        # Anomaly detection
│   │   └── knowledge_graph.py         # KG builder
│   ├── data/
│   │   ├── simulator.py               # IoT data simulator
│   │   ├── seed_data.py               # Initial data seeder
│   │   └── sample_incidents.json      # Historical incidents
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── document_loader.py         # Load regulations
│   │   ├── embeddings.py              # Vector embeddings
│   │   └── retriever.py               # RAG retrieval
│   ├── api/
│   │   ├── __init__.py
│   │   ├── sensors.py                 # Sensor data endpoints
│   │   ├── alerts.py                  # Alert endpoints
│   │   ├── permits.py                 # Permit endpoints
│   │   ├── risk.py                    # Risk score endpoints
│   │   ├── incidents.py               # Incident endpoints
│   │   └── copilot.py                 # AI copilot endpoint
│   ├── websocket/
│   │   ├── __init__.py
│   │   └── manager.py                 # WebSocket manager
│   ├── db/
│   │   ├── __init__.py
│   │   ├── models.py                  # DB models
│   │   └── connection.py              # DB connection
│   └── utils/
│       ├── __init__.py
│       └── logger.py                  # Structured logging
│
├── data/
│   ├── regulations/
│   │   ├── oisd_guidelines.txt        # Simulated OISD docs
│   │   ├── factory_act_safety.txt     # Factory Act clauses
│   │   └── dgms_mining_safety.txt     # DGMS guidelines
│   ├── incidents/
│   │   └── historical_incidents.json  # 50 incident records
│   └── plant/
│       └── zones.json                 # Plant zone config
│
├── docker-compose.yml
├── .env.example
└── README.md

═══════════════════════════════════════════════════════════
SECTION 4: SIMULATED DATA LAYER
═══════════════════════════════════════════════════════════

Create backend/data/simulator.py with the following:

PLANT ZONES (6 zones):
- Zone A: Coke Oven Battery (HIGH RISK)
- Zone B: Blast Furnace Area (HIGH RISK)
- Zone C: Gas Processing Unit (MEDIUM RISK)
- Zone D: Control Room (LOW RISK)
- Zone E: Maintenance Workshop (MEDIUM RISK)
- Zone F: Raw Material Storage (LOW RISK)

SENSOR TYPES per zone (simulate all):
1. Gas Sensors:
   - CO level (ppm): Normal 0-25, Warning 25-50, Critical >50
   - H2S level (ppm): Normal 0-5, Warning 5-10, Critical >10
   - CH4 level (%LEL): Normal 0-10, Warning 10-25, Critical >25
   - O2 level (%): Normal 19.5-23.5, Warning <19.5 or >23.5

2. Environmental Sensors:
   - Temperature (°C): Normal 20-60, Warning 60-80, Critical >80
   - Pressure (bar): Normal 0.8-1.2, Warning 1.2-1.5, Critical >1.5
   - Humidity (%): Normal 30-70

3. Equipment Sensors:
   - Vibration (mm/s): Normal 0-4, Warning 4-7, Critical >7
   - Equipment runtime (hours)
   - Last maintenance date

SIMULATION BEHAVIOR:
- Generate sensor readings every 2 seconds
- Normal readings 85% of time
- Gradually escalating readings 10% of time
- Sudden spike 5% of time
- Add realistic noise with numpy
- Store readings with timestamp, zone_id, sensor_id

WORKER DATA:
- 50 workers across plant
- Each has: worker_id, name, zone, shift, role
- Location updates every 10 seconds

PERMIT DATA (simulate 15 active permits):
- permit_id
- permit_type: HOT_WORK | CONFINED_SPACE | ELECTRICAL | HEIGHT | EXCAVATION
- zone_id
- start_time, end_time
- authorized_by
- workers_involved: list
- status: ACTIVE | SUSPENDED | COMPLETED

Generate a realistic scenario for demo:
Scenario Name: "Visakhapatnam Replay Prevention"
- At T+0: Gas sensor Zone A CH4 starts rising (slowly)
- At T+30s: Confined space permit activated Zone A
- At T+60s: Ventilation maintenance started Zone A
- At T+90s: SentinelAI compound risk = 78% → ALERT
- At T+120s: Without intervention = CRITICAL (simulated)
- System prevents at T+90s

═══════════════════════════════════════════════════════════
SECTION 5: COMPOUND RISK DETECTION ENGINE
═══════════════════════════════════════════════════════════

Create backend/agents/compound_risk_agent.py

RISK SCORING ALGORITHM:

Base Risk Score Calculation:
1. Individual Sensor Risk (0-40 points):
   - For each sensor: map reading to risk score
   - Weight sensors by criticality:
     * Gas sensors: weight 1.5x
     * Pressure: weight 1.2x
     * Temperature: weight 1.0x
   - Aggregate weighted sensor scores

2. Compound Condition Detection (0-40 points):
   Apply the following compound rules:

   Rule 1: CONFINED_SPACE + ELEVATED_GAS (any)
   → Add 25 points
   → Severity: CRITICAL

   Rule 2: HOT_WORK_PERMIT + CH4 > 10%LEL OR H2S > 5ppm
   → Add 30 points
   → Severity: CRITICAL
   → Immediate suspension required

   Rule 3: MAINTENANCE_ACTIVE + PRESSURE_ANOMALY
   → Add 20 points
   → Severity: HIGH

   Rule 4: SHIFT_CHANGEOVER (within 30 min) + ANY_ELEVATED_SENSOR
   → Add 15 points
   → Severity: MEDIUM

   Rule 5: MULTIPLE_PERMITS_SAME_ZONE (>2 simultaneously)
   → Add 15 points
   → Severity: MEDIUM

   Rule 6: VENTILATION_OFFLINE + CONFINED_SPACE_PERMIT
   → Add 35 points
   → Severity: CRITICAL

   Rule 7: NIGHT_SHIFT + CRITICAL_EQUIPMENT_OVERDUE_MAINTENANCE
   → Add 20 points
   → Severity: HIGH

3. Historical Pattern Bonus (0-20 points):
   - Check if current condition matches historical incident patterns
   - Add score based on similarity

4. Time Escalation Modifier:
   - If elevated conditions persist > 15 min: multiply by 1.2
   - If elevated conditions persist > 30 min: multiply by 1.5

RISK SCORE THRESHOLDS:
- 0-25: SAFE (Green)
- 26-50: CAUTION (Yellow)
- 51-75: HIGH RISK (Orange)
- 76-100: CRITICAL (Red) → Auto-trigger emergency

OUTPUT FORMAT for each risk assessment:
{
  "zone_id": "ZONE_A",
  "risk_score": 82,
  "risk_level": "CRITICAL",
  "triggered_rules": [
    {
      "rule_id": "RULE_6",
      "description": "Ventilation offline + confined space permit active",
      "contribution": 35,
      "evidence": {
        "ventilation_status": "OFFLINE",
        "permit_id": "PTW-2024-0847",
        "permit_type": "CONFINED_SPACE"
      }
    }
  ],
  "individual_sensors": [...],
  "recommended_actions": [...],
  "prediction_horizon": "45 minutes to critical threshold",
  "confidence": 0.89,
  "timestamp": "2024-01-15T14:32:00Z"
}

MULTI-AGENT ARCHITECTURE:
Use LangGraph to orchestrate the following agents:

Agent 1: SensorAnalysisAgent
- Continuously reads sensor data
- Detects anomalies
- Outputs: sensor risk scores

Agent 2: PermitCrossReferenceAgent
- Reads active permits
- Checks against sensor anomalies
- Outputs: permit conflict flags

Agent 3: WorkerSafetyAgent
- Checks worker locations vs risk zones
- Counts workers in danger
- Outputs: affected worker list

Agent 4: CompoundRiskSynthesizer (Supervisor Agent)
- Takes outputs from all 3 agents
- Applies compound rules
- Generates final risk score
- Triggers alerts

Agent 5: RecommendationAgent
- Takes compound risk output
- Generates specific actionable recommendations
- Uses GPT-4o for natural language generation

═══════════════════════════════════════════════════════════
SECTION 6: RAG INCIDENT INTELLIGENCE AGENT
═══════════════════════════════════════════════════════════

Create backend/rag/ system and backend/agents/incident_rag_agent.py

RAG SETUP:
1. Load documents from data/regulations/
2. Load historical incidents from data/incidents/
3. Chunk documents (chunk_size=500, overlap=50)
4. Embed with OpenAI text-embedding-3-small
5. Store in ChromaDB (persist locally)
6. Create retrieval chain

INCIDENT RECORDS (create 20 realistic incidents):
Each incident must have:
{
  "incident_id": "INC-2023-001",
  "date": "2023-03-15",
  "plant": "Bhilai Steel Plant",
  "zone": "Coke Oven Battery",
  "type": "Gas Explosion",
  "fatalities": 2,
  "injuries": 5,
  "root_causes": [
    "Elevated CO levels not acted upon",
    "Simultaneous maintenance and confined space entry",
    "Permit-to-work not checked against gas readings"
  ],
  "warning_signs_missed": [
    "CO sensor reading 35ppm for 2 hours before incident",
    "Ventilation inspection overdue by 3 days"
  ],
  "regulatory_violations": ["OISD-105 Section 4.2", "Factory Act Section 36"],
  "prevention_measures": [...],
  "description": "..."
}

RAG AGENT CAPABILITIES:
1. Pattern Query: 
   "What incidents occurred in similar conditions to current Zone A?"
   → Retrieve similar incidents → Summarize patterns → Generate prevention alert

2. Regulation Query:
   "What does OISD say about hot work near gas processing units?"
   → Retrieve regulation clauses → Return cited guidance

3. Prevention Intelligence:
   Automatically triggered when risk score > 60
   → Find 3 most similar historical incidents
   → Extract what warning signs were missed
   → Compare with current conditions
   → Generate: "This situation is 87% similar to Bhilai incident of 2023. 
      Key missed signals were: [X, Y, Z]. Recommend: [actions]"

═══════════════════════════════════════════════════════════
SECTION 7: PERMIT INTELLIGENCE AGENT
═══════════════════════════════════════════════════════════

Create backend/agents/permit_intelligence_agent.py

SIMOPS DETECTION (Simultaneous Operations):
Check all active permits against:
1. Current gas readings in same zone
2. Other active permits in same zone
3. Equipment under maintenance in same zone
4. Worker density in zone

CONFLICT RULES:
1. HOT_WORK + GAS_ELEVATED → IMMEDIATE SUSPENSION
2. HOT_WORK + CONFINED_SPACE (same zone, within 50m) → FLAG
3. ELECTRICAL_WORK + WET_CONDITIONS → FLAG
4. CONFINED_SPACE + VENTILATION_OFFLINE → IMMEDIATE SUSPENSION
5. >3 permits in single zone → FLAG FOR REVIEW
6. Permit duration > 8 hours without renewal → FLAG

PERMIT INTELLIGENCE OUTPUT:
{
  "permit_id": "PTW-2024-0847",
  "status": "FLAGGED",
  "conflicts": [
    {
      "conflict_type": "GAS_HAZARD",
      "description": "CH4 at 18%LEL in Zone A — hot work permit must be suspended",
      "regulatory_basis": "OISD-105 Clause 6.3",
      "action_required": "IMMEDIATE_SUSPENSION",
      "urgency": "CRITICAL"
    }
  ],
  "recommendation": "Suspend permit PTW-2024-0847 immediately...",
  "notified_parties": ["Zone Supervisor", "Safety Officer", "Permit Issuer"]
}

═══════════════════════════════════════════════════════════
SECTION 8: EMERGENCY RESPONSE ORCHESTRATOR
═══════════════════════════════════════════════════════════

Create backend/agents/emergency_orchestrator.py

TRIGGER CONDITION: Risk Score > 75 (CRITICAL)

AUTOMATED RESPONSE SEQUENCE:

Step 1 (T+0 seconds): Alert Generation
- Generate structured emergency alert
- Include: zone, risk score, contributing factors, worker count

Step 2 (T+5 seconds): Notification Dispatch
- Notify: Safety Officer, Shift Supervisor, Plant Manager
- Channels: In-app, Email (simulated), SMS (simulated)
- Alert message auto-generated by GPT-4o

Step 3 (T+10 seconds): Permit Suspension
- Auto-flag all active permits in affected zone
- Generate suspension notices

Step 4 (T+15 seconds): Sensor Snapshot
- Preserve complete sensor state as evidence
- Create immutable audit log entry

Step 5 (T+30 seconds): Evacuation Protocol
- Generate evacuation instructions per zone
- List all workers in affected area
- Identify nearest muster points

Step 6 (T+60 seconds): Incident Report Draft
- Auto-generate preliminary incident report
- Format: OISD compliant
- Include: timeline, sensor data, permits, workers affected
- Save as PDF-ready document

INCIDENT REPORT TEMPLATE (Auto-generated):
---
PRELIMINARY INCIDENT REPORT
Plant: [Plant Name]
Date/Time: [timestamp]
Zone: [zone]
Incident Type: [type]
Risk Score at Trigger: [score]

TIMELINE OF EVENTS:
[Auto-generated from sensor log]

CONTRIBUTING FACTORS:
[From compound risk analysis]

WORKERS POTENTIALLY AFFECTED:
[From worker location data]

PERMITS ACTIVE AT TIME OF INCIDENT:
[From permit database]

IMMEDIATE ACTIONS TAKEN:
[Automated response log]

REGULATORY NOTIFICATIONS REQUIRED:
[Based on incident type - Factory Act, OISD]

PRELIMINARY ROOT CAUSE:
[From AI analysis]

RECOMMENDATIONS:
[From RAG agent]
---

═══════════════════════════════════════════════════════════
SECTION 9: FRONTEND - COMPLETE UI DESIGN
═══════════════════════════════════════════════════════════

DESIGN SYSTEM:
- Theme: Dark industrial theme
- Primary Color: #0A0F1E (dark navy background)
- Secondary: #111827 (card background)
- Accent: #EF4444 (red for critical)
- Warning: #F59E0B (amber for warnings)
- Safe: #10B981 (green for safe)
- Text Primary: #F9FAFB
- Text Secondary: #9CA3AF
- Border: #1F2937

TYPOGRAPHY:
- Font: Inter (system)
- Headings: Bold, tight tracking
- Data: Mono font for numbers

═══════════════════════════════════════════════════════════
PAGE 1: DASHBOARD (app/dashboard/page.tsx)
═══════════════════════════════════════════════════════════

Layout: 
- Top: Global risk status bar (full width)
  → "PLANT STATUS: HIGH RISK | 3 ZONES ELEVATED | 2 PERMITS FLAGGED"
  → Background color changes by overall risk

- Row 1 (4 cards):
  Card 1: Overall Plant Risk Score
  → Large gauge/donut chart showing 0-100
  → Current score with trend arrow
  → Risk level label (SAFE/CAUTION/HIGH/CRITICAL)

  Card 2: Active Alerts
  → Count of CRITICAL, HIGH, MEDIUM alerts
  → Last alert timestamp
  → Quick action button

  Card 3: Active Permits
  → Total active permits
  → Flagged permits count
  → Suspended permits count

  Card 4: Workers at Risk
  → Workers in elevated zones
  → Workers in critical zones
  → Total on-shift count

- Row 2:
  Left (60%): Sensor Time-Series Chart
  → Multi-line chart showing last 30 minutes
  → Lines for: CO, CH4, H2S, Temperature, Pressure
  → Zone selector dropdown
  → Real-time updating (every 2 seconds)
  → Threshold lines shown as dashed horizontal lines

  Right (40%): Live Alert Feed
  → Scrollable list of alerts
  → Each alert: icon, zone, description, time, severity badge
  → Color-coded left border by severity
  → Click to expand details

- Row 3:
  Left (50%): Compound Risk Panel
  → List of active compound risk detections
  → For each: rule triggered, zones, contributing sensors
  → Expandable to see full evidence

  Right (50%): Zone Status Grid
  → 6 zone cards in 2x3 grid
  → Each zone: name, risk score, active permits count, worker count
  → Background color by risk level
  → Click to navigate to zone detail

- Bottom: Risk Trend Chart
  → Line chart of overall plant risk score over last 2 hours
  → Show incident predictions

MAKE DASHBOARD REAL-TIME:
Use WebSocket connection to update:
- Sensor readings every 2 seconds
- Risk score every 5 seconds
- Alerts immediately on trigger
- Zone status every 5 seconds

═══════════════════════════════════════════════════════════
PAGE 2: GEOSPATIAL HEATMAP (app/heatmap/page.tsx)
═══════════════════════════════════════════════════════════

Build a plant layout heatmap with the following:

PLANT LAYOUT (SVG overlay on a base map):
Create a simplified industrial plant layout with:
- Main plant boundary (rectangle)
- Zone A: Coke Oven Battery (top-left quadrant)
- Zone B: Blast Furnace (top-right quadrant)
- Zone C: Gas Processing Unit (center)
- Zone D: Control Room (bottom-center)
- Zone E: Maintenance Workshop (bottom-left)
- Zone F: Raw Material Storage (bottom-right)
- Pathways between zones
- Entry/exit gates (4 locations)
- Emergency muster points (4 locations, shown as green triangles)

HEATMAP VISUALIZATION:
- Color zones by risk score:
  * 0-25: rgba(16, 185, 129, 0.3) — green transparent
  * 26-50: rgba(245, 158, 11, 0.3) — amber transparent
  * 51-75: rgba(249, 115, 22, 0.4) — orange transparent
  * 76-100: rgba(239, 68, 68, 0.5) — red transparent (pulsing animation)
- Zone borders: solid color matching risk level
- Risk score label in zone center

WORKER LOCATION DOTS:
- Show each worker as a small colored dot
- Color: White normally, Red if in high-risk zone
- Hover: Show worker name, role, zone, shift
- Update position every 10 seconds (simulated movement)

SENSOR MARKERS:
- Small sensor icons on map
- Color by current reading status
- Click to show sensor reading popup

ACTIVE PERMIT OVERLAYS:
- Highlight areas covered by active permits
- Different patterns for different permit types:
  * Hot work: red cross-hatch
  * Confined space: blue diagonal
  * Electrical: yellow solid

CONTROLS PANEL (right sidebar):
- Layer toggles (show/hide workers, sensors, permits)
- Zone filter checkboxes
- Risk threshold slider (highlight zones above threshold)
- Permit type filter
- Time slider (replay last 2 hours of heatmap evolution)

ZONE DETAIL DRAWER:
When zone clicked → Side drawer opens showing:
- Zone name and current risk score
- Live sensor readings (mini charts)
- Active permits in zone
- Workers currently in zone
- Recent alerts for zone
- AI recommendation for zone

═══════════════════════════════════════════════════════════
PAGE 3: PERMIT INTELLIGENCE (app/permits/page.tsx)
═══════════════════════════════════════════════════════════

LAYOUT:
- Top: Summary cards (Total Active, Flagged, Suspended, Expired Soon)
- Main: Permits table with columns:
  * Permit ID
  * Type (with icon)
  * Zone
  * Start/End Time
  * Workers Involved
  * Status Badge (ACTIVE/FLAGGED/SUSPENDED/SAFE)
  * Risk Indicator (colored dot)
  * Actions (View, Suspend, Details)

- Right Panel: Conflict Detection Feed
  → Real-time list of detected conflicts
  → Each: permit ID, conflict type, severity, recommended action

PERMIT DETAIL MODAL:
When permit clicked:
- Full permit details
- Real-time sensor readings for permit zone
- Conflict analysis (if any)
- Affected workers
- Regulatory basis for any flags
- Action buttons: Suspend Permit, Notify Supervisor, View Zone

SIMOPS MATRIX:
Visual matrix showing all active permits:
- Rows and columns: permit IDs
- Cell color: GREEN (safe combination), AMBER (caution), RED (dangerous)
- Click cell: see why combination is flagged

═══════════════════════════════════════════════════════════
PAGE 4: INCIDENT RAG INTELLIGENCE (app/incidents/page.tsx)
═══════════════════════════════════════════════════════════

LAYOUT:
- Left panel: RAG Chat Interface
  → Chat input: "Ask anything about past incidents or regulations"
  → Message history with AI responses
  → Source citations shown below each response
  → Suggested questions:
    * "What happened in similar gas accumulation incidents?"
    * "What does OISD say about confined space entry?"
    * "Show me incidents involving hot work and gas leaks"
    * "What are the most common root causes in coke oven accidents?"

- Right panel: Pattern Intelligence Dashboard
  → Top: "Current Conditions vs Historical Incidents" similarity score
  → Chart: Incident frequency by type (last 5 years)
  → Chart: Root cause distribution (pie)
  → Table: Top 5 similar historical incidents to current plant state
  → Auto-generated prevention brief (when risk elevated)

PREVENTION BRIEF (Auto-generated when risk > 60):
Show a card:
"⚠️ PREVENTION INTELLIGENCE ACTIVE
Current Zone A conditions are 87% similar to 
Bhilai Steel Plant incident (March 2023) where 
2 workers died. Key missed signals were: [X, Y, Z].
Recommended immediate actions: [...]"

═══════════════════════════════════════════════════════════
PAGE 5: ALERT CENTER (app/alerts/page.tsx)
═══════════════════════════════════════════════════════════

LAYOUT:
- Filter bar: All | Critical | High | Medium | Resolved | Acknowledged
- Alert timeline (sorted by time, newest first)
  
ALERT CARD design:
┌─────────────────────────────────────────────┐
│ 🔴 CRITICAL | Zone A | 14:32:05            │
│ Compound Risk: CONFINED SPACE + GAS HAZARD  │
│ CH4: 18%LEL | Permit PTW-2024-0847 ACTIVE  │
│ 3 workers in zone | Risk Score: 82          │
│ [Acknowledge] [Suspend Permits] [Evacuate]  │
│ Contributing factors: → Rule 6, Rule 1      │
└─────────────────────────────────────────────┘

ALERT ACTIONS:
Each alert has buttons:
- Acknowledge (mark seen)
- Suspend Related Permits
- Notify Team
- Trigger Evacuation
- View on Heatmap
- View Evidence

ALERT STATISTICS:
- Top: Today's alert count by severity
- Chart: Alert frequency over last 8 hours
- Chart: Zone with most alerts (bar chart)
- Metric: Mean Time to Acknowledge
- Metric: False Positive Rate (this shift)

═══════════════════════════════════════════════════════════
PAGE 6: EMERGENCY ORCHESTRATOR (app/emergency/page.tsx)
═══════════════════════════════════════════════════════════

LAYOUT:
- Header: "EMERGENCY RESPONSE COMMAND CENTER"
- Status: Current emergency status (NORMAL/STANDBY/ACTIVE)

EMERGENCY TRIGGER PANEL:
- Manual trigger button (guarded with confirmation)
- Auto-trigger status

AUTOMATED RESPONSE TIMELINE:
When emergency active, show real-time timeline:
┌─────────────────────────────────────────────┐
│ EMERGENCY RESPONSE: ACTIVE                  │
│ Zone A | Risk Score: 82 | 14:32:05         │
│                                             │
│ ✅ T+0s   Alert Generated                  │
│ ✅ T+5s   Notifications Dispatched (4)      │
│ ✅ T+10s  Permits Suspended (2)             │
│ ✅ T+15s  Sensor Snapshot Preserved         │
│ 🔄 T+30s  Evacuation Protocol (IN PROGRESS) │
│ ⏳ T+60s  Incident Report (PENDING)         │
└─────────────────────────────────────────────┘

EVACUATION MAP:
- Show plant heatmap with evacuation routes
- Highlight affected zone in red
- Show evacuation paths as animated arrows
- Show muster points as pulsing green circles
- Worker count: X workers need evacuation, Y reached muster point

INCIDENT REPORT PREVIEW:
- Live preview of auto-generated incident report
- Download as PDF button
- Edit fields before submission
- Regulatory submission checklist

═══════════════════════════════════════════════════════════
PAGE 7: AI COPILOT (app/copilot/page.tsx)
═══════════════════════════════════════════════════════════

DESIGN: Full-screen chat interface

SYSTEM PROMPT for Copilot:
"You are SentinelAI Copilot, an expert industrial safety AI assistant 
for heavy manufacturing plants. You have access to real-time sensor data, 
active permits, worker locations, historical incident database, and 
regulatory guidelines (OISD, Factory Act, DGMS). 
Always provide specific, actionable safety recommendations.
Always cite regulatory basis for recommendations.
When asked about current plant status, use the provided real-time data.
Prioritize life safety above all else."

CAPABILITIES:
- Answer questions about current plant status
- Explain why alerts were triggered
- Provide regulatory guidance
- Suggest corrective actions
- Query historical incidents
- Generate safety briefings

INTERFACE:
- Chat messages (user: right, AI: left)
- AI messages show: text + sources + confidence
- Suggested prompts sidebar:
  * "What is the current risk in Zone A?"
  * "Why was alert #1234 triggered?"
  * "What should I do about the CH4 reading?"
  * "Generate a safety briefing for the morning shift"
  * "What OISD regulations apply to current Zone B conditions?"
  * "Show me all incidents similar to what's happening now"

- Context panel (right side):
  Shows current plant state injected into context:
  * Plant Risk Score: [live]
  * Active Alerts: [count]
  * Flagged Permits: [count]
  * Zones at Risk: [list]

═══════════════════════════════════════════════════════════
SECTION 10: SIDEBAR NAVIGATION
═══════════════════════════════════════════════════════════

Build components/layout/Sidebar.tsx:

DESIGN:
- Dark theme, 260px wide
- Logo at top: SentinelAI with shield icon
- Plant name below: "Vizag Steel Plant"
- Current shift: "Shift B | 06:00-14:00"

NAVIGATION ITEMS:
- 🏠 Dashboard
- 🗺️ Plant Heatmap
- 📋 Permit Intelligence
- 📊 Incident Analysis
- 🔔 Alert Center [badge with count]
- 🚨 Emergency Response
- 🤖 AI Copilot
- ⚙️ Settings

BOTTOM SECTION:
- Overall Plant Status indicator
  → Large colored dot + text (SAFE/CAUTION/HIGH RISK/CRITICAL)
- Current date/time (live updating)
- Logged in user: "Safety Officer - Rajan M."

ALERT BADGE:
- Live count of unacknowledged alerts on Alert Center nav item
- Pulse animation when new critical alert

═══════════════════════════════════════════════════════════
SECTION 11: API ENDPOINTS
═══════════════════════════════════════════════════════════

Build the following FastAPI endpoints:

backend/api/sensors.py:
GET /api/sensors/current          → All current sensor readings (all zones)
GET /api/sensors/{zone_id}        → Sensors for specific zone
GET /api/sensors/{zone_id}/history → Last 2 hours of readings
GET /api/sensors/anomalies         → Current anomalies across plant

backend/api/risk.py:
GET /api/risk/plant               → Overall plant risk score
GET /api/risk/zones               → Risk score per zone
GET /api/risk/{zone_id}           → Detailed risk for zone
GET /api/risk/history             → Risk score history (2 hours)
POST /api/risk/analyze            → Trigger manual risk analysis

backend/api/alerts.py:
GET /api/alerts                   → All alerts (filterable)
GET /api/alerts/active            → Active unacknowledged alerts
POST /api/alerts/{id}/acknowledge → Acknowledge alert
POST /api/alerts/{id}/resolve     → Resolve alert
POST /api/alerts/trigger          → Manual alert trigger

backend/api/permits.py:
GET /api/permits                  → All permits
GET /api/permits/active           → Active permits only
GET /api/permits/conflicts        → Detected conflicts
POST /api/permits/{id}/suspend    → Suspend permit
GET /api/permits/simops           → SIMOPS matrix data

backend/api/incidents.py:
GET /api/incidents                → Historical incidents
POST /api/incidents/query         → RAG query for incidents
GET /api/incidents/patterns       → Pattern analysis
GET /api/incidents/similar        → Similar to current conditions

backend/api/copilot.py:
POST /api/copilot/chat            → Copilot message endpoint
  Body: { message: string, context: PlantContext }
  Returns: { response: string, sources: [], confidence: float }

backend/websocket/manager.py:
WebSocket: ws://localhost:8000/ws
Events emitted:
- sensor_update: { zone_id, sensor_id, value, timestamp }
- risk_update: { zone_id, score, level }
- alert_new: { alert object }
- permit_flagged: { permit object }
- emergency_triggered: { emergency object }

═══════════════════════════════════════════════════════════
SECTION 12: ENVIRONMENT SETUP
═══════════════════════════════════════════════════════════

Create .env.example:

# OpenAI
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sentinelai
REDIS_URL=redis://localhost:6379

# Backend
BACKEND_URL=http://localhost:8000
WEBSOCKET_URL=ws://localhost:8000/ws

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws

# Settings
RISK_ALERT_THRESHOLD=75
RISK_WARNING_THRESHOLD=50
SENSOR_UPDATE_INTERVAL=2
RISK_CALCULATION_INTERVAL=5
DEMO_MODE=true

Create backend/requirements.txt:
fastapi==0.109.0
uvicorn==0.27.0
websockets==12.0
langchain==0.1.0
langchain-openai==0.0.5
langchain-community==0.0.12
langgraph==0.0.28
chromadb==0.4.22
openai==1.10.0
numpy==1.26.3
pandas==2.1.4
scikit-learn==1.4.0
psycopg2-binary==2.9.9
redis==5.0.1
python-dotenv==1.0.0
pydantic==2.5.3
httpx==0.26.0

Create frontend/package.json dependencies:
next, react, typescript, tailwindcss,
@radix-ui/react-*, shadcn-ui,
recharts, react-leaflet, leaflet,
framer-motion, lucide-react,
axios, socket.io-client,
date-fns, clsx, tailwind-merge

═══════════════════════════════════════════════════════════
SECTION 13: DOCKER SETUP
═══════════════════════════════════════════════════════════

Create docker-compose.yml:
services:
  frontend:
    build: ./frontend
    ports: 3000:3000
    env_file: .env

  backend:
    build: ./backend
    ports: 8000:8000
    env_file: .env
    depends_on: [postgres, redis]

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: sentinelai
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: sentinel2024

  redis:
    image: redis:7-alpine
    ports: 6379:6379

  chromadb:
    image: chromadb/chroma
    ports: 8001:8000

═══════════════════════════════════════════════════════════
SECTION 14: DEMO SCENARIO AUTOMATION
═══════════════════════════════════════════════════════════

Create backend/data/demo_scenario.py

This script runs the Visakhapatnam Prevention Demo:

DEMO TIMELINE (auto-plays when demo_mode=true):

T+0s:
- All zones: NORMAL readings
- 15 active permits (all SAFE)
- 50 workers distributed normally
- Plant Risk Score: 18 (SAFE)

T+30s:
- Zone A: CH4 starts rising: 5% → 8% → 12%LEL (gradual)
- Permit PTW-2024-0847 (CONFINED_SPACE, Zone A) becomes ACTIVE
- Zone A Risk Score: 35 → CAUTION

T+60s:
- Zone A: Ventilation system goes OFFLINE
- CH4: 15%LEL
- Zone A Risk Score: 62 → HIGH RISK
- First alert generated

T+90s:
- SentinelAI detects: Compound Rule 6 triggered
  (VENTILATION_OFFLINE + CONFINED_SPACE_PERMIT)
- Zone A Risk Score: 82 → CRITICAL
- Emergency Orchestrator: TRIGGERED
- Permits suspended automatically
- Notifications dispatched
- Evacuation protocol initiated

T+120s:
- Show "WITHOUT SENTINELAI" comparison:
  Individual sensors alone would show:
  * CH4 sensor: 15%LEL (below 25% threshold) = NO ALERT
  * Permit system: Active (no gas data) = NO ALERT
  * Ventilation system: Offline (no cross-reference) = NO ALERT
  * RESULT: NO ALERT → Simulated explosion at T+180s

T+90s (WITH SENTINELAI):
  * Compound detection: ALERT at 82% risk
  * Lead time: 90 seconds before critical
  * Workers evacuated
  * Incident prevented

Show this comparison side-by-side in demo mode.

═══════════════════════════════════════════════════════════
SECTION 15: README
═══════════════════════════════════════════════════════════

Create comprehensive README.md:

# SentinelAI - Industrial Safety Intelligence Platform
## "Data existed. Intelligence did not. Until now."

### Problem
6,500+ fatal workplace accidents in India (FY2023)
Data exists but no intelligence layer connects it

### Solution
AI-powered compound risk detection engine that correlates:
- IoT sensor data
- Permit-to-work logs  
- SCADA systems
- Worker location data
- Historical incidents + regulations

### Key Features
1. Compound Risk Detection Engine
2. Geospatial Safety Heatmap
3. Digital Permit Intelligence Agent
4. Incident RAG Intelligence
5. Emergency Response Orchestrator
6. AI Safety Copilot

### Tech Stack
list all technologies

### Setup Instructions
[step by step]

### Demo Scenario
[how to run the Visakhapatnam Prevention Demo]

### Architecture
[describe multi-agent architecture]

### Impact
- Detects risk 1+ hours before incident threshold
- 40%+ reduction in false negatives vs single-sensor
- Covers OISD, Factory Act, DGMS regulations
- Scalable to 10,000+ sensors

═══════════════════════════════════════════════════════════
SECTION 16: EXECUTION INSTRUCTIONS
═══════════════════════════════════════════════════════════

Build everything in this order:

1. Set up folder structure
2. Initialize Next.js frontend with TypeScript + Tailwind
3. Set up FastAPI backend
4. Create simulated data generator (run immediately)
5. Build database models
6. Build WebSocket server
7. Build API endpoints (with simulated data, no real DB needed for demo)
8. Build risk scoring engine
9. Build compound risk agent (LangGraph)
10. Build RAG system (ChromaDB + OpenAI)
11. Build permit intelligence agent
12. Build emergency orchestrator
13. Build frontend pages (in order: Dashboard → Heatmap → Permits → Incidents → Alerts → Emergency → Copilot)
14. Build real-time WebSocket connection in frontend
15. Connect frontend to backend APIs
16. Test demo scenario
17. Write README

IMPORTANT RULES:
- Every page must have real-time data (no static mocks in UI)
- All AI responses must include reasoning and citations
- Risk scores must update live every 5 seconds
- Demo scenario must auto-play and be controllable
- All charts must be real-time updating
- Mobile responsive is nice-to-have, not required
- Dark theme throughout, no light mode needed
- TypeScript strict mode: no 'any' types
- Error boundaries on all pages
- Loading states for all async operations
- Toast notifications for all alerts

START BUILDING NOW. Begin with Section 3 (folder structure),
then proceed sequentially through all sections.
Do not stop until the complete application is built.