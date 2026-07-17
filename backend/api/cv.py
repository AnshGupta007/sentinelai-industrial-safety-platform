from fastapi import APIRouter
from cv.ppe_detector import run_detection_cycle, get_active_violations, acknowledge_violation, get_detection_log, get_violation_stats, CAMERAS

router = APIRouter()

@router.post("/detect")
async def cv_detect():
    new_violations = run_detection_cycle()
    return {
        "data": {
            "scanned": len(new_violations),
            "violations": new_violations,
            "message": f"Detection cycle complete. {len(new_violations)} violations found.",
        },
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.get("/violations")
async def cv_violations():
    return {
        "data": get_active_violations(),
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.post("/violations/{violation_id}/acknowledge")
async def cv_acknowledge_violation(violation_id: str):
    success = acknowledge_violation(violation_id)
    return {
        "data": {"success": success},
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.get("/cameras")
async def cv_cameras():
    return {
        "data": CAMERAS,
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.get("/log")
async def cv_log(limit: int = 50):
    return {
        "data": get_detection_log(limit),
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }

@router.get("/stats")
async def cv_stats():
    return {
        "data": get_violation_stats(),
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }
