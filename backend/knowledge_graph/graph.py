import networkx as nx
from typing import Dict, List, Optional, Any
from datetime import datetime

from utils.logger import setup_logger

logger = setup_logger("knowledge_graph")

class SafetyKnowledgeGraph:
    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.built = False

    def build(self):
        if self.built:
            return
        try:
            from data.simulator import HISTORICAL_INCIDENTS, REGULATIONS, ZONE_CONFIG, SENSOR_TYPES, WORKER_NAMES, ROLES, WORKER_PER_ZONE
            self._add_zones(ZONE_CONFIG)
            self._add_sensors(ZONE_CONFIG, SENSOR_TYPES)
            self._add_incidents(HISTORICAL_INCIDENTS)
            self._add_regulations(REGULATIONS)
            self._add_equipment(ZONE_CONFIG)
            self._add_workers(ZONE_CONFIG, WORKER_NAMES, ROLES, WORKER_PER_ZONE)
            self._add_cross_references()
            self.built = True
            logger.info(f"Knowledge graph built: {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges")
        except Exception as e:
            logger.warning(f"Knowledge graph build failed: {e}")

    def _add_zones(self, zone_config):
        for z in zone_config:
            self.graph.add_node(
                z["zoneId"],
                type="zone",
                name=z["name"],
                riskLevel=z.get("riskLevel", "MEDIUM"),
                coordinates={"x": z["x"], "y": z["y"], "width": z["width"], "height": z["height"]},
            )

    def _add_sensors(self, zone_config, sensor_types):
        for z in zone_config:
            for stype in sensor_types:
                sid = f"{z['zoneId']}_{stype}"
                self.graph.add_node(
                    sid,
                    type="sensor",
                    sensorType=stype,
                    zoneId=z["zoneId"],
                )
                self.graph.add_edge(z["zoneId"], sid, relationship="HAS_SENSOR")

    def _add_incidents(self, incidents):
        for inc in incidents:
            self.graph.add_node(
                inc["incident_id"],
                type="incident",
                date=inc["date"],
                plant=inc["plant"],
                zone=inc["zone"],
                incidentType=inc["type"],
                fatalities=inc["fatalities"],
                injuries=inc["injuries"],
                description=inc["description"],
            )
            for rc in inc["root_causes"]:
                rc_id = f"RC_{inc['incident_id']}_{hash(rc) % 10000}"
                self.graph.add_node(rc_id, type="root_cause", text=rc)
                self.graph.add_edge(inc["incident_id"], rc_id, relationship="HAS_ROOT_CAUSE")
            for ws in inc["warning_signs_missed"]:
                ws_id = f"WS_{inc['incident_id']}_{hash(ws) % 10000}"
                self.graph.add_node(ws_id, type="warning_sign", text=ws)
                self.graph.add_edge(inc["incident_id"], ws_id, relationship="HAD_WARNING_SIGN")
            for pm in inc["prevention_measures"]:
                pm_id = f"PM_{inc['incident_id']}_{hash(pm) % 10000}"
                self.graph.add_node(pm_id, type="prevention_measure", text=pm)
                self.graph.add_edge(inc["incident_id"], pm_id, relationship="HAS_PREVENTION")
            for rv in inc["regulatory_violations"]:
                rv_id = f"RV_{inc['incident_id']}_{hash(rv) % 10000}"
                self.graph.add_node(rv_id, type="violation", text=rv)
                self.graph.add_edge(inc["incident_id"], rv_id, relationship="VIOLATES_REGULATION")

    def _add_regulations(self, regulations):
        for reg in regulations:
            rid = f"{reg['source']}§{reg['section']}"
            self.graph.add_node(
                rid,
                type="regulation",
                source=reg["source"],
                section=reg["section"],
                title=reg["title"],
                content=reg["content"],
            )

    def _add_equipment(self, zone_config):
        equipment_map = {
            "ZONE_A": ["Coke Oven Battery", "Gas Collection Main", "Pusher Machine", "Quenching Car"],
            "ZONE_B": ["Blast Furnace", "Stove System", "Cast House", "Slag Granulation"],
            "ZONE_C": ["Gas Processing Unit", "Scrubber", "Compressor Station", "Flare Stack"],
            "ZONE_D": ["Control Panels", "PLC Racks", "UPS System", "Server Room"],
            "ZONE_E": ["Crane", "Welding Equipment", "Machine Tools", "Test Bench"],
            "ZONE_F": ["Storage Silo", "Conveyor Belt", "Stacker Reclaimer", "Weigh Bridge"],
        }
        for zone in zone_config:
            equip_list = equipment_map.get(zone["zoneId"], [])
            for eq in equip_list:
                eq_id = f"EQ_{zone['zoneId']}_{eq.replace(' ', '_').upper()}"
                self.graph.add_node(eq_id, type="equipment", name=eq, zoneId=zone["zoneId"])
                self.graph.add_edge(zone["zoneId"], eq_id, relationship="HAS_EQUIPMENT")

    def _add_workers(self, zone_config, worker_names, roles, worker_per_zone):
        w_idx = 0
        import random
        for zone in zone_config:
            count = worker_per_zone.get(zone["zoneId"], 5)
            for i in range(count):
                if w_idx >= 50:
                    break
                wid = f"W{str(w_idx+1).zfill(3)}"
                self.graph.add_node(
                    wid,
                    type="worker",
                    name=worker_names[w_idx],
                    role=roles[w_idx % len(roles)],
                    zoneId=zone["zoneId"],
                )
                self.graph.add_edge(wid, zone["zoneId"], relationship="ASSIGNED_TO")
                w_idx += 1

    def _add_cross_references(self):
        incident_nodes = [(n, d) for n, d in self.graph.nodes(data=True) if d.get("type") == "incident"]
        regulation_nodes = [n for n, d in self.graph.nodes(data=True) if d.get("type") == "regulation"]

        zone_map = {"COKE_OVEN_BATTERY": "ZONE_A", "BLAST_FURNACE": "ZONE_B", "GAS_PROCESSING": "ZONE_C", "CONTROL_ROOM": "ZONE_D", "MAINTENANCE_WORKSHOP": "ZONE_E", "RAW_MATERIAL_STORAGE": "ZONE_F"}
        for node, data in incident_nodes:
            inc_type = data.get("incidentType", "")
            zone_name = data.get("zone", "").upper().replace(" ", "_")
            matched_zone = None
            for key, zid in zone_map.items():
                if key in zone_name or zone_name in key:
                    matched_zone = zid
                    break
            if matched_zone:
                self.graph.add_edge(matched_zone, node, relationship="EXPERIENCED")
            permit_types = []
            if "confined" in inc_type.lower() or "asphyxiation" in inc_type.lower():
                permit_types.append("CONFINED_SPACE")
            if "explosion" in inc_type.lower() or "fire" in inc_type.lower():
                permit_types.append("HOT_WORK")
            if "electrical" in inc_type.lower():
                permit_types.append("ELECTRICAL")
            if "fall" in inc_type.lower():
                permit_types.append("HEIGHT")
            for pt in permit_types:
                pt_node = f"PERMIT_TYPE_{pt}"
                if not self.graph.has_node(pt_node):
                    self.graph.add_node(pt_node, type="permit_type", permitType=pt)
                self.graph.add_edge(pt_node, node, relationship="LINKED_TO_INCIDENT")
            for rc_node in self.graph.successors(node):
                rc_data = self.graph.nodes[rc_node]
                if rc_data.get("type") == "root_cause":
                    for reg_node in regulation_nodes:
                        reg_data = self.graph.nodes[reg_node]
                        rc_text = rc_data.get("text", "").lower()
                        if any(word in rc_text for word in reg_data.get("title", "").lower().split()):
                            self.graph.add_edge(rc_node, reg_node, relationship="VIOLATES")

    def get_incidents_by_conditions(self, zone_id: str, elevated_gases: Optional[List[str]] = None, active_permits: Optional[List[str]] = None) -> List[Dict]:
        matches = []
        current_zone_name = ""
        for n, d in self.graph.nodes(data=True):
            if n == zone_id:
                current_zone_name = d.get("name", "").lower()
                break
        for n, d in self.graph.nodes(data=True):
            if d.get("type") != "incident":
                continue
            score = 0
            reasons = []
            inc_zone = d.get("zone", "").lower()
            if current_zone_name and (current_zone_name in inc_zone or inc_zone in current_zone_name):
                score += 30
                reasons.append("same zone")
            if elevated_gases:
                rc_texts = []
                for succ in self.graph.successors(n):
                    sd = self.graph.nodes[succ]
                    if sd.get("type") == "root_cause":
                        rc_texts.append(sd.get("text", "").lower())
                all_rc = " ".join(rc_texts)
                for gas in elevated_gases:
                    if gas.lower() in all_rc:
                        score += 15
                        reasons.append(f"related to {gas}")
                        break
            if active_permits:
                rc_texts = []
                for succ in self.graph.successors(n):
                    sd = self.graph.nodes[succ]
                    if sd.get("type") == "root_cause":
                        rc_texts.append(sd.get("text", "").lower())
                all_rc = " ".join(rc_texts)
                for apt in active_permits:
                    if apt.lower().replace("_", " ") in all_rc:
                        score += 15
                        reasons.append(f"involved {apt}")
                        break
            if score > 0:
                warning_signs = []
                for succ in self.graph.successors(n):
                    sd = self.graph.nodes[succ]
                    if sd.get("type") == "warning_sign":
                        warning_signs.append(sd.get("text", ""))
                prevention = []
                for succ in self.graph.successors(n):
                    sd = self.graph.nodes[succ]
                    if sd.get("type") == "prevention_measure":
                        prevention.append(sd.get("text", ""))
                matches.append({
                    "incident_id": n,
                    "plant": d.get("plant", ""),
                    "zone": d.get("zone", ""),
                    "type": d.get("incidentType", ""),
                    "date": d.get("date", ""),
                    "fatalities": d.get("fatalities", 0),
                    "injuries": d.get("injuries", 0),
                    "description": d.get("description", ""),
                    "similarity_score": min(100, score + d.get("fatalities", 0) * 3),
                    "matching_reasons": reasons,
                    "warning_signs_missed": warning_signs,
                    "prevention_measures": prevention,
                })
        matches.sort(key=lambda x: x["similarity_score"], reverse=True)
        return matches[:5]

    def get_regulations_for_conditions(self, zone_id: str, elevated_gases: Optional[List[str]] = None, active_permits: Optional[List[str]] = None) -> List[Dict]:
        applicable = []
        for n, d in self.graph.nodes(data=True):
            if d.get("type") != "regulation":
                continue
            content = d.get("content", "").lower()
            title = d.get("title", "").lower()
            score = 0
            reasons = []
            if elevated_gases:
                for gas in elevated_gases:
                    if gas.lower() in content or gas.lower() in title:
                        score += 20
                        reasons.append(f"covers {gas}")
            if active_permits:
                for apt in active_permits:
                    apt_lower = apt.lower().replace("_", " ")
                    if apt_lower in content or apt_lower in title:
                        score += 20
                        reasons.append(f"regulates {apt}")
            if "confined" in content and active_permits and "CONFINED_SPACE" in active_permits:
                score += 30
                reasons.append("confined space regulations")
            if "ventilation" in content:
                score += 10
                reasons.append("ventilation requirements")
            if score > 0:
                applicable.append({
                    "regulation_id": n,
                    "source": d.get("source", ""),
                    "section": d.get("section", ""),
                    "title": d.get("title", ""),
                    "content": d.get("content", ""),
                    "relevance_score": min(100, score),
                    "reasons": reasons,
                })
        applicable.sort(key=lambda x: x["relevance_score"], reverse=True)
        return applicable

    def get_root_cause_patterns(self, incident_type: Optional[str] = None) -> Dict:
        cause_counts = {}
        warning_counts = {}
        zone_counts = {}
        total = 0
        for n, d in self.graph.nodes(data=True):
            if d.get("type") != "incident":
                continue
            if incident_type and incident_type.lower() not in d.get("incidentType", "").lower():
                continue
            total += 1
            zone_name = d.get("zone", "")
            zone_counts[zone_name] = zone_counts.get(zone_name, 0) + 1
            for succ in self.graph.successors(n):
                sd = self.graph.nodes[succ]
                if sd.get("type") == "root_cause":
                    text = sd.get("text", "")
                    simplified = self._simplify_cause(text)
                    cause_counts[simplified] = cause_counts.get(simplified, 0) + 1
                if sd.get("type") == "warning_sign":
                    text = sd.get("text", "")
                    simplified = self._simplify_cause(text)
                    warning_counts[simplified] = warning_counts.get(simplified, 0) + 1
        total_causes = sum(cause_counts.values()) if cause_counts else 1
        total_warnings = sum(warning_counts.values()) if warning_counts else 1
        return {
            "total_incidents": total,
            "root_cause_patterns": [{"cause": k, "count": v, "percentage": round(v / total_causes * 100) if total_causes > 0 else 0} for k, v in sorted(cause_counts.items(), key=lambda x: x[1], reverse=True)[:10]],
            "warning_sign_patterns": [{"sign": k, "count": v, "percentage": round(v / total_warnings * 100) if total_warnings > 0 else 0} for k, v in sorted(warning_counts.items(), key=lambda x: x[1], reverse=True)[:10]],
            "zone_distribution": [{"zone": k, "count": v} for k, v in sorted(zone_counts.items(), key=lambda x: x[1], reverse=True)],
        }

    def _simplify_cause(self, text: str) -> str:
        text = text.lower()
        patterns = [
            ("gas", "Gas-related issues"),
            ("sensor", "Sensor/detection failures"),
            ("permit", "Permit-to-work failures"),
            ("ventilation", "Ventilation failures"),
            ("inspection", "Inspection/maintenance overdue"),
            ("ppe", "PPE non-compliance"),
            ("electrical", "Electrical safety failures"),
            ("corrosion", "Corrosion/equipment degradation"),
            ("monitoring", "Monitoring/surveillance gaps"),
            ("training", "Training/knowledge gaps"),
        ]
        for keyword, category in patterns:
            if keyword in text:
                return category
        return "Other operational failures"

    def get_graph_data(self) -> Dict:
        nodes = []
        edges = []
        for n, d in self.graph.nodes(data=True):
            node_type = d.get("type", "unknown")
            label = n
            if node_type == "zone":
                label = d.get("name", n)
            elif node_type == "incident":
                label = f"{d.get('incidentType', '')} ({n})"
            elif node_type == "regulation":
                label = d.get("title", n)[:40]
            elif node_type == "root_cause":
                label = d.get("text", n)[:40]
            elif node_type == "warning_sign":
                label = d.get("text", n)[:40]
            elif node_type == "prevention_measure":
                label = d.get("text", n)[:40]
            elif node_type == "equipment":
                label = d.get("name", n)
            elif node_type == "sensor":
                label = n
            elif node_type == "worker":
                label = d.get("name", n)
            nodes.append({"id": n, "label": label, "type": node_type})
        for u, v, k, d in self.graph.edges(data=True, keys=True):
            edges.append({"source": u, "target": v, "relationship": d.get("relationship", "RELATED_TO")})
        return {"nodes": nodes, "edges": edges}

    def get_zone_graph(self, zone_id: str) -> Dict:
        sub_nodes = set()
        sub_edges = []
        if self.graph.has_node(zone_id):
            sub_nodes.add(zone_id)
            for neighbor in self.graph.neighbors(zone_id):
                sub_nodes.add(neighbor)
                for n2 in self.graph.neighbors(neighbor):
                    if self.graph.has_edge(neighbor, n2) or self.graph.has_edge(n2, neighbor):
                        sub_nodes.add(n2)
                        sub_edges.append({"source": neighbor, "target": n2, "relationship": "RELATED"})
                sub_edges.append({"source": zone_id, "target": neighbor, "relationship": "CONNECTED"})
        node_list = []
        for n in sub_nodes:
            d = self.graph.nodes[n]
            node_list.append({"id": n, "label": n, "type": d.get("type", "unknown"), "data": dict(d)})
        return {"nodes": node_list, "edges": sub_edges}

    def query(self, natural_query: str) -> Dict:
        lower = natural_query.lower()
        result = {"query": natural_query, "interpretation": "", "findings": [], "regulations": [], "recommendations": []}
        zone_map = {"zone a": "ZONE_A", "zone b": "ZONE_B", "zone c": "ZONE_C", "zone d": "ZONE_D", "zone e": "ZONE_E", "zone f": "ZONE_F", "coke oven": "ZONE_A", "blast furnace": "ZONE_B", "gas processing": "ZONE_C", "control room": "ZONE_D", "maintenance": "ZONE_E", "raw material": "ZONE_F"}
        detected_gases = ["CO", "CH4", "H2S"] if any(g in lower for g in ["gas", "co", "ch4", "h2s", "methane", "carbon monoxide", "hydrogen sulfide"]) else []
        detected_permits = []
        if "confined" in lower:
            detected_permits.append("CONFINED_SPACE")
        if "hot work" in lower or "welding" in lower:
            detected_permits.append("HOT_WORK")
        if "electrical" in lower:
            detected_permits.append("ELECTRICAL")
        if "height" in lower or "fall" in lower:
            detected_permits.append("HEIGHT")
        zone_id = None
        for key, zid in zone_map.items():
            if key in lower:
                zone_id = zid
                break
        if "incident" in lower or "similar" in lower or "pattern" in lower or "past" in lower or "happen" in lower:
            result["interpretation"] = "Searching for similar historical incidents"
            zone_ctx = zone_id or "ZONE_A"
            incidents = self.get_incidents_by_conditions(zone_ctx, detected_gases, detected_permits)
            result["findings"] = incidents
            if incidents:
                total_fatalities = sum(i["fatalities"] for i in incidents)
                result["recommendations"].append(f"{len(incidents)} similar past incidents found with {total_fatalities} total fatalities — immediate preventive action recommended")
        if "regulation" in lower or "compliance" in lower or "legal" in lower or "oisd" in lower or "factory act" in lower:
            result["interpretation"] = "Retrieving applicable regulations"
            zone_ctx = zone_id or "ZONE_A"
            regs = self.get_regulations_for_conditions(zone_ctx, detected_gases, detected_permits)
            result["regulations"] = regs
        if "prevent" in lower or "recommend" in lower or "measure" in lower or "action" in lower:
            result["interpretation"] = "Analyzing prevention measures from past incidents"
            incidents = self.get_incidents_by_conditions(zone_id or "ZONE_A", detected_gases, detected_permits)
            all_preventions = set()
            for inc in incidents:
                for pm in inc.get("prevention_measures", []):
                    all_preventions.add(pm)
            result["recommendations"] = list(all_preventions)[:5]
        if not result["interpretation"]:
            result["interpretation"] = "General knowledge graph traversal"
            result["findings"] = self.get_incidents_by_conditions(zone_id or "ZONE_A", detected_gases, detected_permits)
        return result

    def get_prevention_intelligence(self, zone_id: str = None) -> Dict:
        try:
            from data.simulator import get_current_sensors, get_permits, get_risk_assessments
        except ImportError:
            return {"active": False}
        risk_assessments = get_risk_assessments()
        high_risk = None
        if isinstance(risk_assessments, dict):
            for zid, a in risk_assessments.items():
                if a.get("riskScore", 0) > 50:
                    high_risk = {"zone_id": zid, **a}
                    break
        elif isinstance(risk_assessments, list):
            high_risk = next((a for a in risk_assessments if a.get("riskScore", 0) > 50), None)
        if not high_risk and zone_id:
            high_risk = {"zone_id": zone_id, "riskScore": 0}
        if not high_risk:
            return {"active": False, "message": "No elevated risk conditions"}
        target_zone = zone_id or high_risk.get("zone_id", "ZONE_A")
        sensors = get_current_sensors()
        zone_sensors = [s for s in sensors if s["zoneId"] == target_zone]
        elevated_gases = [s["type"] for s in zone_sensors if s["status"] != "NORMAL" and s["type"] in ("CO", "H2S", "CH4")]
        permits = get_permits()
        zone_permits = [p for p in permits if p["zoneId"] == target_zone and p["status"] not in ("SUSPENDED", "COMPLETED")]
        active_permit_types = list(set(p["type"] for p in zone_permits))
        similar = self.get_incidents_by_conditions(target_zone, elevated_gases, active_permit_types)
        regs = self.get_regulations_for_conditions(target_zone, elevated_gases, active_permit_types)
        return {
            "active": True,
            "zone": target_zone,
            "current_risk": high_risk.get("riskScore", 0),
            "similar_incidents": similar[:3],
            "applicable_regulations": regs[:3],
            "recommendations": [r for inc in similar[:3] for r in inc.get("prevention_measures", [])][:5],
        }


knowledge_graph = SafetyKnowledgeGraph()


def get_or_create_graph():
    if not knowledge_graph.built:
        knowledge_graph.build()
    return knowledge_graph
