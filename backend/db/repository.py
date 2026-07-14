from datetime import datetime
from sqlalchemy.orm import Session
from db.models import Zone, Sensor, SensorReading, Permit, Alert, Incident, Worker, RiskAssessment
from db.connection import SessionLocal, init_db

class Repository:
    def __init__(self):
        self._ensure_tables()

    def _ensure_tables(self):
        init_db()

    def _get_session(self):
        return SessionLocal()

    def upsert_zone(self, zone_id: str, name: str, risk_level: str, risk_score: int, coordinates: dict = None):
        session = self._get_session()
        try:
            existing = session.query(Zone).filter(Zone.zone_id == zone_id).first()
            if existing:
                existing.risk_level = risk_level
                existing.risk_score = risk_score
                existing.coordinates = coordinates
            else:
                session.add(Zone(zone_id=zone_id, name=name, risk_level=risk_level, risk_score=risk_score, coordinates=coordinates))
            session.commit()
        finally:
            session.close()

    def upsert_sensor(self, sensor_id: str, zone_id: str, stype: str, unit: str, value: float, status: str):
        session = self._get_session()
        try:
            existing = session.query(Sensor).filter(Sensor.sensor_id == sensor_id).first()
            if existing:
                existing.current_value = value
                existing.status = status
                existing.last_reading = datetime.now()
            else:
                session.add(Sensor(sensor_id=sensor_id, zone_id=zone_id, type=stype, unit=unit, current_value=value, status=status))
            session.commit()
        finally:
            session.close()

    def save_sensor_reading(self, sensor_id: str, zone_id: str, value: float, status: str):
        session = self._get_session()
        try:
            session.add(SensorReading(sensor_id=sensor_id, zone_id=zone_id, value=value, status=status))
            session.commit()
        finally:
            session.close()

    def batch_save_sensor_readings(self, readings: list):
        session = self._get_session()
        try:
            for r in readings:
                session.add(SensorReading(sensor_id=r["sensor_id"], zone_id=r["zone_id"], value=r["value"], status=r["status"]))
            session.commit()
        finally:
            session.close()

    def _parse_dt(self, val):
        if val is None or isinstance(val, datetime):
            return val
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None

    def upsert_permit(self, permit_id: str, ptype: str, zone_id: str, authorized_by: str, workers_involved: list, status: str, conflicts: list, start_time: str, end_time: str):
        session = self._get_session()
        try:
            existing = session.query(Permit).filter(Permit.permit_id == permit_id).first()
            data = dict(type=ptype, zone_id=zone_id, authorized_by=authorized_by, workers_involved=workers_involved, status=status, conflicts=conflicts)
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
            else:
                session.add(Permit(permit_id=permit_id, **data, start_time=self._parse_dt(start_time), end_time=self._parse_dt(end_time)))
            session.commit()
        finally:
            session.close()

    def batch_upsert_permits(self, permits: list):
        session = self._get_session()
        try:
            for p in permits:
                existing = session.query(Permit).filter(Permit.permit_id == p["permitId"]).first()
                data = dict(type=p["type"], zone_id=p["zoneId"], authorized_by=p.get("authorizedBy", ""), workers_involved=p.get("workersInvolved", []), status=p.get("status", "ACTIVE"), conflicts=p.get("conflicts", []))
                if existing:
                    for k, v in data.items():
                        setattr(existing, k, v)
                else:
                    session.add(Permit(permit_id=p["permitId"], start_time=self._parse_dt(p.get("startTime")), end_time=self._parse_dt(p.get("endTime")), **data))
            session.commit()
        finally:
            session.close()

    def save_alert(self, alert_id: str, zone_id: str, severity: str, title: str, description: str, risk_score: int, triggered_rules: list):
        session = self._get_session()
        try:
            existing = session.query(Alert).filter(Alert.alert_id == alert_id).first()
            if not existing:
                session.add(Alert(alert_id=alert_id, zone_id=zone_id, severity=severity, title=title, description=description, risk_score=risk_score, triggered_rules=triggered_rules))
                session.commit()
        finally:
            session.close()

    def update_alert(self, alert_id: str, acknowledged: bool = None, resolved: bool = None):
        session = self._get_session()
        try:
            existing = session.query(Alert).filter(Alert.alert_id == alert_id).first()
            if existing:
                if acknowledged is not None:
                    existing.acknowledged = acknowledged
                if resolved is not None:
                    existing.resolved = resolved
                session.commit()
        finally:
            session.close()

    def upsert_worker(self, worker_id: str, name: str, zone_id: str, shift: str, role: str, location_x: float, location_y: float, in_danger: bool):
        session = self._get_session()
        try:
            existing = session.query(Worker).filter(Worker.worker_id == worker_id).first()
            data = dict(name=name, zone_id=zone_id, shift=shift, role=role, location_x=location_x, location_y=location_y, in_danger_zone=in_danger)
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
            else:
                session.add(Worker(worker_id=worker_id, **data))
            session.commit()
        finally:
            session.close()

    def batch_upsert_workers(self, workers: list):
        session = self._get_session()
        try:
            for w in workers:
                existing = session.query(Worker).filter(Worker.worker_id == w["workerId"]).first()
                data = dict(name=w["name"], zone_id=w["zoneId"], shift=w.get("shift", "B"), role=w.get("role", ""), location_x=w.get("locationX", 0), location_y=w.get("locationY", 0), in_danger_zone=w.get("inDangerZone", False))
                if existing:
                    for k, v in data.items():
                        setattr(existing, k, v)
                else:
                    session.add(Worker(worker_id=w["workerId"], **data))
            session.commit()
        finally:
            session.close()

    def save_risk_assessment(self, zone_id: str, risk_score: int, risk_level: str, triggered_rules: list, recommended_actions: list, prediction_horizon: str, confidence: float):
        session = self._get_session()
        try:
            session.add(RiskAssessment(zone_id=zone_id, risk_score=risk_score, risk_level=risk_level, triggered_rules=triggered_rules, recommended_actions=recommended_actions, prediction_horizon=prediction_horizon, confidence=confidence))
            session.commit()
        finally:
            session.close()

    def get_risk_history(self, zone_id: str, limit: int = 100):
        session = self._get_session()
        try:
            rows = session.query(RiskAssessment).filter(RiskAssessment.zone_id == zone_id).order_by(RiskAssessment.timestamp.desc()).limit(limit).all()
            return [{"zoneId": r.zone_id, "riskScore": r.risk_score, "riskLevel": r.risk_level, "timestamp": r.timestamp.isoformat() if r.timestamp else ""} for r in rows]
        finally:
            session.close()

    def get_sensor_readings(self, sensor_id: str, limit: int = 200):
        session = self._get_session()
        try:
            rows = session.query(SensorReading).filter(SensorReading.sensor_id == sensor_id).order_by(SensorReading.timestamp.desc()).limit(limit).all()
            return [{"sensorId": r.sensor_id, "value": r.value, "status": r.status, "timestamp": r.timestamp.isoformat() if r.timestamp else ""} for r in rows]
        finally:
            session.close()

    def get_zone_readings(self, zone_id: str, limit: int = 100):
        session = self._get_session()
        try:
            rows = session.query(SensorReading).filter(SensorReading.zone_id == zone_id).order_by(SensorReading.timestamp.desc()).limit(limit).all()
            result = {}
            for r in rows:
                sid = r.sensor_id
                if sid not in result:
                    result[sid] = []
                result[sid].append({"timestamp": r.timestamp.isoformat() if r.timestamp else "", "value": r.value})
            return result
        finally:
            session.close()

    def get_all_incidents(self):
        session = self._get_session()
        try:
            return [{"incident_id": r.incident_id, "date": r.date, "plant": r.plant, "zone": r.zone, "type": r.type, "fatalities": r.fatalities, "injuries": r.injuries, "root_causes": r.root_causes, "warning_signs_missed": r.warning_signs_missed, "regulatory_violations": r.regulatory_violations, "prevention_measures": r.prevention_measures, "description": r.description} for r in session.query(Incident).all()]
        finally:
            session.close()

    def load_incidents(self, incidents: list):
        session = self._get_session()
        try:
            for i in incidents:
                existing = session.query(Incident).filter(Incident.incident_id == i["incident_id"]).first()
                if not existing:
                    session.add(Incident(incident_id=i["incident_id"], date=i["date"], plant=i["plant"], zone=i["zone"], type=i["type"], fatalities=i["fatalities"], injuries=i["injuries"], root_causes=i.get("root_causes", []), warning_signs_missed=i.get("warning_signs_missed", []), regulatory_violations=i.get("regulatory_violations", []), prevention_measures=i.get("prevention_measures", []), description=i.get("description", "")))
            session.commit()
        finally:
            session.close()

    def clear_all(self):
        session = self._get_session()
        try:
            for table in [SensorReading, RiskAssessment, Alert, Permit, Worker, Sensor, Zone]:
                session.query(table).delete()
            session.commit()
        finally:
            session.close()

repo = Repository()
