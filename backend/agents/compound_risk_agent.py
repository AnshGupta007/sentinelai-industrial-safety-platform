import os
from typing import Dict, List, Optional, TypedDict, Any
from langgraph.graph import StateGraph, END
from data.simulator import calculate_risk, ZONE_CONFIG, get_current_sensors, get_permits, get_workers

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

class AgentState(TypedDict):
    zone_id: str
    sensor_analysis: dict
    permit_analysis: dict
    worker_analysis: dict
    compound_analysis: dict
    recommendations: List[str]

def sensor_analysis_agent(state: AgentState) -> dict:
    zone_id = state["zone_id"]
    sensors = get_current_sensors()
    zone_sensors = [s for s in sensors if s["zoneId"] == zone_id]
    anomalies = [s for s in zone_sensors if s["status"] != "NORMAL"]
    total_risk = sum(
        40 if s["status"] == "CRITICAL" else 20 if s["status"] == "WARNING" else 2
        for s in zone_sensors
    )
    result = {
        "zone_id": zone_id,
        "sensor_count": len(zone_sensors),
        "anomaly_count": len(anomalies),
        "sensor_risk_score": round(min(40, total_risk / max(len(zone_sensors), 1)), 1),
        "anomalies": [
            {"sensorId": s["sensorId"], "type": s["type"], "value": s["value"], "status": s["status"]}
            for s in anomalies
        ],
    }
    return {"sensor_analysis": result}

def permit_cross_reference_agent(state: AgentState) -> dict:
    zone_id = state["zone_id"]
    permits = get_permits()
    zone_permits = [p for p in permits if p["zoneId"] == zone_id and p["status"] not in ("SUSPENDED", "COMPLETED")]
    sensors = {s["type"]: s["value"] for s in get_current_sensors() if s["zoneId"] == zone_id}
    conflicts = []
    for p in zone_permits:
        if p["type"] == "HOT_WORK":
            if sensors.get("CH4", 0) > 10 or sensors.get("H2S", 0) > 5:
                conflicts.append({"permitId": p["permitId"], "conflictType": "GAS_HAZARD", "description": "Hot work with flammable gas present", "urgency": "CRITICAL"})
            if sensors.get("CO", 0) > 25:
                conflicts.append({"permitId": p["permitId"], "conflictType": "TOXIC_HAZARD", "description": "Hot work with toxic gas present", "urgency": "CRITICAL"})
        if p["type"] == "CONFINED_SPACE":
            if sensors.get("O2", 20.9) < 19.5 or sensors.get("O2", 20.9) > 23.5:
                conflicts.append({"permitId": p["permitId"], "conflictType": "O2_HAZARD", "description": "Confined space with abnormal O2 levels", "urgency": "CRITICAL"})
    if len(zone_permits) > 2:
        conflicts.append({"permitId": "ALL", "conflictType": "SIMOPS", "description": f"{len(zone_permits)} simultaneous permits in zone", "urgency": "MEDIUM"})
    result = {
        "zone_id": zone_id,
        "active_permits": len(zone_permits),
        "conflict_count": len(conflicts),
        "conflicts": conflicts,
        "permits": [
            {"permitId": p["permitId"], "type": p["type"], "status": p["status"]}
            for p in zone_permits
        ],
    }
    return {"permit_analysis": result}

