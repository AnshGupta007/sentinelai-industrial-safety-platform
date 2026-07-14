import asyncio
import math
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from utils.logger import setup_logger

logger = setup_logger("simulator")

ZONE_CONFIG = [
    {"zoneId": "ZONE_A", "name": "Coke Oven Battery", "riskLevel": "HIGH", "x": 5, "y": 5, "width": 44, "height": 44},
    {"zoneId": "ZONE_B", "name": "Blast Furnace Area", "riskLevel": "HIGH", "x": 51, "y": 5, "width": 44, "height": 44},
    {"zoneId": "ZONE_C", "name": "Gas Processing Unit", "riskLevel": "MEDIUM", "x": 28, "y": 28, "width": 44, "height": 28},
    {"zoneId": "ZONE_D", "name": "Control Room", "riskLevel": "LOW", "x": 28, "y": 60, "width": 44, "height": 20},
    {"zoneId": "ZONE_E", "name": "Maintenance Workshop", "riskLevel": "MEDIUM", "x": 5, "y": 55, "width": 20, "height": 25},
    {"zoneId": "ZONE_F", "name": "Raw Material Storage", "riskLevel": "LOW", "x": 75, "y": 55, "width": 20, "height": 25},
]

SENSOR_TYPES = ["CO", "H2S", "CH4", "O2", "TEMPERATURE", "PRESSURE", "HUMIDITY", "VIBRATION"]

SENSOR_CONFIG = {
    "CO": {"unit": "ppm", "normalMax": 25, "warningMax": 50, "weight": 1.5},
    "H2S": {"unit": "ppm", "normalMax": 5, "warningMax": 10, "weight": 1.5},
    "CH4": {"unit": "%LEL", "normalMax": 10, "warningMax": 25, "weight": 1.5},
    "O2": {"unit": "%", "normalMax": 23.5, "warningMin": 19.5, "weight": 1.5},
    "TEMPERATURE": {"unit": "°C", "normalMax": 60, "warningMax": 80, "weight": 1.0},
    "PRESSURE": {"unit": "bar", "normalMax": 1.2, "warningMax": 1.5, "weight": 1.2},
    "HUMIDITY": {"unit": "%", "normalMax": 70, "warningMax": 85, "weight": 0.8},
    "VIBRATION": {"unit": "mm/s", "normalMax": 4, "warningMax": 7, "weight": 1.0},
}

WORKER_NAMES = [
    "Rajan M.", "Suresh K.", "Amit P.", "Vikram S.", "Deepak R.",
    "Prakash N.", "Ramesh T.", "Sanjay G.", "Mohan D.", "Arjun B.",
    "Kiran V.", "Ravi J.", "Sunil H.", "Manoj L.", "Anil F.",
    "Vijay W.", "Ganesh Q.", "Harish E.", "Naveen I.", "Prasad O.",
    "Dinesh U.", "Rajesh Y.", "Mahesh A.", "Chandra C.", "Venkat Z.",
    "Lakshman X.", "Balaji K.", "Narasimha R.", "Karthik P.", "Shankar M.",
    "Gopal S.", "Murali N.", "Srinivas T.", "Raghav D.", "Siddharth V.",
    "Ashok B.", "Paramesh H.", "Janardhan L.", "Venkatesh G.", "Subhash F.",
    "Ranganath E.", "Satish I.", "Jagdish O.", "Devendra U.", "Bhaskar Y.",
    "Keshav A.", "Madhav C.", "Purushottam Z.", "Ramakrishna X.", "Giridhar W.",
]

ROLES = ["Operator", "Technician", "Supervisor", "Welder", "Electrician", "Rigger", "Fitter", "Helper"]

WORKER_PER_ZONE = {"ZONE_A": 12, "ZONE_B": 10, "ZONE_C": 8, "ZONE_D": 5, "ZONE_E": 8, "ZONE_F": 7}

class SimulatorState:
    def __init__(self):
        self.sensors: Dict[str, dict] = {}
        self.sensor_history: Dict[str, list] = {}
        self.permits: List[dict] = []
        self.alerts: List[dict] = []
        self.workers: List[dict] = []
        self.risk_assessments: Dict[str, dict] = {}
        self.risk_history: Dict[str, list] = {}
        self.emergency: Optional[dict] = None
        self.demo_start: float = 0
        self.demo_phase: int = 0
        self.alert_counter: int = 1000
        self.elevation_start_time: Dict[str, float] = {}
        self.initialized: bool = False
        self.tick_count: int = 0

state = SimulatorState()

def now():
    return datetime.now().isoformat()

def generate_sensor_value(zone_id: str, stype: str, phase: int) -> float:
    config = SENSOR_CONFIG[stype]
    base_normal = config["normalMax"] * 0.5 if stype != "O2" else 20.9
    noise = (random.random() - 0.5) * base_normal * 0.3
    escalation = 1.0
    if zone_id == "ZONE_A":
        if phase >= 1: escalation = 1.2
        if phase >= 2: escalation = 1.8
        if phase >= 3: escalation = 2.5
        if phase >= 4: escalation = 3.0
    if zone_id == "ZONE_B" and phase >= 2: escalation = 1.3
    spike = 1 if random.random() < 0.05 else 0

    vals = {
        "CO": max(0, base_normal * escalation + noise + (spike * 15)),
        "H2S": max(0, 1.5 * escalation + noise * 0.5 + (spike * 5)),
        "CH4": max(0, (5 if zone_id == "ZONE_A" and phase >= 1 else 3) * escalation + noise + (spike * 8)),
        "O2": 20.9 - (1.5 * escalation if zone_id == "ZONE_A" and phase >= 2 else 0) + noise * 0.2,
        "TEMPERATURE": 40 * escalation + noise * 5 + (spike * 30),
        "PRESSURE": 1.0 + (0.2 * escalation if zone_id == "ZONE_A" and phase >= 2 else 0) + noise * 0.1 + (spike * 0.5),
        "HUMIDITY": 50 + noise * 10,
        "VIBRATION": 2 * escalation + noise + (spike * 5),
    }
    return round(vals.get(stype, base_normal + noise), 2)

