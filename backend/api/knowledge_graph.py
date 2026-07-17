from fastapi import APIRouter, Query
from knowledge_graph.graph import get_or_create_graph

router = APIRouter()

@router.get("/status")
async def kg_status():
    kg = get_or_create_graph()
    return {
        "data": {
            "built": kg.built,
            "node_count": kg.graph.number_of_nodes(),
            "edge_count": kg.graph.number_of_edges(),
        },
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.get("/query")
async def kg_query(
    q: str = Query(..., description="Natural language query"),
):
    kg = get_or_create_graph()
    result = kg.query(q)
    return {
        "data": result,
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.get("/graph")
async def kg_graph():
    kg = get_or_create_graph()
    return {
        "data": kg.get_graph_data(),
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.get("/zone/{zone_id}")
async def kg_zone(zone_id: str):
    kg = get_or_create_graph()
    return {
        "data": kg.get_zone_graph(zone_id),
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.get("/incidents/similar")
async def kg_similar_incidents(
    zone_id: str = Query("ZONE_A"),
    gases: str = Query("", description="Comma-separated gas types"),
    permits: str = Query("", description="Comma-separated permit types"),
):
    kg = get_or_create_graph()
    gas_list = [g.strip() for g in gases.split(",") if g.strip()] if gases else None
    permit_list = [p.strip() for p in permits.split(",") if p.strip()] if permits else None
    result = kg.get_incidents_by_conditions(zone_id, gas_list, permit_list)
    return {
        "data": result,
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.get("/regulations")
async def kg_regulations(
    zone_id: str = Query("ZONE_A"),
    gases: str = Query("", description="Comma-separated gas types"),
    permits: str = Query("", description="Comma-separated permit types"),
):
    kg = get_or_create_graph()
    gas_list = [g.strip() for g in gases.split(",") if g.strip()] if gases else None
    permit_list = [p.strip() for p in permits.split(",") if p.strip()] if permits else None
    result = kg.get_regulations_for_conditions(zone_id, gas_list, permit_list)
    return {
        "data": result,
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.get("/patterns")
async def kg_patterns(incident_type: str = Query("", description="Filter by incident type")):
    kg = get_or_create_graph()
    result = kg.get_root_cause_patterns(incident_type if incident_type else None)
    return {
        "data": result,
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.get("/prevention-intelligence")
async def kg_prevention_intelligence(zone_id: str = Query("", description="Zone ID")):
    kg = get_or_create_graph()
    result = kg.get_prevention_intelligence(zone_id if zone_id else None)
    return {
        "data": result,
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.post("/build")
async def kg_build():
    kg = get_or_create_graph()
    kg.build()
    return {
        "data": {
            "success": True,
            "node_count": kg.graph.number_of_nodes(),
            "edge_count": kg.graph.number_of_edges(),
        },
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }
