from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import os

from api.sensors import router as sensors_router
from api.alerts import router as alerts_router
from api.permits import router as permits_router
from api.risk import router as risk_router
from api.incidents import router as incidents_router
from api.copilot import router as copilot_router
from api.workers import router as workers_router
from api.emergency import router as emergency_router
from websocket.manager import ConnectionManager, broadcast_sensor_update, broadcast_risk_update, broadcast_alert, broadcast_permit_flagged, broadcast_emergency
from data.simulator import simulate_loop
from utils.logger import setup_logger

logger = setup_logger("sentinelai")

manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SentinelAI backend starting...")
    try:
        from db.connection import init_db
        init_db()
        logger.info("Database tables initialized")
    except Exception as e:
        logger.warning(f"Database init skipped: {e}")
    task = asyncio.create_task(simulate_loop(manager))
    try:
        from rag.retriever import retriever
        if retriever.initialize():
            populated = retriever.is_populated()
            if not populated:
                n = retriever.populate()
                logger.info(f"RAG initialized: {n} chunks added")
            else:
                logger.info(f"RAG already populated ({retriever.collection.count()} chunks)")
        else:
            logger.warning("ChromaDB unavailable — RAG disabled")
    except Exception as e:
        logger.warning(f"RAG init skipped: {e}")
    yield
    task.cancel()
    logger.info("SentinelAI backend shutting down...")

app = FastAPI(title="SentinelAI Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sensors_router, prefix="/api/sensors", tags=["sensors"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["alerts"])
app.include_router(permits_router, prefix="/api/permits", tags=["permits"])
app.include_router(risk_router, prefix="/api/risk", tags=["risk"])
app.include_router(incidents_router, prefix="/api/incidents", tags=["incidents"])
app.include_router(copilot_router, prefix="/api/copilot", tags=["copilot"])
app.include_router(workers_router, prefix="/api/workers", tags=["workers"])
app.include_router(emergency_router, prefix="/api/emergency", tags=["emergency"])

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "sentinelai-backend"}

@app.get("/api/demo")
async def demo():
    from data.simulator import get_plant_state, get_demo_phase, get_demo_elapsed_time
    state = get_plant_state()
    return {"data": {**state, "demoPhase": get_demo_phase(), "demoElapsed": get_demo_elapsed_time()}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@app.post("/api/demo")
async def demo_action(body: dict):
    from data.simulator import reset_simulator, state as sim_state
    if body.get("action") == "reset":
        reset_simulator()
        return {"data": {"success": True, "message": "Demo reset"}, "timestamp": __import__("datetime").datetime.now().isoformat()}
    return {"error": "Invalid action"}, 400

@app.post("/api/demo/advance")
async def demo_advance(body: dict = None):
    from data.simulator import state as sim_state
    phase = (body or {}).get("phase", sim_state.demo_phase + 1)
    sim_state.demo_phase = min(4, max(0, phase))
    sim_state.demo_start = __import__("datetime").datetime.now().timestamp() - {0: 0, 1: 30, 2: 60, 3: 90, 4: 120}.get(sim_state.demo_phase, 0)
    return {"data": {"demoPhase": sim_state.demo_phase, "success": True}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@app.post("/api/db/seed")
async def db_seed():
    try:
        from data.seed_data import seed_all
        seed_all()
        return {"data": {"success": True, "message": "Database seeded"}, "timestamp": __import__("datetime").datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}, 500

@app.post("/api/db/clear")
async def db_clear():
    try:
        from db.repository import repo
        repo.clear_all()
        return {"data": {"success": True, "message": "Database cleared"}, "timestamp": __import__("datetime").datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/redis/status")
async def redis_status():
    try:
        from redis.client import redis_client
        return {"data": {"available": redis_client.available, "alert_queue_length": redis_client.get_alert_queue_length()}, "timestamp": __import__("datetime").datetime.now().isoformat()}
    except Exception as e:
        return {"data": {"available": False, "error": str(e)}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@app.get("/api/redis/alerts")
async def redis_alerts():
    try:
        from redis.client import redis_client
        alerts = redis_client.get_pending_alerts(20)
        return {"data": alerts, "timestamp": __import__("datetime").datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/rag/status")
async def rag_status():
    try:
        from rag.retriever import retriever
        return {"data": {"initialized": retriever.initialized, "populated": retriever.is_populated() if retriever.collection else False}, "timestamp": __import__("datetime").datetime.now().isoformat()}
    except Exception as e:
        return {"data": {"initialized": False, "populated": False, "error": str(e)}, "timestamp": __import__("datetime").datetime.now().isoformat()}

@app.post("/api/rag/init")
async def rag_init():
    try:
        from rag.retriever import retriever
        retriever.reset()
        ok = retriever.initialize()
        n = retriever.populate() if ok else 0
        return {"data": {"success": ok, "chunks_added": n}, "timestamp": __import__("datetime").datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/api/rag/query")
async def rag_query(q: str = "", k: int = 5):
    try:
        from rag.retriever import retriever
        results = retriever.retrieve(q, k=k)
        return {"data": results, "timestamp": __import__("datetime").datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}, 500

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