def get_sensor_status(stype: str, value: float) -> str:
    c = SENSOR_CONFIG.get(stype, {})
    if stype == "O2":
        if value < 16 or value > 25: return "CRITICAL"
        if value < 19.5 or value > 23.5: return "WARNING"
        return "NORMAL"
    if value > c.get("warningMax", 999): return "CRITICAL"
    if value > c.get("normalMax", 999): return "WARNING"
    return "NORMAL"

def get_risk_level(score: int) -> str:
    if score <= 25: return "SAFE"
    if score <= 50: return "CAUTION"
    if score <= 75: return "HIGH"
    return "CRITICAL"

def is_zone_high_risk(zone_id: str) -> bool:
    a = state.risk_assessments.get(zone_id)
    return a["riskScore"] > 50 if a else False

def init_permit(pid: str, ptype: str, zone: str, author: str, workers: list):
    return {
        "permitId": pid, "type": ptype, "zoneId": zone, "authorizedBy": author,
        "workersInvolved": workers, "status": "ACTIVE", "conflicts": [],
        "startTime": now(), "endTime": (datetime.now() + timedelta(hours=4)).isoformat()
    }

def initialize():
    state.demo_start = datetime.now().timestamp()
    state.demo_phase = 0
    state.sensors.clear()
    state.sensor_history.clear()
    state.alerts.clear()
    state.alert_counter = 1000
    state.emergency = None

    for zone in ZONE_CONFIG:
        for stype in SENSOR_TYPES:
            sid = f"{zone['zoneId']}_{stype}"
            val = generate_sensor_value(zone['zoneId'], stype, 0)
            reading = {"sensorId": sid, "zoneId": zone["zoneId"], "type": stype,
                       "value": val, "unit": SENSOR_CONFIG[stype]["unit"],
                       "status": get_sensor_status(stype, val), "timestamp": now()}
            state.sensors[sid] = reading
            state.sensor_history[sid] = [{"timestamp": now(), "value": val}]

    permits_data = [
        ("PTW-2024-0847", "CONFINED_SPACE", "ZONE_A", "Supervisor Rajan", ["W001","W002","W003"]),
        ("PTW-2024-0848", "HOT_WORK", "ZONE_B", "Supervisor Suresh", ["W010","W011"]),
        ("PTW-2024-0849", "ELECTRICAL", "ZONE_E", "Supervisor Amit", ["W020","W021"]),
        ("PTW-2024-0850", "HEIGHT", "ZONE_B", "Supervisor Vikram", ["W012","W013","W014"]),
        ("PTW-2024-0851", "CONFINED_SPACE", "ZONE_C", "Supervisor Deepak", ["W025","W026"]),
        ("PTW-2024-0852", "HOT_WORK", "ZONE_A", "Supervisor Prakash", ["W004","W005"]),
        ("PTW-2024-0853", "EXCAVATION", "ZONE_F", "Supervisor Ramesh", ["W040","W041"]),
        ("PTW-2024-0854", "ELECTRICAL", "ZONE_D", "Supervisor Sanjay", ["W030"]),
        ("PTW-2024-0855", "HEIGHT", "ZONE_C", "Supervisor Mohan", ["W027"]),
        ("PTW-2024-0856", "HOT_WORK", "ZONE_E", "Supervisor Arjun", ["W022","W023"]),
        ("PTW-2024-0857", "CONFINED_SPACE", "ZONE_A", "Supervisor Kiran", ["W006"]),
        ("PTW-2024-0858", "ELECTRICAL", "ZONE_B", "Supervisor Ravi", ["W015"]),
        ("PTW-2024-0859", "EXCAVATION", "ZONE_A", "Supervisor Sunil", ["W007","W008"]),
        ("PTW-2024-0860", "HEIGHT", "ZONE_E", "Supervisor Manoj", ["W024"]),
        ("PTW-2024-0861", "HOT_WORK", "ZONE_C", "Supervisor Anil", ["W028","W029"]),
    ]
    state.permits = [init_permit(*p) for p in permits_data]

    state.workers = []
    w_idx = 0
    for zone in ZONE_CONFIG:
        count = WORKER_PER_ZONE.get(zone["zoneId"], 5)
        for i in range(count):
            if w_idx >= 50: break
            state.workers.append({
                "workerId": f"W{str(w_idx+1).zfill(3)}",
                "name": WORKER_NAMES[w_idx], "zoneId": zone["zoneId"],
                "shift": "B", "role": ROLES[w_idx % len(ROLES)],
                "locationX": zone["x"] + random.random() * zone["width"],
                "locationY": zone["y"] + random.random() * zone["height"],
                "inDangerZone": False
            })
            w_idx += 1

    state.risk_history = {}
    for zone in ZONE_CONFIG:
        sid = zone["zoneId"]
        base = 18 if sid == "ZONE_A" else 15 if sid == "ZONE_B" else 10
        state.risk_assessments[sid] = {
            "zoneId": sid, "riskScore": base, "riskLevel": "SAFE", "triggeredRules": [],
            "individualSensors": [], "recommendedActions": [],
            "predictionHorizon": "> 2 hours", "confidence": 0.95, "timestamp": now()
        }
        hist = []
        past = (datetime.now().timestamp() - state.demo_start) * 1000
        for i in range(60):
            t = datetime.fromtimestamp(state.demo_start - (59 - i) * 120).isoformat()
            progress = i / 59.0
            noise = (random.random() - 0.5) * 8
            score = max(5, min(100, int(base + progress * (base * 2.0) + noise)))
            level = get_risk_level(score)
            hist.append({
                "zoneId": sid, "riskScore": score, "riskLevel": level,
                "timestamp": t
            })
        state.risk_history[sid] = hist

    state.initialized = True
    logger.info("Simulator initialized with demo scenario")

