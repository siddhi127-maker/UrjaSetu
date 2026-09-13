"""
API Router — Alerts, Explainability & Maintenance endpoints
GET  /api/alerts              — Recent alerts
GET  /api/blackout-risk       — Current blackout risk assessment
GET  /api/explain/{id}        — Explain a dispatch decision
GET  /api/performance         — Equipment performance ratios
POST /api/alerts/{id}/ack     — Acknowledge an alert
"""

from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.member4_explain.alerts import alert_dispatcher
from app.member4_explain.explainability import explainability_engine
from app.member4_explain.maintenance import maintenance_monitor
from app.member1_optimizer.blackout_predictor import blackout_predictor
from app.member1_optimizer.battery import battery_model
from app.member3_forecast.weather_api import weather_api
from app.member3_forecast.solar_forecast import solar_forecast
from app.member3_forecast.wind_forecast import wind_forecast
from app.member3_forecast.demand_forecast import demand_forecast
from app.models.db_models import DispatchLog, EnergyRecord

router = APIRouter(prefix="/api", tags=["Alerts & Maintenance"])


@router.get("/alerts")
async def get_alerts(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Get recent alerts."""
    alerts = alert_dispatcher.get_recent_alerts(db, limit)
    unack = alert_dispatcher.get_unacknowledged_count(db)

    return {
        "alerts": [
            {
                "id": a.id,
                "timestamp": a.timestamp.isoformat(),
                "alert_type": a.alert_type,
                "severity": a.severity,
                "message": a.message,
                "acknowledged": a.acknowledged,
            }
            for a in alerts
        ],
        "unacknowledged_count": unack,
    }


@router.post("/alerts/{alert_id}/ack")
async def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    """Acknowledge an alert."""
    success = alert_dispatcher.acknowledge_alert(db, alert_id)
    return {"success": success}


@router.get("/blackout-risk")
async def get_blackout_risk(
    hours: int = Query(default=12, ge=1, le=48),
    db: Session = Depends(get_db),
):
    """Assess blackout risk for the upcoming hours."""
    weather_data = await weather_api.get_forecast(hours)

    solar_fc = [solar_forecast.predict_generation(w) for w in weather_data[:hours]]
    wind_fc = [wind_forecast.predict_generation(w) for w in weather_data[:hours]]
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    demand_fc_raw = demand_forecast.predict_batch(db, now, hours)
    demand_fc = [d["demand_kwh"] for d in demand_fc_raw]

    # Pad if needed
    while len(solar_fc) < hours:
        solar_fc.append(0.0)
    while len(wind_fc) < hours:
        wind_fc.append(0.0)
    while len(demand_fc) < hours:
        demand_fc.append(50.0)

    risk = blackout_predictor.predict_risk(
        battery_model.soc, solar_fc, wind_fc, demand_fc
    )

    return risk


@router.get("/explain/{dispatch_id}")
async def explain_dispatch(dispatch_id: int, db: Session = Depends(get_db)):
    """Get human-readable explanation for a dispatch decision."""
    log = db.query(DispatchLog).filter(DispatchLog.id == dispatch_id).first()
    if not log:
        return {"error": "Dispatch decision not found"}

    return {
        "dispatch_id": log.id,
        "timestamp": log.timestamp.isoformat(),
        "explanation": log.explanation,
        "optimizer_type": log.optimizer_type,
    }


from app.member4_explain.per_unit_maintenance import per_unit_maintenance


@router.get("/performance")
async def get_performance(db: Session = Depends(get_db)):
    """Get equipment performance ratios."""
    # Get recent records for comparison
    records = (
        db.query(EnergyRecord)
        .order_by(EnergyRecord.timestamp.desc())
        .limit(24)
        .all()
    )

    if not records:
        return {
            "solar": {
                "equipment": "solar",
                "performance_ratio": 100.0,
                "expected_generation": 0,
                "actual_generation": 0,
                "gap_percent": 0,
                "needs_maintenance": False,
                "consecutive_low_readings": 0,
                "message": "No data available yet.",
            },
            "wind": {
                "equipment": "wind",
                "performance_ratio": 100.0,
                "expected_generation": 0,
                "actual_generation": 0,
                "gap_percent": 0,
                "needs_maintenance": False,
                "consecutive_low_readings": 0,
                "message": "No data available yet.",
            },
        }

    # Calculate expected vs actual for recent hours
    total_expected_solar = 0
    total_actual_solar = 0
    total_expected_wind = 0
    total_actual_wind = 0

    for r in records:
        # Expected solar from irradiance
        from app.models.schemas import WeatherData
        w = WeatherData(
            timestamp=r.timestamp,
            solar_irradiance=r.solar_irradiance,
            cloud_cover=r.cloud_cover,
            temperature=r.temperature,
            wind_speed=r.wind_speed,
        )
        expected_solar = solar_forecast.predict_generation(w, equipment_health=1.0)
        expected_wind = wind_forecast.predict_generation(w, equipment_health=1.0)

        total_expected_solar += expected_solar
        total_actual_solar += r.solar_generation
        total_expected_wind += expected_wind
        total_actual_wind += r.wind_generation

    solar_perf = maintenance_monitor.check_solar_performance(
        total_actual_solar, total_expected_solar
    )
    wind_perf = maintenance_monitor.check_wind_performance(
        total_actual_wind, total_expected_wind
    )

    return {
        "solar": solar_perf,
        "wind": wind_perf,
    }


@router.get("/maintenance/per-unit")
async def get_per_unit_maintenance(
    db: Session = Depends(get_db),
    irradiance: float = Query(default=850.0, ge=0.0),
    temperature: float = Query(default=32.0),
    wind_speed: float = Query(default=8.5, ge=0.0),
):
    """
    Module 6.7: AI-Based Per-Unit Predictive Maintenance & Servicing Alerts.
    Evaluates string/unit expected vs actual outputs, performance gaps, peer averages,
    3-observation persistence rules, priority scores, and maintenance statuses.
    """
    results = per_unit_maintenance.evaluate_site_components(
        db,
        irradiance=irradiance,
        temperature=temperature,
        wind_speed=wind_speed,
    )
    return {
        "components": results,
        "total_components": len(results),
        "alerts_count": sum(1 for c in results if c["persistent_anomaly"]),
    }