def worker_safety_agent(state: AgentState) -> dict:
    zone_id = state["zone_id"]
    workers = get_workers()
    zone_workers = [w for w in workers if w["zoneId"] == zone_id]
    zone_info = next((z for z in ZONE_CONFIG if z["zoneId"] == zone_id), None)
    risk_assessments = __import__("data.simulator", fromlist=["get_risk_assessments"]).get_risk_assessments()
    zone_assessment = None
    if isinstance(risk_assessments, dict):
        zone_assessment = risk_assessments.get(zone_id)
    else:
        zone_assessment = next((a for a in risk_assessments if a["zoneId"] == zone_id), None)
    in_danger = False
    if zone_assessment:
        in_danger = zone_assessment.get("riskScore", 0) > 50
    for w in zone_workers:
        w["inDangerZone"] = in_danger
    result = {
        "zone_id": zone_id,
        "total_workers": len(zone_workers),
        "workers_in_danger": len([w for w in zone_workers if w.get("inDangerZone")]),
        "workers": [
            {"workerId": w["workerId"], "name": w["name"], "role": w["role"], "shift": w.get("shift", "B"), "inDangerZone": w.get("inDangerZone", False)}
            for w in zone_workers
        ],
    }
    return {"worker_analysis": result}

def compound_risk_synthesizer(state: AgentState) -> dict:
    zone_id = state["zone_id"]
    risk = calculate_risk(zone_id)
    sensor = state.get("sensor_analysis", {})
    permit = state.get("permit_analysis", {})
    worker = state.get("worker_analysis", {})
    compound_score = risk["riskScore"]
    triggered = risk["triggeredRules"]
    if sensor.get("anomaly_count", 0) >= 3 and permit.get("conflict_count", 0) >= 1:
        overload_bonus = 10
        compound_score = min(100, compound_score + overload_bonus)
        triggered.append({"ruleId": "RULE_OVERLOAD", "description": "3+ sensor anomalies + permit conflicts", "contribution": overload_bonus, "evidence": {"anomalyCount": sensor["anomaly_count"], "conflictCount": permit["conflict_count"]}})
    pred_horizon = f"{max(15, 90 - compound_score)} min to critical" if compound_score > 60 else "> 2 hours"
    result = {
        "zone_id": zone_id,
        "risk_score": compound_score,
        "risk_level": "CRITICAL" if compound_score > 75 else "HIGH" if compound_score > 50 else "CAUTION" if compound_score > 25 else "SAFE",
        "triggered_rules": triggered,
        "prediction_horizon": pred_horizon,
        "sensor_summary": f"{sensor.get('anomaly_count', 0)} anomalies of {sensor.get('sensor_count', 0)} sensors",
        "permit_summary": f"{permit.get('conflict_count', 0)} conflicts across {permit.get('active_permits', 0)} permits",
        "worker_summary": f"{worker.get('workers_in_danger', 0)} of {worker.get('total_workers', 0)} workers in danger",
        "confidence": round(0.75 + (__import__("random").random() * 0.2), 2),
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }
    return {"compound_analysis": result}

