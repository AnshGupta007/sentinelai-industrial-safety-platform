from fastapi import APIRouter
from data.simulator import get_current_sensors, get_zone_sensors, get_zone_history

router = APIRouter()

@router.get("/current")
async def sensors_current():
    return {"data": get_current_sensors(), "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/anomalies")
async def sensors_anomalies():
    sensors = get_current_sensors()
    anomalies = [s for s in sensors if s["status"] != "NORMAL"]
    return {"data": anomalies, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/{zone_id}")
async def sensors_zone(zone_id: str):
    return {"data": get_zone_sensors(zone_id), "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/{zone_id}/history")
async def sensors_history(zone_id: str):
    return {"data": get_zone_history(zone_id), "timestamp": __import__("datetime").datetime.now().isoformat()}
