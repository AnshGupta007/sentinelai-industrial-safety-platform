from fastapi import APIRouter
from data.simulator import HISTORICAL_INCIDENTS, REGULATIONS, get_risk_assessments
from agents.incident_rag_agent import query_incidents, query_with_llm, get_prevention_intelligence
from rag.retriever import retriever

router = APIRouter()

@router.get("")
async def incidents_all(similar: str = None, patterns: str = None):
    if similar == "true":
        assessments = get_risk_assessments()
        high = next((a for a in assessments if a["riskScore"] > 50), None)
        if high:
            has_gas = any(r["ruleId"] in ("RULE_1", "RULE_2", "RULE_6") for r in high.get("triggeredRules", []))
            filtered = [i for i in HISTORICAL_INCIDENTS if has_gas and (i["type"] in ("Gas Explosion", "Gas Leak", "Explosion", "Confined Space Asphyxiation"))]
            if not filtered: filtered = HISTORICAL_INCIDENTS
            result = [{**i, "similarity": __import__("random").randint(60, 90)} for i in filtered]
            result.sort(key=lambda x: x["similarity"], reverse=True)
            return {"data": result[:5], "timestamp": __import__("datetime").datetime.now().isoformat()}
    if patterns == "true":
        counts = {}
        for i in HISTORICAL_INCIDENTS:
            counts[i["type"]] = counts.get(i["type"], 0) + 1
        return {"data": {"typeCounts": counts, "totalIncidents": len(HISTORICAL_INCIDENTS), "totalFatalities": sum(i["fatalities"] for i in HISTORICAL_INCIDENTS)}, "timestamp": __import__("datetime").datetime.now().isoformat()}
    return {"data": HISTORICAL_INCIDENTS, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/query")
async def incidents_query(body: dict):
    query = body.get("query", "").lower()
    rag_results = retriever.retrieve(query, k=8)
    incidents = []
    regulations = []
    seen_ids = set()
    for r in rag_results:
        meta = r.get("metadata", {})
        t = meta.get("type", "")
        if t == "incident":
            iid = meta.get("incident_id", meta.get("source", ""))
            if iid not in seen_ids:
                incidents.append({"incident_id": iid, "content": r["content"], "score": r.get("score", 0)})
                seen_ids.add(iid)
        elif t == "regulation":
            regulations.append({"source": meta.get("source", ""), "title": meta.get("title", ""), "content": r["content"], "score": r.get("score", 0)})
    return {"data": {
        "incidents": incidents[:5],
        "regulations": regulations[:5],
        "summary": f"Found {len(incidents)} related incidents and {len(regulations)} relevant regulations.",
    }, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.post("/agent-query")
async def incidents_agent_query(body: dict):
    query = body.get("query", "")
    result = query_with_llm(query)
    return {"data": result, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/patterns")
async def incident_patterns():
    counts = {}
    for i in HISTORICAL_INCIDENTS:
        counts[i["type"]] = counts.get(i["type"], 0) + 1
    return {"data": {"typeCounts": counts, "totalIncidents": len(HISTORICAL_INCIDENTS), "totalFatalities": sum(i["fatalities"] for i in HISTORICAL_INCIDENTS)}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@router.get("/similar")
async def incident_similar():
    return await incidents_all(similar="true")

@router.get("/intelligence")
async def incident_intelligence():
    result = get_prevention_intelligence()
    return {"data": result, "timestamp": __import__("datetime").datetime.now().isoformat()}
