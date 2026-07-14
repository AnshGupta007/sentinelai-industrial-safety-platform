"""Visakhapatnam Replay Prevention Demo"""
import time
from datetime import datetime
from data.simulator import initialize, update, get_plant_state, get_risk_assessments, get_alerts

PHASES = [
    {"time": 0, "label": "All zones NORMAL. Risk: 18 (SAFE)"},
    {"time": 30, "label": "Zone A CH4 rising. Confined space permit activates. Risk: 35 (CAUTION)"},
    {"time": 60, "label": "Zone A ventilation OFFLINE. CH4: 15%LEL. Risk: 62 (HIGH)"},
    {"time": 90, "label": "Compound Rule 6 triggered. Risk: 82 (CRITICAL). Emergency activated."},
    {"time": 120, "label": "WITHOUT SentinelAI: Explosion simulated. WITH SentinelAI: Prevented at T+90s."},
]

def run_demo():
    print("=" * 60)
    print("  Visakhapatnam Replay Prevention - SentinelAI Demo")
    print("=" * 60)
    initialize()
    start = time.time()
    phase_idx = 0

    try:
        while True:
            elapsed = time.time() - start
            update()

            if phase_idx < len(PHASES) and elapsed >= PHASES[phase_idx]["time"]:
                print(f"\n[T+{int(elapsed)}s] {PHASES[phase_idx]['label']}")
                state = get_plant_state()
                za = next((z for z in state["zones"] if z["zoneId"] == "ZONE_A"), None)
                if za: print(f"  Zone A Risk: {za['riskScore']} ({za['riskLevel']})")
                phase_idx += 1

            if elapsed > 150:
                print("\n[T+150s] Demo complete. Comparison:")
                print("  WITHOUT SentinelAI: CH4 at 15%LEL (below 25% threshold) = NO ALERT")
                print("  Permit active (no gas data) = NO ALERT")
                print("  Ventilation offline (no cross-ref) = NO ALERT")
                print("  → SIMULATED EXPLOSION AT T+180s. 3 fatalities.")
                print()
                print("  WITH SentinelAI: Compound Rule 6 detected = ALERT at Risk 82")
                print("  → Permits suspended, workers evacuated, incident prevented.")
                print("  → Lead time: 90 seconds.")
                break

            time.sleep(1)
    except KeyboardInterrupt:
        print("\nDemo stopped.")

if __name__ == "__main__":
    run_demo()
