from fastapi import APIRouter
from data.simulator import get_emergency, suspend_zone_permits, trigger_evacuation, state as sim_state, get_zone_risk, ZONE_CONFIG
from agents.emergency_orchestrator import orchestrate_response, generate_incident_report, check_trigger_condition
from notifications.simulator import dispatch_emergency_notifications, get_notification_history, get_notification_stats

router = APIRouter()

@router.get("")
async def emergency_status():
    return {"data": get_emergency(), "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/trigger")
async def emergency_trigger(body: dict = None):
    zone_id = (body or {}).get("zone_id", "")
    if not zone_id:
        for zc in ZONE_CONFIG:
            risk = get_zone_risk(zc["zoneId"])
            if risk and risk.get("riskScore", 0) > 75:
                zone_id = zc["zoneId"]
                break
        if not zone_id:
            zone_id = "ZONE_A"
    risk = get_zone_risk(zone_id)
    sim_state.emergency = {
        "status": "ACTIVE", "zoneId": zone_id,
        "riskScore": risk["riskScore"] if risk else 80,
        "triggeredAt": __import__("datetime").datetime.now().isoformat(),
        "message": f"Manual emergency trigger for {zone_id}",
        "steps": []
    }
    zone_name = next((z["name"] for z in ZONE_CONFIG if z["zoneId"] == zone_id), zone_id)
    dispatch_emergency_notifications(zone_name, risk["riskScore"] if risk else 80, "Immediate evacuation required")
    return {"data": {"success": True, "emergency": sim_state.emergency}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/resolve")
async def emergency_resolve():
    sim_state.emergency = None
    return {"data": {"success": True, "message": "Emergency resolved"}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/orchestrate/{zone_id}")
async def emergency_orchestrate(zone_id: str):
    from data.simulator import state as sim_state
    trigger_time = sim_state.__dict__.setdefault("_emergency_trigger_time", {})
    if zone_id not in trigger_time:
        trigger_time[zone_id] = __import__("datetime").datetime.now().timestamp()
    result = orchestrate_response(zone_id, step_start_time=trigger_time[zone_id])
    return {"data": result, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/report/{zone_id}")
async def emergency_report(zone_id: str):
    report = generate_incident_report(zone_id)
    return {"data": {"report": report}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/trigger-check")
async def emergency_trigger_check():
    triggered = check_trigger_condition()
    return {"data": {"triggered": triggered}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/suspend-permits/{zone_id}")
async def emergency_suspend_permits(zone_id: str):
    success = suspend_zone_permits(zone_id)
    return {"data": {"success": success}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/evacuate/{zone_id}")
async def emergency_evacuate(zone_id: str):
    success = trigger_evacuation(zone_id)
    return {"data": {"success": success}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/notifications")
async def emergency_notifications(limit: int = 50):
    return {"data": get_notification_history(limit), "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/notification-stats")
async def emergency_notification_stats():
    return {"data": get_notification_stats(), "timestamp": __import__("datetime").datetime.now().isoformat()}
