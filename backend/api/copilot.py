from fastapi import APIRouter
from data.simulator import get_plant_state, get_risk_assessments, get_current_sensors, get_permits, get_alerts, get_emergency, HISTORICAL_INCIDENTS, REGULATIONS, ZONE_CONFIG
import os
import json
import random
from utils.logger import setup_logger

logger = setup_logger("copilot")
router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

SYSTEM_PROMPT = """You are SentinelAI Copilot, an expert industrial safety AI assistant for steel plants. You have access to real-time plant data.

Current plant context (JSON):
{context}

Safety regulations available: OISD-105, Factory Act 1948, DGMS Technical Circulars.
Historical incident records: 20 incidents from Indian steel plants (2022-2023).

Rules:
1. Use ONLY the provided context data — do not fabricate sensor values, permit statuses, or incidents.
2. When referencing regulations, cite specific section numbers (e.g., OISD-105 §4.2).
3. When referencing incidents, mention the incident ID and plant name.
4. Provide actionable, specific safety recommendations based on current conditions.
5. If the user asks about something not in the provided context, say so clearly.
6. Keep responses concise and technical — suitable for a plant floor environment.

Respond with a JSON object containing:
- "response": your answer as markdown string
- "sources": list of source names used (e.g., ["OISD-105 §4.2", "Real-time sensor data"])
- "confidence": float between 0 and 1"""


def build_context() -> str:
    state = get_plant_state()
    sensors = get_current_sensors()
    permits = get_permits()
    alerts = get_alerts()
    assessments = get_risk_assessments()
    emergency = get_emergency()
    risk_map = {a["zoneId"]: a for a in assessments}

    zones = []
    for zc in ZONE_CONFIG:
        zid = zc["zoneId"]
        rz = risk_map.get(zid, {})
        s_count = len([s for s in sensors if s["zoneId"] == zid])
        p_count = len([p for p in permits if p["zoneId"] == zid and p["status"] not in ("SUSPENDED", "COMPLETED")])
        zones.append({
            "zoneId": zid, "name": zc["name"], "riskLevel": rz.get("riskLevel", "SAFE"),
            "riskScore": rz.get("riskScore", 0), "activePermits": p_count, "sensorCount": s_count,
        })

    return json.dumps({
        "plantState": {
            "overallRiskScore": state["overallRiskScore"],
            "overallRiskLevel": state["overallRiskLevel"],
            "activeAlerts": state["activeAlerts"],
            "flaggedPermits": state["flaggedPermits"],
            "workersAtRisk": state["workersAtRisk"],
            "zones": zones,
        },
        "sensorReadings": [{"sensorId": s["sensorId"], "zoneId": s["zoneId"], "type": s["type"], "value": s["value"], "unit": s["unit"], "status": s["status"]} for s in sensors[:40]],
        "permits": [{"permitId": p["permitId"], "type": p["type"], "zoneId": p["zoneId"], "status": p["status"], "conflicts": p.get("conflicts", [])} for p in permits[:20]],
        "alerts": [{"alertId": a["alertId"], "severity": a["severity"], "title": a["title"], "zoneId": a["zoneId"]} for a in alerts[:10]],
        "emergency": {"status": emergency["status"], "zoneId": emergency["zoneId"]} if emergency else None,
        "recentIncidents": [{"incident_id": i["incident_id"], "type": i["type"], "plant": i["plant"], "date": i["date"], "fatalities": i["fatalities"], "root_causes": i["root_causes"][:2]} for i in HISTORICAL_INCIDENTS[:5]],
    }, default=str)


def extract_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    import re
    m = re.search(r"\{[^{}]*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    m2 = re.search(r"```(?:json)?\s*\n(.+?)\n```", text, re.DOTALL)
    if m2:
        try:
            return json.loads(m2.group(1))
        except json.JSONDecodeError:
            pass
    return None


def generate_llm_response(message: str) -> dict:
    context = build_context()
    prompt = SYSTEM_PROMPT.format(context=context)

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": message + "\n\nRespond ONLY with valid JSON matching the format specified in the system prompt."},
            ],
            temperature=0.3,
            max_tokens=1024,
        )
        content = resp.choices[0].message.content.strip()
        result = extract_json(content)
        if not result:
            logger.warning(f"Groq returned unparseable response: {content[:200]}")
            return None
        return {
            "response": result.get("response", ""),
            "sources": result.get("sources", ["Groq (Llama 3)"]),
            "confidence": min(1.0, max(0.0, result.get("confidence", 0.85))),
        }
    except Exception as e:
        logger.warning(f"Groq call failed: {e}")
        return None


