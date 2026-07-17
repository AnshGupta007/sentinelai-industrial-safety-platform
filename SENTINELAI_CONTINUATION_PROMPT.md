# SentinelAI — Continuation Prompt

Copy and paste the entire block below into a new conversation to continue development with full context:

---

```
You are an expert full-stack AI engineer continuing work on SentinelAI — an AI-Powered Industrial Safety Intelligence Platform for the Economic Times Hackathon.

## Project Context
SentinelAI is a multi-agent system that detects compound risk conditions (e.g., confined space entry + gas accumulation) that no single sensor would flag. It fuses IoT sensors, permit-to-work logs, CCTV, and shift records into a unified intelligence layer. The demo scenario replays the Visakhapatnam Steel Plant gas explosion (Jan 2025) and shows how SentinelAI prevents it.

## Current State (Already Built)
### Backend (FastAPI + Python):
- `backend/main.py` — FastAPI app with 8 routers, WebSocket, lifespan (DB init, RAG init, Knowledge Graph build)
- `backend/data/simulator.py` — 600+ line simulator: 6 zones, 8 sensor types, 15 permits, 50 workers, 20 historical incidents, 10 regulations, 7 compound risk rules, phase-based escalation (120s cycle)
- `backend/agents/compound_risk_agent.py` — 5-node LangGraph pipeline (sensor analysis → permit cross-ref → worker safety → synthesizer → recommender)
- `backend/agents/permit_intelligence_agent.py` — 6-rule conflict detector (GAS_HAZARD, VENTILATION_FAILURE, SIMOPS, WET_CONDITIONS, etc.)
- `backend/agents/emergency_orchestrator.py` — 6-step automated response (alert → notify → suspend permits → snapshot → evacuate → report)
- `backend/agents/incident_rag_agent.py` — RAG query + LLM Q&A chain
- `backend/api/` — 8 API modules (sensors, alerts, permits, risk, incidents, copilot, workers, emergency, knowledge_graph)
- `backend/rag/` — ChromaDB vector store, Groq LLM fallback
- `backend/db/` — SQLite + optional PostgreSQL, SQLAlchemy ORM
- `backend/websocket/manager.py` — Real-time event broadcasting
- `backend/redis/client.py` — Redis pub/sub with in-memory fallback
- `backend/knowledge_graph/graph.py` — NEW: NetworkX graph with 343 nodes, 417 edges connecting zones, sensors, incidents, regulations, equipment, permits, workers, root causes, warning signs, prevention measures. Supports NL query, root cause patterns, regulation lookup, zone subgraph, prevention intelligence.

### Frontend (Next.js 14 + TypeScript):
- `frontend/src/app/` — 11 pages: landing, dashboard, heatmap (Leaflet), permits (table + SIMOPS matrix), incidents (RAG chat), alerts (filters + stats), emergency (command center), copilot (AI chat), settings, knowledge-graph (graph viz + query)
- `frontend/src/components/` — dashboard widgets (RiskScoreGauge, SensorCard, AlertFeed, ZoneStatusGrid, CompoundRiskPanel, WithWithoutComparison), charts (SensorTimeSeriesChart, RiskTrendChart, IncidentHistoryChart, AlertBarChart), heatmap (LeafletHeatmap, ZoneDetailDrawer), permits (PermitTable, PermitConflictAlert), copilot (CopilotChat), knowledge-graph (GraphVisualizer), common (Toast, ErrorBoundary, WebSocketProvider)
- `frontend/src/lib/` — types.ts (all interfaces), utils.ts (helpers), constants.ts (thresholds, zone config, rules), api.ts (35+ API methods incl. KG endpoints), websocket.ts (singleton client), simulator.ts (695-line frontend fallback engine)
- Frontend compiles with zero TS errors.

### Key Numbers:
- 20 historical incidents with root causes, warning signs, prevention measures, regulatory violations
- 10 regulations from OISD-105, Factory Act 1948, DGMS Technical Circulars
- 7 compound risk rules (confined space + gas, hot work + flammable, shift changeover, SIMOPS, ventilation failure, etc.)
- 343 knowledge graph nodes, 417 edges
- Demo: 120s escalation cycle, auto-emergency at Risk > 75

## What Needs to Be Built (Priority Order)

### P0: Knowledge Graph ✅ (COMPLETED)
- `backend/knowledge_graph/graph.py` — SafetyKnowledgeGraph class with NetworkX
- `backend/api/knowledge_graph.py` — 7 endpoints: /status, /query, /graph, /zone/{id}, /incidents/similar, /regulations, /patterns, /prevention-intelligence, /build
- `frontend/src/app/knowledge-graph/page.tsx` — Query interface, graph viz, root cause patterns, prevention intelligence
- `frontend/src/components/knowledge-graph/GraphVisualizer.tsx` — Custom canvas force-directed graph with pan/zoom/click
- `frontend/src/components/dashboard/WithWithoutComparison.tsx` — Side-by-side timeline comparison

### P0: WITH vs WITHOUT Comparison ✅ (COMPLETED)
- `frontend/src/components/dashboard/WithWithoutComparison.tsx` — Collapsible panel on dashboard

### P1: Predictive Risk with ML ❌ (NOT STARTED)
Build a predictive risk model that forecasts gas levels and risk scores 30/60/90 minutes ahead using sklearn:

1. Create `backend/models/predictive_risk.py`:
   - Use sklearn LinearRegression or Exponential Moving Average
   - Train on historical sensor data from simulator (trend + noise)
   - Predict CH4, CO, H2S levels at t+30, t+60, t+90
   - Convert predictions to risk score forecasts
   - Return predictions with confidence intervals
   
2. Update `backend/agents/compound_risk_agent.py`:
   - Add a predictive_risk node BEFORE the synthesizer
   - Include predictions in the compound analysis
   - When predicted risk exceeds threshold, trigger preemptive alert

3. Add API endpoint: GET `/api/risk/predictions/{zone_id}`
   Return: `{ predictions: [{ timestamp, predictedCH4, predictedRisk, confidence }], horizon: "90min" }`

4. Frontend: Add prediction overlay to dashboard:
   - Show predicted risk as dashed line on RiskTrendChart
   - Show "CH4 predicted to reach 18%LEL in 45 minutes" warning card
   - Update `frontend/src/components/charts/index.tsx` RiskTrendChart to accept optional predictions

### P1: What-If Scenario Simulator ❌ (NOT STARTED)
Create an interactive scenario page:

1. Create `frontend/src/app/what-if/page.tsx`:
   - Toggle switches: "Ventilation Offline", "Hot Work Permit Active", "Shift Changeover", "Gas Leak in Zone A", "Maintenance in Zone B"
   - Sliders: CH4 level, CO level, O2 level (override sensor values)
   - Risk meter that recalculates in real-time based on toggles
   - Compound rules fire visibly with animation

2. Add to Sidebar nav: `{ href: "/what-if", label: "What-If Sim", icon: }`

3. Backend: POST `/api/simulator/what-if` 
   Accept overrides, return calculated risk assessment

### P2: CV-Based PPE Detection ❌ (NOT STARTED)
Simulated CCTV analytics:

1. Create `backend/cv/ppe_detector.py`:
   - Accept image URL or mock detection events
   - Detect: helmet, vest, harness presence
   - Check against active permits (height work needs harness, etc.)
   - Generate ALERT if PPE missing for dangerous permit type

2. Create `backend/api/cv.py`:
   - POST `/api/cv/detect` — analyze image
   - GET `/api/cv/violations` — active PPE violations

3. Create `frontend/src/app/cctv/page.tsx`:
   - Show simulated CCTV feed (rotating images or camera icon)
   - PPE violation alerts with worker name, zone, missing equipment
   - Link to permit intelligence
   - Live violation counter

4. Add to Sidebar nav

### P2: Alert Notifications (WhatsApp/SMS Simulation) ❌ (NOT STARTED)
1. Create `backend/notifications/simulator.py`:
   - Queue-based notification dispatcher
   - Channels: WhatsApp, SMS, Email, PA System (all simulated)
   - Log sent notifications with timestamp, channel, recipient, message

2. Update emergency orchestrator to dispatch notifications
3. Show notification history on Emergency page

## Files Reference (Read These First)
- `backend/main.py` — main app, routing, lifespan
- `backend/data/simulator.py` — all data generation and risk calculation
- `backend/knowledge_graph/graph.py` — knowledge graph engine (already built, good pattern reference)
- `backend/agents/compound_risk_agent.py` — LangGraph multi-agent pipeline
- `frontend/src/app/dashboard/page.tsx` — main dashboard (place predictions here)
- `frontend/src/components/charts/index.tsx` — chart components (extend RiskTrendChart)
- `frontend/src/components/layout/Sidebar.tsx` — add nav items here
- `frontend/src/lib/api.ts` — add API methods here
- `frontend/src/lib/types.ts` — add TypeScript types here

## Design System
- Dark theme: bg `#060B18` / `#0A0F1E`, cards `bg-white/[0.02]`, borders `border-white/[0.06]`
- Risk colors: SAFE=emerald(#10B981), CAUTION=amber(#F59E0B), HIGH=orange(#F97316), CRITICAL=red(#EF4444)
- Font: Inter body, monospace for data
- Layout: Fixed 260px sidebar + sticky top nav + scrollable content
- Components use `glass-card` class (backdrop-blur + semi-transparent bg)
- All new pages must wrap content in `<PageWrapper title="..." subtitle="...">`

## Key Style Rules
- Use `width={N} height={N} className="shrink-0"` for lucide-react icons (NOT size prop)
- Available icons: Shield, LayoutDashboard, Map, ClipboardList, BarChart3, Bell, AlertTriangle, Bot, Settings, Activity, Zap, Brain, ArrowRight, AlertOctagon, Info, CheckCircle, X, RefreshCw, Network, Search, BookOpen, Lightbulb, TrendingUp, XCircle, Users, Clock, TrendingDown, ExternalLink, Filter, Layers, Download
- No comments in code
- Use Tailwind CSS v4 classes
- All new features should gracefully degrade (if API fails, show fallback)

## Verification
- Frontend: Run `cd frontend && npx tsc --noEmit` — must have zero errors
- Backend: Run `python -c "import sys; sys.path.insert(0, 'backend'); from main import app; print('OK')"` from project root
- Always clean up test files after verification
```
