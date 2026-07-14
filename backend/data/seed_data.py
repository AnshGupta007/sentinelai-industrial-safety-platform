import json
import os
from datetime import datetime
from data.simulator import ZONE_CONFIG, SENSOR_TYPES, SENSOR_CONFIG, WORKER_NAMES, ROLES, WORKER_PER_ZONE, HISTORICAL_INCIDENTS
from data.simulator import initialize, state as sim_state
from db.repository import repo
from db.connection import init_db

def load_zones_from_json():
    path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "plant", "zones.json")
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return ZONE_CONFIG

def seed_all():
    init_db()
    repo.clear_all()
    initialize()

    now_ts = datetime.now()
    zone_config = load_zones_from_json()

    for zc in zone_config:
        repo.upsert_zone(zc["zoneId"], zc["name"], "SAFE", 0, {"x": zc["x"], "y": zc["y"], "width": zc["width"], "height": zc["height"]})

    for sid, sensor in sim_state.sensors.items():
        repo.upsert_sensor(sensor["sensorId"], sensor["zoneId"], sensor["type"], sensor["unit"], sensor["value"], sensor["status"])
        repo.save_sensor_reading(sensor["sensorId"], sensor["zoneId"], sensor["value"], sensor["status"])

    for p in sim_state.permits:
        repo.upsert_permit(p["permitId"], p["type"], p["zoneId"], p["authorizedBy"], p.get("workersInvolved", []), p["status"], p.get("conflicts", []), p.get("startTime", now_ts.isoformat()), p.get("endTime", now_ts.isoformat()))

    for w in sim_state.workers:
        repo.upsert_worker(w["workerId"], w["name"], w["zoneId"], w.get("shift", "B"), w.get("role", ""), w.get("locationX", 0), w.get("locationY", 0), w.get("inDangerZone", False))

    repo.load_incidents(HISTORICAL_INCIDENTS)

    for zone in ZONE_CONFIG:
        assessment = sim_state.risk_assessments.get(zone["zoneId"])
        if assessment:
            repo.save_risk_assessment(zone["zoneId"], assessment["riskScore"], assessment["riskLevel"], assessment.get("triggeredRules", []), assessment.get("recommendedActions", []), assessment.get("predictionHorizon", ""), assessment.get("confidence", 0.0))

    print("Seed complete: zones, sensors, readings, permits, workers, incidents, risk assessments persisted.")

if __name__ == "__main__":
    seed_all()