def generate_response(message: str) -> dict:
    if GROQ_API_KEY:
        result = generate_llm_response(message)
        if result:
            return result
        logger.info("Falling back to rule-based copilot")

    lower = message.lower()
    state = get_plant_state()
    sources = []
    response = ""

    if "zone a" in lower or "zone-a" in lower:
        za = next((z for z in state["zones"] if z["zoneId"] == "ZONE_A"), None)
        response = f"**Zone A (Coke Oven Battery) Status:**\n\nRisk Score: **{za['riskScore']}** ({za['riskLevel']})\nWorkers: {za['workerCount']}\nPermits: {za['activePermits']}\n"
        sources = ["Real-time sensor data", "Compound risk analysis engine"]
    elif "ch4" in lower or "methane" in lower:
        sensors = get_current_sensors()
        ch4 = [s for s in sensors if s["type"] == "CH4"]
        response = "**Methane (CH4) Readings:**\n\n" + "\n".join(f"- {s['zoneId']}: **{s['value']}%LEL** ({s['status']})" for s in ch4)
        sources = ["OISD-105 Clause 6.3"]
    elif "permit" in lower or "conflict" in lower:
        permits = get_permits()
        flagged = [p for p in permits if p["status"] == "FLAGGED"]
        response = f"**Permit Summary:** Active: {len([p for p in permits if p['status'] == 'ACTIVE'])} | Flagged: {len(flagged)} | Suspended: {len([p for p in permits if p['status'] == 'SUSPENDED'])}\n"
        sources = ["Permit intelligence agent"]
    elif "incident" in lower or "historical" in lower or "similar" in lower:
        rel = [i for i in HISTORICAL_INCIDENTS if i["type"] in ("Gas Explosion", "Gas Leak", "Explosion", "Confined Space Asphyxiation")][:3]
        response = "**Similar Incidents:**\n\n" + "\n\n".join(f"**{i['incident_id']}** — {i['type']} at {i['plant']} ({i['date']})\nFatalities: {i['fatalities']}" for i in rel)
        sources = ["Incident RAG database"]
    elif "oisd" in lower or "regulation" in lower or "factory act" in lower:
        relevant = [r for r in REGULATIONS if lower in r["source"].lower()] or REGULATIONS[:3]
        response = "**Regulatory Guidance:**\n\n" + "\n\n".join(f"**{r['source']} §{r['section']}**: {r['title']}\n{r['content']}" for r in relevant)
        sources = ["OISD-105", "Factory Act 1948", "DGMS"]
    elif "evacuat" in lower or "emergency" in lower:
        emg = get_emergency()
        if emg: response = f"**EMERGENCY ACTIVE**\nZone: {emg['zoneId']} | Risk: {emg['riskScore']}\n" + "\n".join(f"{'✅' if s['completed'] else '🔄' if s['inProgress'] else '⏳'} T+{s['delay']}s: {s['label']}" for s in emg["steps"])
        else: response = "**No active emergency.** All zones normal."
        sources = ["Emergency orchestrator"]
    else:
        response = f"**SentinelAI Overview:**\n\nRisk Score: **{state['overallRiskScore']}/100** ({state['overallRiskLevel']})\nAlerts: {state['activeAlerts']} | Flagged Permits: {state['flaggedPermits']} | Workers at Risk: {state['workersAtRisk']}\n\n*Ask about zones, sensors, permits, incidents, or regulations.*"
        sources = ["Real-time monitoring", "Compound risk engine"]

    return {"response": response, "sources": sources, "confidence": round(0.82 + random.random() * 0.15, 2)}


@router.post("/chat")
async def copilot_chat(body: dict):
    message = body.get("message", "")
    result = generate_response(message)
    return {"data": result, "timestamp": __import__("datetime").datetime.now().isoformat()}
