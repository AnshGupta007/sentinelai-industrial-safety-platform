from typing import Dict, List
from data.simulator import get_emergency, get_workers, get_permits, get_risk_assessments, get_current_sensors, ZONE_CONFIG
from notifications.simulator import dispatch_emergency_notifications

TRIGGER_THRESHOLD = 75

def check_trigger_condition() -> bool:
    return get_emergency() is not None

def get_zone_assessment(zone_id: str) -> dict:
    ra = get_risk_assessments()
    if isinstance(ra, dict):
        return ra.get(zone_id)
    return next((a for a in ra if a["zoneId"] == zone_id), None)

def generate_incident_report(zone_id: str) -> str:
    zone = next((z for z in ZONE_CONFIG if z["zoneId"] == zone_id), None)
    workers = [w for w in get_workers() if w["zoneId"] == zone_id]
    permits = [p for p in get_permits() if p["zoneId"] == zone_id]
    assessment = get_zone_assessment(zone_id)

    report = f"""---
PRELIMINARY INCIDENT REPORT
Plant: Vizag Steel Plant
Date/Time: {__import__('datetime').datetime.now().isoformat()}
Zone: {zone['name'] if zone else zone_id}
Incident Type: Compound Risk Detection
Risk Score at Trigger: {assessment['riskScore'] if assessment else 'N/A'}

TIMELINE OF EVENTS:
T+0s: CH4 levels began rising
T+30s: Confined space permit activated
T+60s: Ventilation system offline
T+90s: SentinelAI CRITICAL ALERT

CONTRIBUTING FACTORS:
- Ventilation offline + confined space (Rule 6)
- Elevated gas levels detected

WORKERS POTENTIALLY AFFECTED: {len(workers)}
{chr(10).join(f'- {w["name"]} ({w["role"]})' for w in workers[:10])}

PERMITS ACTIVE AT TIME OF INCIDENT:
{chr(10).join(f'- {p["permitId"]} ({p["type"]})' for p in permits[:5])}

IMMEDIATE ACTIONS TAKEN:
1. Alert generated automatically
2. Notifications dispatched to safety team
3. Permits in affected zone suspended
4. Sensor snapshot preserved
5. Evacuation protocol initiated

REGULATORY NOTIFICATIONS REQUIRED:
- OISD-105 Section 4.2
- Factory Act Section 36

RECOMMENDATIONS:
- Automated gas monitoring linked to permit system
- Continuous ventilation monitoring
---"""
    return report

def orchestrate_response(zone_id: str, step_start_time: float = None) -> Dict:
    from datetime import datetime, timezone
    now_ts = datetime.now(timezone.utc).timestamp()
    step_start = step_start_time if step_start_time is not None else now_ts

    elapsed = now_ts - step_start
    steps_config = [
        {"step": 1, "label": "Alert Generation", "delay": 0},
        {"step": 2, "label": "Notifications Dispatched", "delay": 5},
        {"step": 3, "label": "Permits Suspended", "delay": 10},
        {"step": 4, "label": "Sensor Snapshot Preserved", "delay": 15},
        {"step": 5, "label": "Evacuation Protocol", "delay": 30},
        {"step": 6, "label": "Incident Report", "delay": 60},
    ]

    response_sequence = []
    for s in steps_config:
        step_elapsed = elapsed - s["delay"]
        if step_elapsed >= 0:
            if step_elapsed >= 2:
                completed_item = {
                    "step": s["step"], "action": s["label"],
                    "completed": True, "inProgress": False
                }
                if s["step"] == 2 and not response_sequence:
                    zone = next((z for z in ZONE_CONFIG if z["zoneId"] == zone_id), None)
                    assessment = get_zone_assessment(zone_id)
                    dispatch_emergency_notifications(
                        zone["name"] if zone else zone_id,
                        assessment["riskScore"] if assessment else 80,
                        "Immediate evacuation required"
                    )
                response_sequence.append(completed_item)
            else:
                response_sequence.append({
                    "step": s["step"], "action": s["label"],
                    "completed": False, "inProgress": True
                })
        else:
            response_sequence.append({
                "step": s["step"], "action": s["label"],
                "completed": False, "inProgress": False
            })

    return {
        "status": "ACTIVE",
        "zone_id": zone_id,
        "trigger_time_iso": datetime.fromtimestamp(step_start).isoformat(),
        "elapsed_seconds": round(elapsed, 1),
        "response_sequence": response_sequence,
        "incident_report": generate_incident_report(zone_id),
        "workers_in_danger": len([w for w in get_workers() if w.get("inDangerZone")]),
    }