def recommendation_agent(state: AgentState) -> dict:
    compound = state.get("compound_analysis", {})
    risk_level = compound.get("risk_level", "SAFE")
    risk_score = compound.get("risk_score", 0)
    rules = compound.get("triggered_rules", [])
    zone_id = state["zone_id"]
    sensor = state.get("sensor_analysis", {})
    permit = state.get("permit_analysis", {})

    if OPENAI_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            from langchain_core.prompts import ChatPromptTemplate
            llm = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o") or "gpt-4o", temperature=0.2, openai_api_key=OPENAI_API_KEY)
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are a senior industrial safety advisor. Generate 3-5 concise, actionable recommendations for a plant safety team based on the risk assessment data provided. Be specific about what action to take, who should take it, and why."),
                ("human", "Zone: {zone_id}\nRisk Level: {risk_level}\nRisk Score: {risk_score}\nTriggered Rules: {rules}\nSensor Anomalies: {anomaly_count} of {sensor_count}\nPermit Conflicts: {conflict_count}\nWorkers in Danger: {workers_in_danger}\n\nGenerate specific, actionable safety recommendations:"),
            ])
            messages = prompt.format_messages(
                zone_id=zone_id,
                risk_level=risk_level,
                risk_score=risk_score,
                rules="; ".join(f"{r.get('ruleId','')}: {r.get('description','')}" for r in rules),
                anomaly_count=sensor.get("anomaly_count", 0),
                sensor_count=sensor.get("sensor_count", 0),
                conflict_count=permit.get("conflict_count", 0),
                workers_in_danger=state.get("worker_analysis", {}).get("workers_in_danger", 0),
            )
            response = llm.invoke(messages)
            recommendations = [line.strip().lstrip("- ") for line in response.content.split("\n") if line.strip() and not line.strip().startswith("#")]
            return {"recommendations": recommendations[:5]}
        except (ImportError, Exception):
            pass

    recommendations = []
    if risk_level == "CRITICAL":
        recommendations.append("Initiate emergency evacuation of zone immediately")
        recommendations.append("Suspend all active permits in zone and notify permit issuers")
        recommendations.append("Deploy safety team with gas monitoring equipment to zone")
        recommendations.append("Notify plant manager and chief safety officer via all channels")
        recommendations.append(f"Prepare incident report for regulatory notification (OISD-105 / Factory Act)")
    elif risk_level == "HIGH":
        recommendations.append("Increase monitoring frequency to continuous real-time tracking")
        recommendations.append("Review all permits for SIMOPS conflicts and suspend non-essential work")
        recommendations.append("Alert zone supervisor and prepare for possible evacuation")
        recommendations.append(f"Conduct immediate inspection of triggered conditions: {', '.join(r.get('ruleId','') for r in rules)}")
    elif risk_level == "CAUTION":
        recommendations.append("Monitor sensor trends and permit activity in zone")
        recommendations.append("Verify all permit conditions are being met")
        recommendations.append("Ensure workers are aware of elevated conditions")
    else:
        recommendations.append("Continue normal monitoring operations")
        recommendations.append("No immediate action required")
    return {"recommendations": recommendations}


graph = StateGraph(AgentState)
graph.add_node("sensor_analysis", sensor_analysis_agent)
graph.add_node("permit_cross_ref", permit_cross_reference_agent)
graph.add_node("worker_safety", worker_safety_agent)
graph.add_node("synthesizer", compound_risk_synthesizer)
graph.add_node("recommender", recommendation_agent)
graph.set_entry_point("sensor_analysis")
graph.add_edge("sensor_analysis", "permit_cross_ref")
graph.add_edge("permit_cross_ref", "worker_safety")
graph.add_edge("worker_safety", "synthesizer")
graph.add_edge("synthesizer", "recommender")
graph.add_edge("recommender", END)

compiled_graph = graph.compile()


def flatten_assessment(zone_id: str, compound: dict, sensor: dict, permit: dict, worker: dict, recs: list) -> dict:
    return {
        "zone_id": zone_id,
        "risk_score": compound.get("risk_score", 0),
        "risk_level": compound.get("risk_level", "SAFE"),
        "triggered_rules": compound.get("triggered_rules", []),
        "individual_sensors": sensor.get("anomalies", []),
        "recommended_actions": recs,
        "workers_affected": worker.get("workers_in_danger", 0),
        "prediction_horizon": compound.get("prediction_horizon", "> 2 hours"),
        "confidence": compound.get("confidence", 0.85),
        "timestamp": compound.get("timestamp", __import__("datetime").datetime.now().isoformat()),
    }

def run_multi_agent_pipeline(zone_id: str) -> dict:
    initial_state: AgentState = {
        "zone_id": zone_id,
        "sensor_analysis": {},
        "permit_analysis": {},
        "worker_analysis": {},
        "compound_analysis": {},
        "recommendations": [],
    }
    try:
        result = compiled_graph.invoke(initial_state)
        return flatten_assessment(
            zone_id,
            result.get("compound_analysis", {}),
            result.get("sensor_analysis", {}),
            result.get("permit_analysis", {}),
            result.get("worker_analysis", {}),
            result.get("recommendations", []),
        )
    except Exception as e:
        risk = calculate_risk(zone_id)
        return flatten_assessment(
            zone_id,
            risk,
            {},
            {},
            {},
            risk.get("recommendedActions", []),
        )
