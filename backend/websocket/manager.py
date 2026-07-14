from fastapi import WebSocket
from typing import List
import json
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        try:
            from redis.client import redis_client
            pending = redis_client.get_pending_alerts(5)
            for alert in pending:
                await websocket.send_text(json.dumps({"event": "alert_new", "data": alert, "timestamp": datetime.now().isoformat()}))
        except Exception:
            pass

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: dict):
        message = json.dumps({"event": event_type, "data": data, "timestamp": datetime.now().isoformat()})
        dead = []
        for conn in self.active_connections:
            try:
                await conn.send_text(message)
            except Exception:
                dead.append(conn)
        for conn in dead:
            self.disconnect(conn)
        try:
            from redis.client import redis_client, CHANNEL_ALERTS, CHANNEL_RISK, CHANNEL_SENSORS, CHANNEL_PERMITS, CHANNEL_EMERGENCY
            channel_map = {
                "alert_new": CHANNEL_ALERTS,
                "risk_update": CHANNEL_RISK,
                "sensor_update": CHANNEL_SENSORS,
                "permit_flagged": CHANNEL_PERMITS,
                "emergency_triggered": CHANNEL_EMERGENCY,
            }
            channel = channel_map.get(event_type)
            if channel:
                redis_client.publish(channel, {"event": event_type, **data})
        except Exception:
            pass

async def broadcast_sensor_update(manager: ConnectionManager, zone_id: str, sensor_id: str, value: float, timestamp: str):
    await manager.broadcast("sensor_update", {"zone_id": zone_id, "sensor_id": sensor_id, "value": value, "timestamp": timestamp})

async def broadcast_risk_update(manager: ConnectionManager, zone_id: str, score: int, level: str):
    await manager.broadcast("risk_update", {"zone_id": zone_id, "score": score, "level": level})

async def broadcast_alert(manager: ConnectionManager, alert: dict):
    await manager.broadcast("alert_new", alert)

async def broadcast_permit_flagged(manager: ConnectionManager, permit: dict):
    await manager.broadcast("permit_flagged", permit)

async def broadcast_emergency(manager: ConnectionManager, emergency: dict):
    await manager.broadcast("emergency_triggered", emergency)