def compute_historical_similarity(zone_id: str, zone_sensors: dict, zone_permits: list) -> int:
    zone_config = next((z for z in ZONE_CONFIG if z["zoneId"] == zone_id), {})
    zone_name = zone_config.get("name", "")
    matching = []
    for inc in HISTORICAL_INCIDENTS:
        score = 0
        if inc["zone"].lower() in zone_name.lower() or zone_name.lower() in inc["zone"].lower():
            score += 5
        if zone_sensors.get("CO", 0) > 25 and any("CO" in rc or "gas" in rc.lower() for rc in inc["root_causes"]):
            score += 3
        if zone_sensors.get("CH4", 0) > 10 and any("CH4" in rc or "flammable" in rc.lower() for rc in inc["root_causes"]):
            score += 3
        if any(p["type"] == "CONFINED_SPACE" for p in zone_permits) and any("confined" in rc.lower() for rc in inc["root_causes"]):
            score += 3
        if any(p["type"] == "HOT_WORK" for p in zone_permits) and any("hot work" in rc.lower() for rc in inc["root_causes"]):
            score += 3
        if any(p["type"] == "ELECTRICAL" for p in zone_permits) and any("electrical" in rc.lower() for rc in inc["root_causes"]):
            score += 3
        if score > 0:
            matching.append(score)
    if not matching:
        return 0
    return min(20, max(matching))

def calculate_risk(zone_id: str) -> dict:
    triggered_rules = []
    total_sensor_risk = 0
    individual = []

    for stype in SENSOR_TYPES:
        sid = f"{zone_id}_{stype}"
        reading = state.sensors.get(sid)
        if not reading: continue
        config = SENSOR_CONFIG.get(stype, {})
        w = config.get("weight", 1.0)
        if reading["status"] == "CRITICAL": rc = 40 * w / 1.5
        elif reading["status"] == "WARNING": rc = 20 * w / 1.5
        else: rc = 2
        total_sensor_risk += rc
        individual.append({"sensorId": sid, "type": stype, "value": reading["value"], "riskContribution": round(rc, 1)})

    total_sensor_risk = min(40, total_sensor_risk / len(SENSOR_TYPES))

    zone_sensors = {}
    for stype in SENSOR_TYPES:
        sid = f"{zone_id}_{stype}"
        r = state.sensors.get(sid)
        zone_sensors[stype] = r["value"] if r else 0

    zone_permits = [p for p in state.permits if p["zoneId"] == zone_id and p["status"] not in ("SUSPENDED", "COMPLETED")]
    has_confined = any(p["type"] == "CONFINED_SPACE" for p in zone_permits)
    has_hot = any(p["type"] == "HOT_WORK" for p in zone_permits)
    has_maint = any(p["type"] in ("ELECTRICAL", "HEIGHT", "EXCAVATION") for p in zone_permits)
    elev_gas = zone_sensors.get("CO", 0) > 25 or zone_sensors.get("H2S", 0) > 5 or zone_sensors.get("CH4", 0) > 10
    press_anom = zone_sensors.get("PRESSURE", 0) > 1.2
    vent_offline = zone_id == "ZONE_A" and state.demo_phase >= 2

    if has_confined and elev_gas:
        triggered_rules.append({"ruleId": "RULE_1", "description": "Confined space + elevated gas", "contribution": 25, "evidence": {"permitType": "CONFINED_SPACE", "CH4": zone_sensors.get("CH4", 0)}})
    if has_hot and (zone_sensors.get("CH4", 0) > 10 or zone_sensors.get("H2S", 0) > 5):
        triggered_rules.append({"ruleId": "RULE_2", "description": "Hot work + flammable gas", "contribution": 30, "evidence": {"CH4": zone_sensors.get("CH4", 0), "H2S": zone_sensors.get("H2S", 0)}})
    if has_maint and press_anom:
        triggered_rules.append({"ruleId": "RULE_3", "description": "Maintenance + pressure anomaly", "contribution": 20, "evidence": {"pressure": zone_sensors.get("PRESSURE", 0)}})
    triggered_rules.append({"ruleId": "RULE_4", "description": "Shift changeover imminent", "contribution": 15, "evidence": {"nextShift": "14:00"}})
    if len(zone_permits) > 2:
        triggered_rules.append({"ruleId": "RULE_5", "description": f"{len(zone_permits)} permits in same zone", "contribution": 15, "evidence": {"count": len(zone_permits)}})
    if vent_offline and has_confined:
        triggered_rules.append({"ruleId": "RULE_6", "description": "Ventilation offline + confined space", "contribution": 35, "evidence": {"ventilationStatus": "OFFLINE"}})
    if state.demo_phase >= 2:
        triggered_rules.append({"ruleId": "RULE_7", "description": "Night shift equipment overdue maintenance", "contribution": 20, "evidence": {"shift": "NIGHT"}})

    compound = min(40, sum(r["contribution"] for r in triggered_rules))
    historical = compute_historical_similarity(zone_id, zone_sensors, zone_permits)
    raw = total_sensor_risk + compound + historical
    elevation_duration = datetime.now().timestamp() - state.elevation_start_time.get(zone_id, datetime.now().timestamp())
    time_esc = 1.5 if elevation_duration > 1800 else 1.2 if elevation_duration > 900 else 1.0
    final = min(100, round(raw * time_esc))
    level = get_risk_level(final)

    actions = []
    if level == "CRITICAL":
        actions = ["Initiate evacuation immediately", "Suspend all permits in zone", "Dispatch safety team", "Notify Plant Manager"]
    elif level == "HIGH":
        actions = ["Increase monitoring", "Review permits for conflicts", "Prepare evacuation", "Alert zone supervisor"]
    elif level == "CAUTION":
        actions = ["Monitor trends", "Verify permit conditions"]

    return {
        "zoneId": zone_id, "riskScore": final, "riskLevel": level,
        "triggeredRules": triggered_rules, "individualSensors": individual,
        "recommendedActions": actions,
        "predictionHorizon": f"{max(15, 90 - final)} min to critical" if final > 60 else "> 2 hours",
        "confidence": round(0.75 + random.random() * 0.2, 2), "timestamp": now()
    }

