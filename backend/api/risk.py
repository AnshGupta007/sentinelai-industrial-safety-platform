from fastapi import APIRouter
from data.simulator import get_plant_state, get_risk_assessments, get_zone_risk, calculate_risk
from agents.compound_risk_agent import run_multi_agent_pipeline

router = APIRouter()

@router.get("/plant")
async def risk_plant():
    state = get_plant_state()
    return {"data": {"riskScore": state["overallRiskScore"], "riskLevel": state["overallRiskLevel"]}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/zones")
async def risk_zones():
    return {"data": get_risk_assessments(), "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/history")
async def risk_history(zone_id: str = None, limit: int = 120):
    from data.simulator import get_risk_history as grh
    history = grh(zone_id=zone_id, limit=limit)
    if history:
        return {"data": history, "timestamp": __import__("datetime").datetime.now().isoformat()}
    try:
        from db.repository import repo
        zones = [zone_id] if zone_id else [z["zoneId"] for z in __import__("data.simulator", fromlist=["ZONE_CONFIG"]).ZONE_CONFIG]
        all_rows = []
        for z in zones:
            rows = repo.get_risk_history(z, limit=limit // (len(zones) if not zone_id else 1))
            all_rows.extend(rows)
        all_rows.sort(key=lambda x: x["timestamp"], reverse=True)
        return {"data": all_rows[:limit], "timestamp": __import__("datetime").datetime.now().isoformat()}
    except Exception:
        return {"data": [], "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/analyze")
async def risk_analyze():
    assessments = []
    from data.simulator import ZONE_CONFIG
    for zone in ZONE_CONFIG:
        assessments.append(calculate_risk(zone["zoneId"]))
    return {"data": assessments, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/compound-all")
async def risk_compound_all():
    from data.simulator import ZONE_CONFIG
    results = [run_multi_agent_pipeline(zone["zoneId"]) for zone in ZONE_CONFIG]
    return {"data": results, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/compound/{zone_id}")
async def risk_compound_agent(zone_id: str):
    result = run_multi_agent_pipeline(zone_id)
    return {"data": result, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/{zone_id}")
async def risk_zone(zone_id: str):
    risk = get_zone_risk(zone_id)
    return {"data": risk, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/predictions/{zone_id}")
async def risk_predictions(zone_id: str):
    try:
        from models.predictive_risk import get_predictions
        predictions = get_predictions(zone_id)
        return {"data": predictions, "timestamp": __import__("datetime").datetime.now().isoformat()}
    except Exception as e:
        return {"data": {"zoneId": zone_id, "predictions": {}, "forecastedRisk30": 0, "forecastedRisk60": 0, "forecastedRisk90": 0, "currentRisk": 0, "horizon": "90min", "error": str(e)}, "timestamp": __import__("datetime").datetime.now().isoformat()}
