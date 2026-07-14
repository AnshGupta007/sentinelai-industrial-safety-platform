from fastapi import APIRouter
from data.simulator import get_workers, get_risk_assessments

router = APIRouter()

@router.get("")
async def workers_all(in_danger: str = None):
    workers = get_workers()
    if in_danger == "true":
        workers = [w for w in workers if w.get("inDangerZone", False)]
    return {"data": workers, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/zone/{zone_id}")
async def workers_by_zone(zone_id: str):
    workers = get_workers()
    zone_workers = [w for w in workers if w["zoneId"] == zone_id]
    return {"data": zone_workers, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/at-risk")
async def workers_at_risk():
    workers = get_workers()
    assessments = get_risk_assessments()
    high_risk_zones = {a["zoneId"] for a in assessments if a["riskLevel"] in ("HIGH", "CRITICAL")}
    at_risk = [w for w in workers if w["zoneId"] in high_risk_zones]
    return {"data": at_risk, "timestamp": __import__("datetime").datetime.now().isoformat()}
