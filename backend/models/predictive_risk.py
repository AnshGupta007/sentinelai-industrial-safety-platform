import numpy as np
from sklearn.linear_model import LinearRegression
from datetime import datetime, timedelta
from data.simulator import state as sim_state, SENSOR_CONFIG, calculate_risk

PREDICTION_GASES = ["CH4", "CO", "H2S"]
HORIZONS = [30, 60, 90]
MIN_SAMPLES = 10

def _prepare_training_data(gas_type: str, zone_id: str):
    sensor_id = f"{zone_id}_{gas_type}"
    history = sim_state.sensor_history.get(sensor_id, [])
    if len(history) < MIN_SAMPLES:
        return None, None
    base_time = datetime.fromtimestamp(sim_state.demo_start)
    X, y = [], []
    for reading in history[-120:]:
        t = datetime.fromisoformat(reading["timestamp"])
        minutes_elapsed = (t - base_time).total_seconds() / 60.0
        X.append([minutes_elapsed, reading["value"]])
        y.append(reading["value"])
    return np.array(X), np.array(y)

def _train_model(gas_type: str, zone_id: str):
    X, y = _prepare_training_data(gas_type, zone_id)
    if X is None or len(X) < MIN_SAMPLES:
        return None, None, None
    model = LinearRegression()
    model.fit(X, y)
    residuals = y - model.predict(X)
    mae = float(np.mean(np.abs(residuals)))
    return model, X[-1], mae

def _predict_gas_level(gas_type: str, zone_id: str, horizon_min: int):
    model, last_features, mae = _train_model(gas_type, zone_id)
    if model is None:
        return None, None
    future_time = last_features[0] + horizon_min
    future_features = np.array([[future_time, last_features[1]]])
    predicted = float(model.predict(future_features)[0])
    predicted = max(0, predicted)
    confidence = max(0.5, 1.0 - (mae / max(predicted, 0.1)))
    confidence = min(0.98, confidence)
    lower = max(0, predicted - 1.96 * mae)
    upper = predicted + 1.96 * mae
    return predicted, {"lower": round(lower, 2), "upper": round(upper, 2), "confidence": round(confidence, 3)}

def _predict_risk_score_from_gases(predictions: dict, zone_id: str) -> float:
    sensor_id = f"{zone_id}_CH4"
    current_ch4 = sim_state.sensors.get(sensor_id, {}).get("value", 0)
    predicted_ch4 = predictions.get("CH4", {}).get("predicted", current_ch4)
    sensor_id = f"{zone_id}_CO"
    current_co = sim_state.sensors.get(sensor_id, {}).get("value", 0)
    predicted_co = predictions.get("CO", {}).get("predicted", current_co)
    current_risk = sim_state.risk_assessments.get(zone_id, {}).get("riskScore", 0)
    ch4_delta = (predicted_ch4 - current_ch4) / max(current_ch4, 0.1)
    co_delta = (predicted_co - current_co) / max(current_co, 0.1)
    risk_adjustment = (ch4_delta * 15) + (co_delta * 10)
    predicted_risk = min(100, max(0, current_risk + risk_adjustment))
    return round(predicted_risk, 1)

def get_predictions(zone_id: str):
    predictions = {}
    for gas in PREDICTION_GASES:
        gas_preds = {}
        for h in HORIZONS:
            predicted, ci = _predict_gas_level(gas, zone_id, h)
            if predicted is not None:
                gas_preds[f"t{h}"] = {
                    "predicted": round(predicted, 2),
                    "interval": ci
                }
        if gas_preds:
            predictions[gas] = gas_preds
    forecasted_risk = {}
    for h in HORIZONS:
        horizon_preds = {}
        for gas in PREDICTION_GASES:
            p = predictions.get(gas, {}).get(f"t{h}", {}).get("predicted")
            if p is not None:
                horizon_preds[gas] = {"predicted": p}
        if horizon_preds:
            risk = _predict_risk_score_from_gases({g: horizon_preds[g] for g in horizon_preds}, zone_id)
            forecasted_risk[h] = risk
    result = {
        "zoneId": zone_id,
        "predictions": predictions,
        "forecastedRisk30": forecasted_risk.get(30, 0),
        "forecastedRisk60": forecasted_risk.get(60, 0),
        "forecastedRisk90": forecasted_risk.get(90, 0),
        "currentRisk": sim_state.risk_assessments.get(zone_id, {}).get("riskScore", 0),
        "horizon": "90min",
        "timestamp": datetime.now().isoformat(),
    }
    return result
