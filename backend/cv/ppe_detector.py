import random
from datetime import datetime
from typing import List, Dict, Optional, TypedDict

from data.simulator import state as sim_state, get_workers, get_permits, get_current_sensors

PPE_ITEMS = ["helmet", "vest", "harness", "gloves", "goggles"]

PERMIT_PPE_REQUIREMENTS = {
    "HOT_WORK": ["helmet", "vest", "gloves", "goggles"],
    "CONFINED_SPACE": ["helmet", "vest", "harness", "gloves"],
    "HEIGHT": ["helmet", "vest", "harness"],
    "ELECTRICAL": ["helmet", "vest", "gloves", "goggles"],
    "EXCAVATION": ["helmet", "vest", "gloves"],
}

class PpeViolation(TypedDict):
    violationId: str
    workerId: str
    workerName: str
    zoneId: str
    permitType: str
    permitId: str
    missingItems: List[str]
    detectedAt: str
    acknowledged: bool

class PpeDetectionEvent(TypedDict):
    eventId: str
    cameraId: str
    zoneId: str
    workerId: str
    detected: Dict[str, bool]
    timestamp: str

CAMERAS = [
    {"cameraId": "CAM-A-01", "zoneId": "ZONE_A", "label": "Coke Oven — North Entry"},
    {"cameraId": "CAM-A-02", "zoneId": "ZONE_A", "label": "Coke Oven — South Platform"},
    {"cameraId": "CAM-B-01", "zoneId": "ZONE_B", "label": "Blast Furnace — Taphole"},
    {"cameraId": "CAM-B-02", "zoneId": "ZONE_B", "label": "Blast Furnace — Cast House"},
    {"cameraId": "CAM-C-01", "zoneId": "ZONE_C", "label": "Gas Processing — Valve Station"},
    {"cameraId": "CAM-D-01", "zoneId": "ZONE_D", "label": "Control Room — Entry"},
    {"cameraId": "CAM-E-01", "zoneId": "ZONE_E", "label": "Maintenance — Bay 1"},
    {"cameraId": "CAM-F-01", "zoneId": "ZONE_F", "label": "Raw Material — Conveyor"},
]

_violations: List[PpeViolation] = []
_detection_log: List[PpeDetectionEvent] = []
_violation_counter = 0

def _get_ppe_status(worker_id: str) -> Dict[str, bool]:
    base_prob = 0.92
    if sim_state.demo_phase >= 2:
        base_prob = 0.80
    if sim_state.demo_phase >= 3:
        base_prob = 0.70
    return {
        "helmet": random.random() < base_prob,
        "vest": random.random() < base_prob,
        "harness": random.random() < (base_prob - 0.1),
        "gloves": random.random() < (base_prob + 0.03),
        "goggles": random.random() < (base_prob - 0.05),
    }

def _find_active_permit_for_worker(worker_id: str, zone_id: str) -> Optional[dict]:
    permits = get_permits()
    for p in permits:
        if p["zoneId"] == zone_id and p["status"] not in ("SUSPENDED", "COMPLETED"):
            if worker_id in p.get("workersInvolved", []):
                return p
    return None

def _check_ppe_compliance(worker: dict, permit: dict) -> Optional[PpeViolation]:
    global _violation_counter
    ptype = permit["type"]
    required = PERMIT_PPE_REQUIREMENTS.get(ptype, ["helmet", "vest"])
    ppe_status = _get_ppe_status(worker["workerId"])
    missing = [item for item in required if not ppe_status.get(item, False)]
    if missing:
        _violation_counter += 1
        return {
            "violationId": f"PPE-VIO-{_violation_counter}",
            "workerId": worker["workerId"],
            "workerName": worker["name"],
            "zoneId": worker["zoneId"],
            "permitType": ptype,
            "permitId": permit["permitId"],
            "missingItems": missing,
            "detectedAt": datetime.now().isoformat(),
            "acknowledged": False,
        }
    return None

def run_detection_cycle() -> List[PpeViolation]:
    new_violations = []
    workers = get_workers()
    scanned = random.sample(workers, min(len(workers), max(3, len(workers) // 3)))
    for worker in scanned:
        camera = next((c for c in CAMERAS if c["zoneId"] == worker["zoneId"]), None)
        if not camera:
            continue
        ppe_status = _get_ppe_status(worker["workerId"])
        _detection_log.append({
            "eventId": f"PPE-EVT-{len(_detection_log) + 1}",
            "cameraId": camera["cameraId"],
            "zoneId": worker["zoneId"],
            "workerId": worker["workerId"],
            "detected": ppe_status,
            "timestamp": datetime.now().isoformat(),
        })
        permit = _find_active_permit_for_worker(worker["workerId"], worker["zoneId"])
        if permit:
            violation = _check_ppe_compliance(worker, permit)
            if violation:
                _violations.append(violation)
                new_violations.append(violation)
    if len(_violations) > 100:
        _violations[:] = _violations[-100:]
    if len(_detection_log) > 500:
        _detection_log[:] = _detection_log[-500:]
    return new_violations

def get_active_violations() -> List[PpeViolation]:
    return [v for v in _violations if not v["acknowledged"]]

def acknowledge_violation(violation_id: str) -> bool:
    for v in _violations:
        if v["violationId"] == violation_id:
            v["acknowledged"] = True
            return True
    return False

def get_detection_log(limit: int = 50) -> List[PpeDetectionEvent]:
    return _detection_log[-limit:]

def get_violation_stats() -> dict:
    active = get_active_violations()
    by_zone: Dict[str, int] = {}
    by_type: Dict[str, int] = {}
    for v in active:
        by_zone[v["zoneId"]] = by_zone.get(v["zoneId"], 0) + 1
        for item in v["missingItems"]:
            by_type[item] = by_type.get(item, 0) + 1
    return {
        "totalViolations": len(_violations),
        "activeViolations": len(active),
        "byZone": by_zone,
        "byMissingItem": by_type,
    }
