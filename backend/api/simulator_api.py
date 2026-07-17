from fastapi import APIRouter
from datetime import datetime
from data.simulator import calculate_risk, state as sim_state, ZONE_CONFIG, SENSOR_CONFIG

router = APIRouter()

@router.post("/what-if")
async def what_if_simulation(body: dict):
    zone_id = body.get("zoneId", "ZONE_A")
    overrides = body.get("overrides", {})
    scenario_flags = body.get("scenarioFlags", {})

    scored_rules = []
    score_contributions = 0

    if scenario_flags.get("ventilationOffline"):
        scored_rules.append({
            "ruleId": "RULE_6", "description": "Ventilation offline + confined space",
            "contribution": 35, "severity": "CRITICAL", "scenario": True,
        })
        score_contributions += 35

    if scenario_flags.get("hotWorkPermitActive"):
        scored_rules.append({
            "ruleId": "RULE_2", "description": "Hot work + flammable gas risk",
            "contribution": 25, "severity": "CRITICAL", "scenario": True,
        })
        score_contributions += 25

    if scenario_flags.get("shiftChangeover"):
        scored_rules.append({
            "ruleId": "RULE_4", "description": "Shift changeover imminent",
            "contribution": 15, "severity": "MEDIUM", "scenario": True,
        })
        score_contributions += 15

    if scenario_flags.get("gasLeakZoneA"):
        scored_rules.append({
            "ruleId": "RULE_1", "description": "Confined space + elevated gas leak",
            "contribution": 30, "severity": "CRITICAL", "scenario": True,
        })
        score_contributions += 30

    if scenario_flags.get("maintenanceInZoneB"):
        scored_rules.append({
            "ruleId": "RULE_3", "description": "Maintenance + pressure anomaly",
            "contribution": 20, "severity": "HIGH", "scenario": True,
        })
        score_contributions += 20

    elevated_permits = sum(1 for k in ["hotWorkPermitActive", "maintenanceInZoneB"] if scenario_flags.get(k))
    if elevated_permits >= 2:
        scored_rules.append({
            "ruleId": "RULE_5", "description": f"{elevated_permits + 1} simultaneous permits in zone",
            "contribution": 15, "severity": "MEDIUM", "scenario": True,
        })
        score_contributions += 15

    gas_overrides = {}
    for g in ["CH4", "CO", "H2S", "O2"]:
        val = overrides.get(g)
        if val is not None:
            gas_overrides[g] = val

    current_sensors = {}
    for stype in ["CH4", "CO", "H2S", "O2", "TEMPERATURE", "PRESSURE"]:
        sid = f"{zone_id}_{stype}"
        current = sim_state.sensors.get(sid, {})
        if stype in gas_overrides:
            current_sensors[stype] = gas_overrides[stype]
        else:
            current_sensors[stype] = current.get("value", 0)

    sensor_risk = 0
    for stype in ["CH4", "CO", "H2S", "O2", "TEMPERATURE", "PRESSURE"]:
        val = current_sensors.get(stype, 0)
        config = SENSOR_CONFIG.get(stype, {})
        nmax = config.get("normalMax", 999)
        wmax = config.get("warningMax", 999)
        w = config.get("weight", 1.0)
        if stype == "O2":
            if val < 16 or val > 25:
                rc = 40 * w / 1.5
            elif val < 19.5 or val > 23.5:
                rc = 20 * w / 1.5
            else:
                rc = 2
        elif val > wmax:
            rc = 40 * w / 1.5
        elif val > nmax:
            rc = 20 * w / 1.5
        else:
            rc = 2
        sensor_risk += rc
    sensor_risk = min(40, sensor_risk / 6)

    compound = min(40, score_contributions)
    raw = sensor_risk + compound
    final = min(100, round(raw))

    level = "SAFE"
    if final > 75: level = "CRITICAL"
    elif final > 50: level = "HIGH"
    elif final > 25: level = "CAUTION"

    return {
        "data": {
            "zoneId": zone_id,
            "riskScore": final,
            "riskLevel": level,
            "triggeredRules": scored_rules,
            "appliedOverrides": gas_overrides,
            "scenarioFlags": scenario_flags,
            "sensorReadings": current_sensors,
            "timestamp": datetime.now().isoformat(),
        },
        "timestamp": datetime.now().isoformat(),
    }
