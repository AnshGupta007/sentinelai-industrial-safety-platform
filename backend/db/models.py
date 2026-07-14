from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, Text
from sqlalchemy.sql import func
from db.connection import Base
import uuid

def gen_uuid():
    return str(uuid.uuid4())

class Zone(Base):
    __tablename__ = "zones"
    id = Column(String, primary_key=True, default=gen_uuid)
    zone_id = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    risk_level = Column(String(20), default="LOW")
    risk_score = Column(Integer, default=0)
    description = Column(String(500), default="")
    coordinates = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Sensor(Base):
    __tablename__ = "sensors"
    id = Column(String, primary_key=True, default=gen_uuid)
    sensor_id = Column(String(50), unique=True, nullable=False)
    zone_id = Column(String(20), nullable=False)
    type = Column(String(50), nullable=False)
    unit = Column(String(20), nullable=False)
    current_value = Column(Float, default=0)
    status = Column(String(20), default="NORMAL")
    last_reading = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(String, primary_key=True, default=gen_uuid)
    sensor_id = Column(String(50), nullable=False)
    zone_id = Column(String(20), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(20), default="")
    status = Column(String(20), default="NORMAL")
    timestamp = Column(DateTime, server_default=func.now())

class Permit(Base):
    __tablename__ = "permits"
    id = Column(String, primary_key=True, default=gen_uuid)
    permit_id = Column(String(50), unique=True, nullable=False)
    type = Column(String(30), nullable=False)
    zone_id = Column(String(20), nullable=False)
    authorized_by = Column(String(100))
    workers_involved = Column(JSON, default=list)
    status = Column(String(20), default="ACTIVE")
    conflicts = Column(JSON, default=list)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True, default=gen_uuid)
    alert_id = Column(String(50), unique=True, nullable=False)
    zone_id = Column(String(20), nullable=False)
    severity = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    risk_score = Column(Integer, default=0)
    acknowledged = Column(Boolean, default=False)
    resolved = Column(Boolean, default=False)
    triggered_rules = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True, default=gen_uuid)
    incident_id = Column(String(50), unique=True, nullable=False)
    date = Column(String(20), nullable=False)
    plant = Column(String(200), nullable=False)
    zone = Column(String(100), nullable=False)
    type = Column(String(100), nullable=False)
    fatalities = Column(Integer, default=0)
    injuries = Column(Integer, default=0)
    root_causes = Column(JSON, default=list)
    warning_signs_missed = Column(JSON, default=list)
    regulatory_violations = Column(JSON, default=list)
    prevention_measures = Column(JSON, default=list)
    description = Column(Text)
    similarity = Column(Integer)

class Worker(Base):
    __tablename__ = "workers"
    id = Column(String, primary_key=True, default=gen_uuid)
    worker_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    zone_id = Column(String(20), nullable=False)
    shift = Column(String(20), nullable=False)
    role = Column(String(100), nullable=False)
    location_x = Column(Float, default=0)
    location_y = Column(Float, default=0)
    in_danger_zone = Column(Boolean, default=False)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    id = Column(String, primary_key=True, default=gen_uuid)
    zone_id = Column(String(20), nullable=False)
    risk_score = Column(Integer, default=0)
    risk_level = Column(String(20), default="SAFE")
    triggered_rules = Column(JSON, default=list)
    recommended_actions = Column(JSON, default=list)
    prediction_horizon = Column(String(100), default="")
    confidence = Column(Float, default=0.0)
    timestamp = Column(DateTime, server_default=func.now())