def detect_permit_conflicts(permit: dict) -> list:
    conflicts = []
    zs = {}
    for stype in ["CO", "H2S", "CH4", "O2", "TEMPERATURE", "PRESSURE"]:
        sid = f"{permit['zoneId']}_{stype}"
        r = state.sensors.get(sid)
        zs[stype] = r["value"] if r else 0

    if permit["type"] == "HOT_WORK" and (zs.get("CH4", 0) > 10 or zs.get("H2S", 0) > 5 or zs.get("CO", 0) > 25):
        conflicts.append({"conflictType": "GAS_HAZARD", "description": f"Flammable gas detected — hot work must be suspended", "regulatoryBasis": "OISD-105 Clause 6.3", "actionRequired": "IMMEDIATE_SUSPENSION", "urgency": "CRITICAL"})
    if permit["type"] == "CONFINED_SPACE" and permit["zoneId"] == "ZONE_A" and state.demo_phase >= 2:
        conflicts.append({"conflictType": "VENTILATION_FAILURE", "description": "Ventilation offline with confined space entry", "regulatoryBasis": "OISD-105 Clause 8.2", "actionRequired": "IMMEDIATE_SUSPENSION", "urgency": "CRITICAL"})
    same = [p for p in state.permits if p["zoneId"] == permit["zoneId"] and p["permitId"] != permit["permitId"] and p["status"] not in ("SUSPENDED", "COMPLETED")]
    if len(same) >= 2:
        conflicts.append({"conflictType": "SIMOPS_CONFLICT", "description": f"{len(same)+1} permits in zone — review for SIMOPS", "regulatoryBasis": "Factory Act Section 36", "actionRequired": "REVIEW_REQUIRED", "urgency": "MEDIUM"})
    return conflicts

def update():
    elapsed = datetime.now().timestamp() - state.demo_start
    if elapsed >= 120: state.demo_phase = 4
    elif elapsed >= 90: state.demo_phase = 3
    elif elapsed >= 60: state.demo_phase = 2
    elif elapsed >= 30: state.demo_phase = 1
    else: state.demo_phase = 0

    for zone in ZONE_CONFIG:
        for stype in SENSOR_TYPES:
            sid = f"{zone['zoneId']}_{stype}"
            existing = state.sensors.get(sid)
            if not existing: continue
            val = generate_sensor_value(zone["zoneId"], stype, state.demo_phase)
            status = get_sensor_status(stype, val)
            state.sensors[sid] = {**existing, "value": val, "status": status, "timestamp": now()}
            hist = state.sensor_history.get(sid, [])
            hist.append({"timestamp": now(), "value": val})
            if len(hist) > 900: hist.pop(0)
            state.sensor_history[sid] = hist

    for zone in ZONE_CONFIG:
        zone_sensors_non_normal = any(
            state.sensors.get(f"{zone['zoneId']}_{stype}", {}).get("status", "NORMAL") != "NORMAL"
            for stype in SENSOR_TYPES
        )
        if zone_sensors_non_normal:
            if zone["zoneId"] not in state.elevation_start_time:
                state.elevation_start_time[zone["zoneId"]] = datetime.now().timestamp()
        else:
            state.elevation_start_time.pop(zone["zoneId"], None)

    state.tick_count += 1
    if state.tick_count % 5 == 0:
        for w in state.workers:
            w["locationX"] += (random.random() - 0.5) * 2
            w["locationY"] += (random.random() - 0.5) * 2
            w["inDangerZone"] = is_zone_high_risk(w["zoneId"])

    for zone in ZONE_CONFIG:
        assessment = calculate_risk(zone["zoneId"])
        state.risk_assessments[zone["zoneId"]] = assessment
        zid = zone["zoneId"]
        hist = state.risk_history.get(zid, [])
        hist.append({
            "zoneId": zid, "riskScore": assessment["riskScore"],
            "riskLevel": assessment["riskLevel"],
            "timestamp": assessment["timestamp"],
            "triggeredRules": assessment.get("triggeredRules", [])
        })
        if len(hist) > 720: hist = hist[-720:]
        state.risk_history[zid] = hist
        if assessment["riskLevel"] in ("CRITICAL", "HIGH"):
            existing = next((a for a in state.alerts if a["zoneId"] == zone["zoneId"] and not a["resolved"] and a["severity"] == assessment["riskLevel"]), None)
            if not existing:
                state.alert_counter += 1
                state.alerts.insert(0, {
                    "alertId": f"ALT-2024-{state.alert_counter}", "zoneId": zone["zoneId"],
                    "severity": assessment["riskLevel"],
                    "title": f"{'Compound Risk' if assessment['riskLevel'] == 'CRITICAL' else 'Elevated Risk'} in {zone['name']}",
                    "description": "; ".join(r["description"] for r in assessment["triggeredRules"]) or "Multiple sensor elevations",
                    "riskScore": assessment["riskScore"], "acknowledged": False, "resolved": False,
                    "triggeredRules": assessment["triggeredRules"], "timestamp": now()
                })

    for p in state.permits:
        conflicts = detect_permit_conflicts(p)
        status = "FLAGGED" if any(c["urgency"] == "CRITICAL" for c in conflicts) or len(conflicts) > 0 else ("SUSPENDED" if p["status"] == "SUSPENDED" else "ACTIVE")
        p["conflicts"] = conflicts
        p["status"] = status

    crit = [z for z in ZONE_CONFIG if state.risk_assessments.get(z["zoneId"], {}).get("riskScore", 0) > 75]
    if crit and not state.emergency:
        z = crit[0]
        a = state.risk_assessments[z["zoneId"]]
        state.emergency = {"status": "ACTIVE", "zoneId": z["zoneId"], "riskScore": a["riskScore"], "triggeredAt": now(), "steps": [
            {"step": 1, "label": "Alert Generated", "delay": 0, "completed": True, "inProgress": False, "details": f"Emergency for {z['name']}. Risk: {a['riskScore']}"},
            {"step": 2, "label": "Notifications Dispatched", "delay": 5, "completed": True, "inProgress": False, "details": "Notified Safety Officer, Shift Supervisor, Plant Manager"},
            {"step": 3, "label": "Permits Suspended", "delay": 10, "completed": True, "inProgress": False, "details": f"Permits in {z['zoneId']} suspended"},
            {"step": 4, "label": "Sensor Snapshot", "delay": 15, "completed": True, "inProgress": False, "details": "Sensor state preserved"},
            {"step": 5, "label": "Evacuation Protocol", "delay": 30, "completed": False, "inProgress": True, "details": f"Evacuating {sum(1 for w in state.workers if w['zoneId'] == z['zoneId'])} workers"},
            {"step": 6, "label": "Incident Report", "delay": 60, "completed": False, "inProgress": False, "details": "Generating report"},
        ]}
    if not crit and state.emergency:
        state.emergency = None

    if len(state.alerts) > 50: state.alerts = state.alerts[:50]

