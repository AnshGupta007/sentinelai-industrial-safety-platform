from typing import List, Dict
from data.simulator import get_permits, get_current_sensors

CONFLICT_RULES = [
    {"rule": "HOT_WORK + GAS_ELEVATED", "action": "IMMEDIATE_SUSPENSION"},
    {"rule": "HOT_WORK + CONFINED_SPACE (same zone)", "action": "FLAG"},
    {"rule": "ELECTRICAL_WORK + WET_CONDITIONS", "action": "FLAG"},
    {"rule": "CONFINED_SPACE + VENTILATION_OFFLINE", "action": "IMMEDIATE_SUSPENSION"},
    {"rule": ">3 permits in single zone", "action": "FLAG_FOR_REVIEW"},
    {"rule": "Permit duration > 8 hours without renewal", "action": "FLAG"},
]

def analyze_permit(permit: dict) -> dict:
    conflicts = []
    zone_sensors = {}
    for stype in ["CO", "H2S", "CH4", "O2", "TEMPERATURE", "PRESSURE"]:
        sid = f"{permit['zoneId']}_{stype}"
        for s in get_current_sensors():
            if s["sensorId"] == sid:
                zone_sensors[stype] = s["value"]
                break

    if permit["type"] == "HOT_WORK" and (zone_sensors.get("CH4", 0) > 10 or zone_sensors.get("H2S", 0) > 5 or zone_sensors.get("CO", 0) > 25):
        conflicts.append({"conflict_type": "GAS_HAZARD", "description": f"Gas elevated in zone — hot work must be suspended", "regulatory_basis": "OISD-105 Clause 6.3", "action_required": "IMMEDIATE_SUSPENSION", "urgency": "CRITICAL"})

    same_zone = [p for p in get_permits() if p["zoneId"] == permit["zoneId"] and p["permitId"] != permit["permitId"] and p["status"] not in ("SUSPENDED", "COMPLETED")]
    if permit["type"] == "HOT_WORK" and any(p["type"] == "CONFINED_SPACE" for p in same_zone):
        conflicts.append({"conflict_type": "SIMOPS_CONFLICT", "description": "Hot work and confined space in same zone", "regulatory_basis": "OISD-105 Clause 6.3", "action_required": "FLAG", "urgency": "HIGH"})

    if permit["type"] == "CONFINED_SPACE":
        temp = zone_sensors.get("TEMPERATURE", 0)
        co = zone_sensors.get("CO", 0)
        ch4 = zone_sensors.get("CH4", 0)
        if temp > 60 or co > 25 or ch4 > 10:
            conflicts.append({
                "conflict_type": "VENTILATION_FAILURE",
                "description": f"Confined space entry with possible ventilation failure — Temp:{temp}°C CO:{co}ppm CH4:{ch4}%LEL",
                "regulatory_basis": "OISD-105 Section 8.2",
                "action_required": "IMMEDIATE_SUSPENSION",
                "urgency": "CRITICAL"
            })

    if permit["type"] == "ELECTRICAL":
        humidity = zone_sensors.get("HUMIDITY", 0)
        if humidity > 75:
            conflicts.append({
                "conflict_type": "WET_CONDITIONS",
                "description": f"Humidity {humidity}% — electrical work risk elevated",
                "regulatory_basis": "IE Rules 44A",
                "action_required": "FLAG",
                "urgency": "HIGH"
            })

    from datetime import datetime, timezone
    if permit.get("startTime"):
        try:
            start = datetime.fromisoformat(permit["startTime"])
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            duration_hours = (now - start).total_seconds() / 3600
            if duration_hours > 8:
                conflicts.append({
                    "conflict_type": "PERMIT_EXPIRY",
                    "description": f"Permit active for {duration_hours:.1f}h — renewal required",
                    "regulatory_basis": "Factory Act Section 36",
                    "action_required": "FLAG",
                    "urgency": "MEDIUM"
                })
        except ValueError:
            pass

    if len(same_zone) >= 2:
        conflicts.append({"conflict_type": "SIMOPS_CONFLICT", "description": f"{len(same_zone) + 1} permits active in zone", "regulatory_basis": "Factory Act Section 36", "action_required": "FLAG_FOR_REVIEW", "urgency": "MEDIUM"})

    status = "SUSPENDED" if any(c["action_required"] == "IMMEDIATE_SUSPENSION" for c in conflicts) else "FLAGGED" if any(c["urgency"] == "HIGH" for c in conflicts) else "FLAGGED" if conflicts else "ACTIVE"
    notified = ["Zone Supervisor", "Safety Officer", "Permit Issuer"] if conflicts else []

    return {"permit_id": permit["permitId"], "status": status, "conflicts": conflicts, "recommendation": f"Suspend permit {permit['permitId']}" if status == "FLAGGED" else "No action needed", "notified_parties": notified}

def analyze_all_permits() -> List[dict]:
    return [analyze_permit(p) for p in get_permits()]
