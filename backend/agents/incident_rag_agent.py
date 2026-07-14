from data.simulator import HISTORICAL_INCIDENTS, REGULATIONS, get_risk_assessments
from rag.retriever import retriever

def query_incidents(query: str) -> dict:
    rag_results = retriever.retrieve(query, k=10)
    incidents = []
    regs = []
    seen_i = set()
    seen_r = set()
    for r in rag_results:
        meta = r.get("metadata", {})
        t = meta.get("type", "")
        if t == "incident":
            iid = meta.get("incident_id", meta.get("source", ""))
            if iid not in seen_i:
                inc = next((i for i in HISTORICAL_INCIDENTS if i["incident_id"] == iid), None)
                if inc:
                    incidents.append(inc)
                    seen_i.add(iid)
        elif t == "regulation":
            src = meta.get("source", "")
            if src not in seen_r:
                reg = next((r for r in REGULATIONS if f"{r['source']} §{r['section']}" == src), None)
                if reg:
                    regs.append(reg)
                    seen_r.add(src)
    if not incidents:
        lower = query.lower()
        incidents = [i for i in HISTORICAL_INCIDENTS if lower in i["description"].lower() or lower in i["type"].lower() or lower in i["zone"].lower() or any(lower in c.lower() for c in i["root_causes"])][:5]
    if not regs:
        lower = query.lower()
        regs = [r for r in REGULATIONS if lower in r["title"].lower() or lower in r["content"].lower()][:5]
    return {"incidents": incidents[:5], "regulations": regs, "count": len(incidents)}

def query_with_llm(query: str) -> dict:
    qa = retriever.get_qa_chain()
    if qa:
        try:
            result = qa.invoke({"query": query})
            return {
                "answer": result.get("result", ""),
                "source_documents": [
                    {"content": d.page_content, "metadata": d.metadata}
                    for d in result.get("source_documents", [])
                ],
                "count": len(result.get("source_documents", [])),
            }
        except Exception as e:
            return {"answer": f"QA chain error: {e}", "source_documents": [], "count": 0}
    fallback = query_incidents(query)
    return {
        "answer": fallback["incidents"][0]["description"] if fallback["incidents"] else "No relevant incidents found.",
        "source_documents": [
            {"content": i.get("description", ""), "metadata": {"incident_id": i.get("incident_id", ""), "type": "incident"}}
            for i in fallback["incidents"][:3]
        ] + [
            {"content": r.get("content", ""), "metadata": {"source": r.get("source", ""), "type": "regulation"}}
            for r in fallback["regulations"][:3]
        ],
        "count": len(fallback["incidents"]) + len(fallback["regulations"]),
    }

def get_prevention_intelligence() -> dict:
    assessments = get_risk_assessments()
    high = next((a for a in assessments if a["riskScore"] > 60), None)
    if not high:
        return {"active": False, "message": "No elevated risk conditions"}
    has_gas = any(r["ruleId"] in ("RULE_1", "RULE_2", "RULE_6") for r in high.get("triggeredRules", []))
    rag_results = retriever.retrieve_incidents("gas explosion confined space ventilation failure", k=5)
    similar = []
    for r in rag_results:
        meta = r.get("metadata", {})
        iid = meta.get("incident_id", meta.get("source", ""))
        inc = next((i for i in HISTORICAL_INCIDENTS if i["incident_id"] == iid), None)
        if inc:
            similar.append({
                "incident": iid,
                "plant": inc["plant"],
                "date": inc["date"],
                "fatalities": inc["fatalities"],
                "warning_signs_missed": inc["warning_signs_missed"],
                "similarity": 70 + (inc["fatalities"] * 5),
            })
    if not similar and has_gas:
        similar = sorted(
            [i for i in HISTORICAL_INCIDENTS if i["type"] in ("Gas Explosion", "Gas Leak", "Confined Space Asphyxiation")],
            key=lambda x: x["fatalities"], reverse=True
        )[:3]
        similar = [{
            "incident": i["incident_id"], "plant": i["plant"], "date": i["date"],
            "fatalities": i["fatalities"], "warning_signs_missed": i["warning_signs_missed"],
            "similarity": 70 + (i["fatalities"] * 5),
        } for i in similar]
    return {
        "active": True,
        "zone": high["zoneId"],
        "current_risk": high["riskScore"],
        "similar_incidents": similar[:3],
        "recommended_actions": high.get("recommendedActions", []),
    }