async def simulate_loop(websocket_manager=None):
    from websocket.manager import broadcast_sensor_update, broadcast_risk_update, broadcast_alert, broadcast_permit_flagged, broadcast_emergency
    initialize()
    persist_to_db()
    while True:
        update()
        if state.initialized:
            persist_to_db()
            publish_to_redis()
        if websocket_manager and state.initialized:
            for zone in ZONE_CONFIG:
                for stype in SENSOR_TYPES:
                    sid = f"{zone['zoneId']}_{stype}"
                    s = state.sensors.get(sid)
                    if s: await broadcast_sensor_update(websocket_manager, zone["zoneId"], sid, s["value"], s["timestamp"])
                ra = state.risk_assessments.get(zone["zoneId"])
                if ra: await broadcast_risk_update(websocket_manager, zone["zoneId"], ra["riskScore"], ra["riskLevel"])
            if state.alerts:
                await broadcast_alert(websocket_manager, state.alerts[0])
            flagged = [p for p in state.permits if p["status"] == "FLAGGED"]
            if flagged: await broadcast_permit_flagged(websocket_manager, flagged[0])
            if state.emergency: await broadcast_emergency(websocket_manager, state.emergency)
        await asyncio.sleep(2)

def get_current_sensors(): return list(state.sensors.values())
def get_zone_sensors(zone_id: str): return [s for s in state.sensors.values() if s["zoneId"] == zone_id]
def get_sensor_history(sensor_id: str): return state.sensor_history.get(sensor_id, [])
def get_zone_history(zone_id: str):
    result = {}
    for stype in ["CO", "H2S", "CH4", "O2", "TEMPERATURE", "PRESSURE"]:
        hist = state.sensor_history.get(f"{zone_id}_{stype}")
        if hist: result[stype] = hist
    return result
