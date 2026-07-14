from fastapi import APIRouter
from data.simulator import get_alerts, acknowledge_alert, resolve_alert

router = APIRouter()

@router.get("")
async def alerts_all(active: str = None, severity: str = None):
    alerts = get_alerts()
    if active == "true": alerts = [a for a in alerts if not a["resolved"]]
    if severity: alerts = [a for a in alerts if a["severity"] == severity]
    return {"data": alerts, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/active")
async def alerts_active():
    alerts = [a for a in get_alerts() if not a["resolved"] and not a["acknowledged"]]
    return {"data": alerts, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/{alert_id}/acknowledge")
async def alert_acknowledge(alert_id: str):
    success = acknowledge_alert(alert_id)
    return {"data": {"success": success}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/{alert_id}/resolve")
async def alert_resolve(alert_id: str):
    success = resolve_alert(alert_id)
    return {"data": {"success": success}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/trigger")
async def trigger_alert():
    return {"data": {"success": True, "message": "Manual alert triggered"}, "timestamp": __import__("datetime").datetime.now().isoformat()}
