from fastapi import APIRouter
from data.simulator import get_permits, suspend_permit
from agents.permit_intelligence_agent import analyze_all_permits, analyze_permit

router = APIRouter()

@router.get("")
async def permits_all(active: str = None):
    permits = get_permits()
    if active == "true": permits = [p for p in permits if p["status"] in ("ACTIVE", "FLAGGED")]
    return {"data": permits, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/active")
async def permits_active():
    permits = [p for p in get_permits() if p["status"] in ("ACTIVE", "FLAGGED")]
    return {"data": permits, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/conflicts")
async def permits_conflicts():
    permits = [p for p in get_permits() if p["conflicts"]]
    return {"data": permits, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/{permit_id}/suspend")
async def permit_suspend(permit_id: str):
    success = suspend_permit(permit_id)
    return {"data": {"success": success}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/simops")
async def permits_simops():
    from data.simulator import get_permits
    permits = get_permits()
    active = [p for p in permits if p["status"] not in ("SUSPENDED", "COMPLETED")]
    matrix = {}
    for p1 in active:
        matrix[p1["permitId"]] = {}
        for p2 in active:
            if p1["permitId"] == p2["permitId"]:
                matrix[p1["permitId"]][p2["permitId"]] = {"status": "SELF", "reason": ""}
            elif p1["zoneId"] == p2["zoneId"]:
                dangerous = (p1["type"] == "HOT_WORK" and p2["type"] == "CONFINED_SPACE") or (p2["type"] == "HOT_WORK" and p1["type"] == "CONFINED_SPACE")
                matrix[p1["permitId"]][p2["permitId"]] = {"status": "DANGER" if dangerous else "CAUTION", "reason": f"Same zone: {p1['zoneId']}"}
            else:
                matrix[p1["permitId"]][p2["permitId"]] = {"status": "SAFE", "reason": "Different zones"}
    return {"data": {"permits": active, "matrix": matrix}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/intelligence")
async def permit_intelligence():
    results = analyze_all_permits()
    return {"data": results, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/intelligence/{permit_id}")
async def permit_intelligence_single(permit_id: str):
    permit = next((p for p in get_permits() if p["permitId"] == permit_id), None)
    if not permit:
        return {"error": "Permit not found"}, 404
    result = analyze_permit(permit)
    return {"data": result, "timestamp": __import__("datetime").datetime.now().isoformat()}