def get_permits(): return state.permits
def get_alerts(): return state.alerts
def get_workers(): return state.workers
def get_risk_assessments(): return list(state.risk_assessments.values())
def get_zone_risk(zone_id: str): return state.risk_assessments.get(zone_id)
def get_risk_history(zone_id: str = None, limit: int = 120):
    if zone_id:
        hist = state.risk_history.get(zone_id, [])
        return hist[-limit:]
    all_hist = []
    for zid, h in state.risk_history.items():
        all_hist.extend(h[-limit // len(ZONE_CONFIG):])
    return sorted(all_hist, key=lambda x: x["timestamp"])[-limit:]
def get_emergency(): return state.emergency
def get_demo_phase(): return state.demo_phase
def get_demo_elapsed_time(): return int(datetime.now().timestamp() - state.demo_start)
def acknowledge_alert(aid: str):
    for a in state.alerts:
        if a["alertId"] == aid: a["acknowledged"] = True; return True
    return False
def resolve_alert(aid: str):
    for a in state.alerts:
        if a["alertId"] == aid: a["resolved"] = True; a["acknowledged"] = True; return True
    return False
def suspend_permit(pid: str):
    for p in state.permits:
        if p["permitId"] == pid: p["status"] = "SUSPENDED"; return True
    return False
def suspend_zone_permits(zone_id: str):
    count = 0
    for p in state.permits:
        if p["zoneId"] == zone_id and p["status"] not in ("SUSPENDED", "COMPLETED"):
            p["status"] = "SUSPENDED"
            count += 1
    return count > 0
def trigger_evacuation(zone_id: str):
    from datetime import datetime, timedelta
    elapsed = datetime.now().timestamp() - state.demo_start
    for w in state.workers:
        if w["zoneId"] == zone_id:
            w["inDangerZone"] = True
    state.emergency = {"zoneId": zone_id, "status": "EVACUATE", "triggeredAt": (datetime.now() + timedelta(seconds=elapsed)).isoformat(), "message": f"Evacuation triggered for zone {zone_id}"}
    return True
def reset_simulator(): initialize()

_redis_published = set()

def publish_to_redis():
    try:
        from redis.client import redis_client, CHANNEL_ALERTS, CHANNEL_RISK, CHANNEL_SENSORS, CHANNEL_PERMITS, CHANNEL_EMERGENCY
        for sid, s in state.sensors.items():
            if sid not in _redis_published or state.demo_phase > 0:
                redis_client.publish(CHANNEL_SENSORS, {"zone_id": s["zoneId"], "sensor_id": s["sensorId"], "type": s["type"], "value": s["value"], "status": s["status"]})
                _redis_published.add(sid)
        for zone in ZONE_CONFIG:
            a = state.risk_assessments.get(zone["zoneId"])
            if a:
                redis_client.publish(CHANNEL_RISK, {"zone_id": zone["zoneId"], "score": a["riskScore"], "level": a["riskLevel"]})
        if state.alerts:
            new_alert = state.alerts[0]
            redis_client.push_alert(new_alert)
            redis_client.publish(CHANNEL_ALERTS, new_alert)
        flagged = [p for p in state.permits if p["status"] == "FLAGGED"]
        if flagged:
            redis_client.publish(CHANNEL_PERMITS, {"permit_id": flagged[0]["permitId"], "status": "FLAGGED", "conflicts": flagged[0].get("conflicts", [])})
        if state.emergency:
            redis_client.publish(CHANNEL_EMERGENCY, state.emergency)
    except Exception as e:
        pass

def persist_to_db():
    try:
        from db.repository import repo
        from datetime import datetime

        for zone in ZONE_CONFIG:
            z = state.risk_assessments.get(zone["zoneId"])
            if z:
                repo.upsert_zone(zone["zoneId"], zone["name"], z["riskLevel"], z["riskScore"], {"x": zone["x"], "y": zone["y"], "width": zone["width"], "height": zone["height"]})
            else:
                repo.upsert_zone(zone["zoneId"], zone["name"], "SAFE", 0, {"x": zone["x"], "y": zone["y"], "width": zone["width"], "height": zone["height"]})

        readings = []
        for sid, s in state.sensors.items():
            repo.upsert_sensor(s["sensorId"], s["zoneId"], s["type"], s["unit"], s["value"], s["status"])
            readings.append({"sensor_id": s["sensorId"], "zone_id": s["zoneId"], "value": s["value"], "status": s["status"]})
        if readings:
            repo.batch_save_sensor_readings(readings)

        for p in state.permits:
            repo.upsert_permit(p["permitId"], p["type"], p["zoneId"], p["authorizedBy"], p.get("workersInvolved", []), p["status"], p.get("conflicts", []), p.get("startTime", datetime.now().isoformat()), p.get("endTime", datetime.now().isoformat()))

        for w in state.workers:
            repo.upsert_worker(w["workerId"], w["name"], w["zoneId"], w.get("shift", "B"), w.get("role", ""), w.get("locationX", 0), w.get("locationY", 0), w.get("inDangerZone", False))

        for zone in ZONE_CONFIG:
            a = state.risk_assessments.get(zone["zoneId"])
            if a:
                repo.save_risk_assessment(zone["zoneId"], a["riskScore"], a["riskLevel"], a.get("triggeredRules", []), a.get("recommendedActions", []), a.get("predictionHorizon", ""), a.get("confidence", 0.0))

        if state.alerts:
            a = state.alerts[0]
            repo.save_alert(a["alertId"], a["zoneId"], a["severity"], a["title"], a["description"], a["riskScore"], a.get("triggeredRules", []))
    except Exception as e:
        pass

def get_plant_state():
    assessments = list(state.risk_assessments.values())
    avg = round(sum(a["riskScore"] for a in assessments) / len(assessments)) if assessments else 0
    zones = []
    for zc in ZONE_CONFIG:
        a = state.risk_assessments.get(zc["zoneId"])
        zs = get_zone_sensors(zc["zoneId"])
        zones.append({
            "zoneId": zc["zoneId"], "name": zc["name"], "riskLevel": a["riskLevel"] if a else "SAFE",
            "riskScore": a["riskScore"] if a else 0,
            "coordinates": {"x": zc["x"], "y": zc["y"], "width": zc["width"], "height": zc["height"]},
            "activePermits": len([p for p in state.permits if p["zoneId"] == zc["zoneId"] and p["status"] not in ("SUSPENDED", "COMPLETED")]),
            "workerCount": len([w for w in state.workers if w["zoneId"] == zc["zoneId"]]),
            "sensors": zs
        })
    return {
        "overallRiskScore": avg, "overallRiskLevel": get_risk_level(avg), "zones": zones,
        "activeAlerts": len([a for a in state.alerts if not a["resolved"]]),
        "flaggedPermits": len([p for p in state.permits if p["status"] == "FLAGGED"]),
        "workersAtRisk": len([w for w in state.workers if is_zone_high_risk(w["zoneId"])]),
        "lastUpdated": now()
    }

HISTORICAL_INCIDENTS = [
    {"incident_id": "INC-2023-001", "date": "2023-03-15", "plant": "Bhilai Steel Plant", "zone": "Coke Oven Battery", "type": "Gas Explosion", "fatalities": 2, "injuries": 5, "root_causes": ["Elevated CO levels not acted upon", "Simultaneous maintenance and confined space entry", "Permit-to-work not checked against gas readings"], "warning_signs_missed": ["CO sensor reading 35ppm for 2 hours before incident", "Ventilation inspection overdue by 3 days"], "regulatory_violations": ["OISD-105 Section 4.2", "Factory Act Section 36"], "prevention_measures": ["Automated gas-monitoring linked to permit system", "Mandatory cross-check of sensor data before permit approval"], "description": "Explosion during maintenance in coke oven battery area due to accumulated CO gas."},
    {"incident_id": "INC-2023-002", "date": "2023-05-22", "plant": "Rourkela Steel Plant", "zone": "Blast Furnace", "type": "Hot Metal Splash", "fatalities": 1, "injuries": 3, "root_causes": ["Furnace refractory failure", "Inadequate pre-shift inspection", "Workers too close to tap hole"], "warning_signs_missed": ["Vibration sensor showed 6.2mm/s for 48 hours", "Refractory thickness inspection overdue by 2 weeks"], "regulatory_violations": ["OISD-105 Section 5.1", "Factory Act Section 34"], "prevention_measures": ["Continuous refractory monitoring", "Automated exclusion zone enforcement"], "description": "Hot metal splash from blast furnace tap hole due to refractory lining failure."},
    {"incident_id": "INC-2022-003", "date": "2022-07-10", "plant": "Vizag Steel Plant", "zone": "Gas Processing", "type": "Gas Leak", "fatalities": 3, "injuries": 8, "root_causes": ["CO gas leak from valve", "No gas detector in vicinity", "Emergency response delayed 25 minutes"], "warning_signs_missed": ["Gas detector non-functional for 72 hours", "Maintenance schedule missed", "No stand-by gas detector deployed"], "regulatory_violations": ["OISD-105 Section 3.2", "Factory Act Section 36A"], "prevention_measures": ["Redundant gas detection", "Automated valve isolation", "Real-time monitoring integration"], "description": "CO gas leak from processing unit valve. Three workers died due to prolonged exposure before detection."},
    {"incident_id": "INC-2023-004", "date": "2023-01-18", "plant": "Durgapur Steel Plant", "zone": "Coke Oven Battery", "type": "Fire", "fatalities": 0, "injuries": 4, "root_causes": ["Hot work near gas pipeline", "No gas testing before welding", "Fire watch inadequate"], "warning_signs_missed": ["CH4 sensor reading 12%LEL 30 min before incident", "Hot work permit not cross-checked with gas readings"], "regulatory_violations": ["OISD-105 Clause 6.3", "Factory Act Section 35"], "prevention_measures": ["Mandatory gas testing before hot work", "Automated permit-gas cross-reference system"], "description": "Fire broke out during welding near gas pipeline."},
    {"incident_id": "INC-2022-005", "date": "2022-11-05", "plant": "Bokaro Steel Plant", "zone": "Maintenance Workshop", "type": "Electrical Shock", "fatalities": 1, "injuries": 1, "root_causes": ["LOTO not properly applied", "Work on live circuit", "No verification of isolation"], "warning_signs_missed": ["Electrical permit not closed from previous shift", "No second-person verification"], "regulatory_violations": ["Factory Act Section 32", "IE Rules 44A"], "prevention_measures": ["Digital LOTO system", "Mandatory verification step in electrical permits"], "description": "Electrician received fatal shock while working on panel that was not properly isolated."},
    {"incident_id": "INC-2023-006", "date": "2023-08-30", "plant": "SAIL Bhilai", "zone": "Blast Furnace", "type": "Fall from Height", "fatalities": 1, "injuries": 0, "root_causes": ["Scaffold plank failure", "Safety harness not anchored", "Inspection overdue"], "warning_signs_missed": ["Scaffold inspection tag expired 5 days prior", "Weather advisory for high winds ignored"], "regulatory_violations": ["Factory Act Section 38", "OISD-105 Section 9"], "prevention_measures": ["Digital scaffold inspection system", "Weather-integrated work scheduling"], "description": "Worker fell from scaffold during blast furnace maintenance."},
    {"incident_id": "INC-2022-007", "date": "2022-04-14", "plant": "Tata Steel Jamshedpur", "zone": "Gas Processing", "type": "Confined Space Asphyxiation", "fatalities": 2, "injuries": 1, "root_causes": ["Oxygen deficient atmosphere", "No pre-entry gas testing", "Inadequate rescue plan"], "warning_signs_missed": ["O2 level at 17.2% recorded 1 hour before entry", "Confined space permit approved without gas test results"], "regulatory_violations": ["OISD-105 Section 8.2", "Factory Act Section 36"], "prevention_measures": ["Mandatory real-time gas monitoring during confined space work", "Automated permit approval with sensor validation"], "description": "Two workers asphyxiated in gas processing vessel."},
    {"incident_id": "INC-2023-008", "date": "2023-06-25", "plant": "JSW Bellary", "zone": "Raw Material Storage", "type": "Wall Collapse", "fatalities": 3, "injuries": 6, "root_causes": ["Overloaded storage wall", "Water damage from rain", "No structural monitoring"], "warning_signs_missed": ["Cracks reported in inspection log 2 weeks prior", "Rain accumulation not addressed"], "regulatory_violations": ["Factory Act Section 31", "DGMS Technical Circular 2/2010"], "prevention_measures": ["Structural health monitoring system", "Weather-triggered inspections"], "description": "Storage area wall collapsed after heavy rain."},
    {"incident_id": "INC-2022-009", "date": "2022-09-03", "plant": "Vizag Steel Plant", "zone": "Coke Oven Battery", "type": "Burns Injury", "fatalities": 0, "injuries": 6, "root_causes": ["Steam line rupture", "Corroded pipe not replaced", "Workers in blast zone"], "warning_signs_missed": ["Pipe thickness below minimum reported 3 months earlier", "Vibration readings elevated for 2 weeks"], "regulatory_violations": ["Factory Act Section 34", "OISD-105 Section 5.2"], "prevention_measures": ["Predictive maintenance using vibration analysis", "Automated exclusion zones around critical equipment"], "description": "Steam line ruptured during operation causing severe burns."},
    {"incident_id": "INC-2023-010", "date": "2023-02-28", "plant": "RINL Vizag", "zone": "Blast Furnace", "type": "Gas Poisoning", "fatalities": 1, "injuries": 3, "root_causes": ["CO leak from furnace shell", "Wind direction change pushed gas into work area", "No portable detector"], "warning_signs_missed": ["Fixed CO detector showed 28ppm for 1 hour before escalation", "Weather station showed wind shift"], "regulatory_violations": ["OISD-105 Section 4.2", "Factory Act Section 36A"], "prevention_measures": ["Wind-aware gas dispersion modeling", "Mandatory portable detectors for all furnace area workers"], "description": "CO gas from blast furnace shell leak poisoned workers."},
    {"incident_id": "INC-2022-011", "date": "2022-12-15", "plant": "SAIL Rourkela", "zone": "Maintenance Workshop", "type": "Crush Injury", "fatalities": 1, "injuries": 0, "root_causes": ["Crane failure during lift", "Overloaded beyond rated capacity", "No load testing"], "warning_signs_missed": ["Crane load test overdue by 6 months", "Maintenance log showed hydraulic pressure anomaly"], "regulatory_violations": ["Factory Act Section 29", "OISD-105 Section 7"], "prevention_measures": ["IoT-enabled crane monitoring", "Automated load verification before lift"], "description": "Worker crushed when overloaded crane failed during material handling."},
    {"incident_id": "INC-2023-012", "date": "2023-04-20", "plant": "NMDC Donimalai", "zone": "Raw Material Storage", "type": "Landslide", "fatalities": 4, "injuries": 2, "root_causes": ["Slope instability", "Blasting nearby", "No slope monitoring"], "warning_signs_missed": ["Inclinometer showed 2mm/day movement for 2 weeks", "Rain gauge showed above-threshold precipitation"], "regulatory_violations": ["DGMS Technical Circular 3/2016", "MMRD Act Section 18"], "prevention_measures": ["Real-time slope stability monitoring", "Blasting exclusion zones based on slope data"], "description": "Landslide at ore storage area after blasting."},
    {"incident_id": "INC-2023-013", "date": "2023-09-12", "plant": "Tata Steel Kalinganagar", "zone": "Gas Processing", "type": "Explosion", "fatalities": 2, "injuries": 7, "root_causes": ["Gas accumulation in enclosed space", "Ignition from static discharge", "No continuous monitoring"], "warning_signs_missed": ["CH4 detector showed 15%LEL 2 hours before incident", "Ventilation system shut down for maintenance without alternate arrangement"], "regulatory_violations": ["OISD-105 Section 3.2", "Factory Act Section 36A", "IS:3254"], "prevention_measures": ["Continuous gas monitoring with automated ventilation", "Static discharge prevention protocols"], "description": "Gas explosion in processing unit."},
    {"incident_id": "INC-2022-014", "date": "2022-08-08", "plant": "JSW Dolvi", "zone": "Coke Oven Battery", "type": "Toxic Exposure", "fatalities": 0, "injuries": 12, "root_causes": ["Benzene leak from coke oven", "Inadequate PPE", "Delayed evacuation"], "warning_signs_missed": ["Air quality monitor showed elevated VOC for 4 hours", "Workers reported unusual odor but were told to continue"], "regulatory_violations": ["Factory Act Section 36A", "OISD-105 Section 4.1"], "prevention_measures": ["Automated VOC monitoring with evacuation triggers", "Real-time PPE compliance tracking"], "description": "Mass benzene exposure at coke oven."},
    {"incident_id": "INC-2023-015", "date": "2023-07-04", "plant": "SAIL Bokaro", "zone": "Control Room", "type": "Electrical Fire", "fatalities": 0, "injuries": 2, "root_causes": ["Short circuit in PLC panel", "Dust accumulation in electrical room", "Fire suppression not triggered"], "warning_signs_missed": ["Temperature in electrical room elevated for 1 week", "Dust cleaning schedule missed for 3 months"], "regulatory_violations": ["IE Rules 64", "NBC 2016 Part 4"], "prevention_measures": ["Automated fire suppression", "Environmental monitoring in electrical rooms"], "description": "Electrical fire in control room PLC panel."},
    {"incident_id": "INC-2022-016", "date": "2022-06-19", "plant": "Vizag Steel Plant", "zone": "Blast Furnace", "type": "Hot Metal Breakout", "fatalities": 2, "injuries": 5, "root_causes": ["Refractory failure in hearth", "Cooling system malfunction", "No thermal imaging"], "warning_signs_missed": ["Cooling water temperature differential decreased over 2 weeks", "Thermal imaging inspection not performed as scheduled"], "regulatory_violations": ["OISD-105 Section 5.1", "Factory Act Section 34"], "prevention_measures": ["Continuous thermal imaging of furnace shell", "Predictive cooling system monitoring"], "description": "Hot metal breakout from blast furnace hearth."},
    {"incident_id": "INC-2023-017", "date": "2023-10-30", "plant": "NMDC Bacheli", "zone": "Maintenance Workshop", "type": "Mechanical Injury", "fatalities": 0, "injuries": 3, "root_causes": ["Guard removed from conveyor", "No lockout during maintenance", "Unexpected startup"], "warning_signs_missed": ["Guard removal not logged in maintenance system", "LOTO procedure bypassed"], "regulatory_violations": ["Factory Act Section 21", "IS:7244"], "prevention_measures": ["Digital LOTO with interlock", "Guard removal requires management authorization"], "description": "Workers injured when conveyor started unexpectedly during maintenance."},
    {"incident_id": "INC-2022-018", "date": "2022-03-27", "plant": "RINL Vizag", "zone": "Gas Processing", "type": "Pipeline Rupture", "fatalities": 1, "injuries": 4, "root_causes": ["Corrosion under insulation", "No inspection program", "Pressure exceeded design limit"], "warning_signs_missed": ["Pressure gauge showing gradual increase over 3 days", "Corrosion inspection of insulated piping never performed"], "regulatory_violations": ["OISD-105 Section 5.2", "Factory Act Section 31"], "prevention_measures": ["CUI inspection program", "Automated pressure monitoring with alerts"], "description": "Gas pipeline ruptured due to corrosion under insulation."},
    {"incident_id": "INC-2023-019", "date": "2023-11-22", "plant": "Tata Steel Jamshedpur", "zone": "Raw Material Storage", "type": "Dust Explosion", "fatalities": 1, "injuries": 5, "root_causes": ["Coal dust accumulation", "Ignition from spark", "No dust suppression"], "warning_signs_missed": ["Dust monitoring system showed >4mg/m³ for 5 days", "Housekeeping audit findings not addressed for 2 weeks"], "regulatory_violations": ["OISD-105 Section 4.3", "Factory Act Section 34A"], "prevention_measures": ["Continuous dust concentration monitoring", "Automated dust suppression system"], "description": "Coal dust explosion in storage area."},
    {"incident_id": "INC-2022-020", "date": "2022-10-11", "plant": "JSW Vijayanagar", "zone": "Coke Oven Battery", "type": "Chemical Burn", "fatalities": 0, "injuries": 3, "root_causes": ["Ammonium sulfate spill", "Inadequate chemical handling procedure", "PPE not worn"], "warning_signs_missed": ["Chemical storage inspection found expired PPE 1 week prior", "Spill containment system test overdue"], "regulatory_violations": ["Factory Act Section 36A", "MSIHC Rules 2000"], "prevention_measures": ["Automated chemical spill detection", "PPE compliance monitoring system"], "description": "Workers received chemical burns from ammonium sulfate spill."},
]

REGULATIONS = [
    {"id": "OISD-105-4.2", "source": "OISD-105", "section": "4.2", "title": "Gas Detection in Confined Spaces", "content": "All confined spaces must have continuous gas monitoring. Entry is prohibited when gas levels exceed prescribed limits. CO: 25ppm, H2S: 5ppm, CH4: 10%LEL, O2: 19.5-23.5%."},
    {"id": "OISD-105-6.3", "source": "OISD-105", "section": "6.3", "title": "Hot Work Near Flammable Areas", "content": "Hot work permits shall not be issued in areas where flammable gas concentration exceeds 10% of LEL. Gas testing must be performed within 30 minutes before and continuously during hot work operations."},
    {"id": "OISD-105-8.2", "source": "OISD-105", "section": "8.2", "title": "Confined Space Ventilation", "content": "Mechanical ventilation must be operational before and during confined space entry. If ventilation fails, all personnel must evacuate immediately and permit must be suspended."},
    {"id": "OISD-105-5.1", "source": "OISD-105", "section": "5.1", "title": "Pressure Equipment Safety", "content": "Pressure equipment must be monitored continuously. Any deviation beyond 120% of design pressure requires immediate shutdown and investigation."},
    {"id": "FACTORY-36", "source": "Factory Act 1948", "section": "36", "title": "Precautions Against Dangerous Fumes", "content": "No person shall enter or remain in any chamber, tank, vat, pit, pipe, flue or similar confined space where dangerous fumes are likely to be present."},
    {"id": "FACTORY-36A", "source": "Factory Act 1948", "section": "36A", "title": "Explosive or Inflammable Gas", "content": "Where any work is to be carried out in any place where explosive or inflammable gas, fume or dust is present, adequate measures shall be taken to prevent fire or explosion."},
    {"id": "DGMS-2-2010", "source": "DGMS Technical Circular", "section": "2/2010", "title": "Slope Stability Monitoring", "content": "All open pit mines must have continuous slope stability monitoring. Movement exceeding 2mm/day requires evacuation."},
    {"id": "OISD-105-3.2", "source": "OISD-105", "section": "3.2", "title": "Gas Detector Placement", "content": "Gas detectors must be installed at all potential gas release points. Detectors must be calibrated monthly and tested weekly."},
]
