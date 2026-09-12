"""
API Router — Optimization & Dispatch endpoints
POST /api/optimize   — Run multi-period optimization
GET  /api/dispatch    — Get current/latest dispatch decision
POST /api/scenario    — Run what-if scenario simulation
GET  /api/kpi         — Aggregated KPI dashboard data
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from app.database import get_db
from app.models.schemas import (
    OptimizeRequest, OptimizeResponse, DispatchDecision,
    ScenarioRequest, ScenarioResponse, KPIResponse,
)
from app.models.db_models import DispatchLog, EnergyRecord
from app.member3_forecast.weather_api import weather_api
from app.member3_forecast.solar_forecast import solar_forecast
from app.member3_forecast.wind_forecast import wind_forecast
from app.member3_forecast.demand_forecast import demand_forecast
from app.member1_optimizer.rule_based import RuleBasedDispatcher
from app.member1_optimizer.lp_optimizer import lp_optimizer
from app.member1_optimizer.battery import BatteryModel
from app.member4_explain.explainability import explainability_engine
from app.config import settings

router = APIRouter(prefix="/api", tags=["Optimization"])


@router.post("/optimize")
async def optimize(request: OptimizeRequest, db: Session = Depends(get_db)):
    """Run dispatch optimization for the specified time horizon."""
    hours = request.hours_ahead

    # Get forecasts
    weather_data = await weather_api.get_forecast(hours)
    solar_fc = [solar_forecast.predict_generation(w) for w in weather_data[:hours]]
    wind_fc = [wind_forecast.predict_generation(w) for w in weather_data[:hours]]

    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    demand_fc_raw = demand_forecast.predict_batch(db, now, hours)
    demand_fc = [d["demand_kwh"] for d in demand_fc_raw]

    # Pad if forecasts are shorter than requested
    while len(solar_fc) < hours:
        solar_fc.append(0.0)
    while len(wind_fc) < hours:
        wind_fc.append(0.0)
    while len(demand_fc) < hours:
        demand_fc.append(50.0)

    decisions = []

    if request.optimizer_type in ("lp", "milp"):
        # LP/MILP optimization
        decisions = lp_optimizer.optimize(
            solar_fc, wind_fc, demand_fc,
            use_milp=(request.optimizer_type == "milp"),
            start_time=now,
        )
    else:
        # Rule-based dispatch
        battery = BatteryModel()
        dispatcher = RuleBasedDispatcher(battery)

        for h in range(hours):
            ts = now + timedelta(hours=h)
            dec = dispatcher.dispatch(solar_fc[h], wind_fc[h], demand_fc[h], ts)
            decisions.append(dec)

    # Add explanations
    for dec in decisions:
        dec.explanation = explainability_engine.explain(dec)
        dec.status = explainability_engine.get_status(dec)

    # Log to database
    for dec in decisions:
        log = DispatchLog(
            timestamp=dec.timestamp,
            solar_dispatch=dec.solar_kw,
            wind_dispatch=dec.wind_kw,
            battery_dispatch=dec.battery_kw,
            diesel_dispatch=dec.diesel_kw,
            demand=dec.demand_kw,
            battery_soc_before=dec.battery_soc_before,
            battery_soc_after=dec.battery_soc_after,
            diesel_cost=dec.diesel_cost,
            battery_degradation_cost=dec.battery_degradation_cost,
            total_cost=dec.total_cost,
            shortfall=dec.shortfall_kw,
            optimizer_type=dec.optimizer_type,
            explanation=dec.explanation,
            co2_emissions=dec.co2_emissions,
            co2_avoided=dec.co2_avoided,
        )
        db.add(log)
    db.commit()

    total_cost = sum(d.total_cost for d in decisions)
    total_co2 = sum(d.co2_emissions for d in decisions)
    total_diesel_l = sum(d.diesel_kw * settings.DIESEL_FUEL_RATE for d in decisions)
    hours_with_power = sum(1 for d in decisions if d.shortfall_kw == 0)

    return {
        "decisions": [d.model_dump() for d in decisions],
        "total_cost": round(total_cost, 2),
        "total_co2": round(total_co2, 3),
        "total_diesel_liters": round(total_diesel_l, 2),
        "avg_reliability": round(hours_with_power / max(1, len(decisions)) * 100, 1),
        "optimizer_type": request.optimizer_type,
    }


@router.get("/dispatch")
async def get_current_dispatch(db: Session = Depends(get_db)):
    """Get the most recent dispatch decision."""
    latest = (
        db.query(DispatchLog)
        .order_by(DispatchLog.timestamp.desc())
        .first()
    )
    if not latest:
        # Run a quick single-period optimization
        weather = await weather_api.get_current_weather()
        if weather:
            solar = solar_forecast.predict_generation(weather)
            wind_gen = wind_forecast.predict_generation(weather)
        else:
            solar = 0.0
            wind_gen = 0.0

        demand = demand_forecast.predict_demand(db, datetime.now())

        dispatcher = RuleBasedDispatcher()
        dec = dispatcher.dispatch(solar, wind_gen, demand)
        dec.explanation = explainability_engine.explain(dec)

        return dec.model_dump()

    return {
        "timestamp": latest.timestamp.isoformat(),
        "solar_kw": latest.solar_dispatch,
        "wind_kw": latest.wind_dispatch,
        "battery_kw": latest.battery_dispatch,
        "diesel_kw": latest.diesel_dispatch,
        "demand_kw": latest.demand,
        "shortfall_kw": latest.shortfall,
        "battery_soc_before": latest.battery_soc_before,
        "battery_soc_after": latest.battery_soc_after,
        "diesel_cost": latest.diesel_cost,
        "battery_degradation_cost": latest.battery_degradation_cost,
        "total_cost": latest.total_cost,
        "co2_emissions": latest.co2_emissions,
        "co2_avoided": latest.co2_avoided,
        "optimizer_type": latest.optimizer_type,
        "explanation": latest.explanation,
        "status": "critical" if latest.shortfall > 0 else ("warning" if latest.diesel_dispatch > 0 else "ok"),
    }


@router.post("/scenario")
async def run_scenario(request: ScenarioRequest, db: Session = Depends(get_db)):
    """Run a what-if scenario simulation."""
    hours = request.hours

    # Get base forecasts
    weather_data = await weather_api.get_forecast(hours)
    solar_fc = [solar_forecast.predict_generation(w) for w in weather_data[:hours]]
    wind_fc = [wind_forecast.predict_generation(w) for w in weather_data[:hours]]
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    demand_fc_raw = demand_forecast.predict_batch(db, now, hours)
    demand_fc = [d["demand_kwh"] for d in demand_fc_raw]

    while len(solar_fc) < hours:
        solar_fc.append(0.0)
    while len(wind_fc) < hours:
        wind_fc.append(0.0)
    while len(demand_fc) < hours:
        demand_fc.append(50.0)

    # Normal scenario
    normal_decisions = lp_optimizer.optimize(solar_fc, wind_fc, demand_fc, start_time=now)

    # Modified scenario
    mod_solar = list(solar_fc)
    mod_wind = list(wind_fc)
    mod_demand = list(demand_fc)

    # Apply scenario modifications
    if request.cloudy_days > 0:
        cloudy_hours = request.cloudy_days * 24
        for h in range(min(cloudy_hours, hours)):
            mod_solar[h] *= 0.2  # 80% reduction

    if request.low_wind:
        for h in range(hours):
            mod_wind[h] *= 0.3  # 70% reduction

    if request.high_demand:
        for h in range(hours):
            mod_demand[h] *= 1.5  # 50% increase

    initial_soc = settings.BATTERY_INITIAL_SOC
    if request.battery_degradation > 0:
        initial_soc = max(settings.BATTERY_SOC_MIN, initial_soc - request.battery_degradation)

    scenario_decisions = lp_optimizer.optimize(
        mod_solar, mod_wind, mod_demand,
        initial_soc=initial_soc,
        start_time=now,
        diesel_available=not request.diesel_unavailable,
    )

    def summarize(decisions):
        return {
            "decisions": [d.model_dump() for d in decisions],
            "total_cost": round(sum(d.total_cost for d in decisions), 2),
            "total_co2": round(sum(d.co2_emissions for d in decisions), 3),
            "total_diesel_liters": round(sum(d.diesel_kw * settings.DIESEL_FUEL_RATE for d in decisions), 2),
            "avg_reliability": round(sum(1 for d in decisions if d.shortfall_kw == 0) / max(1, len(decisions)) * 100, 1),
            "optimizer_type": "lp",
        }

    normal_summary = summarize(normal_decisions)
    scenario_summary = summarize(scenario_decisions)

    return {
        "normal": normal_summary,
        "scenario": scenario_summary,
        "comparison": {
            "cost_diff": round(scenario_summary["total_cost"] - normal_summary["total_cost"], 2),
            "co2_diff": round(scenario_summary["total_co2"] - normal_summary["total_co2"], 3),
            "reliability_diff": round(scenario_summary["avg_reliability"] - normal_summary["avg_reliability"], 1),
            "diesel_diff": round(scenario_summary["total_diesel_liters"] - normal_summary["total_diesel_liters"], 2),
        },
    }


@router.get("/kpi")
async def get_kpis(db: Session = Depends(get_db)):
    """Get aggregated KPI data for the dashboard."""
    from app.member1_optimizer.battery import battery_model

    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Query today's dispatch logs
    today_logs = (
        db.query(DispatchLog)
        .filter(DispatchLog.timestamp >= today_start)
        .all()
    )

    if not today_logs:
        # Query from energy records (synthetic data)
        today_records = (
            db.query(EnergyRecord)
            .filter(EnergyRecord.timestamp >= today_start)
            .all()
        )

        solar_kwh = sum(r.solar_generation for r in today_records)
        wind_kwh = sum(r.wind_generation for r in today_records)
        diesel_kwh = sum(r.diesel_generation for r in today_records)
        total_demand = sum(r.demand for r in today_records)
        total_cost = sum(r.total_cost for r in today_records)
        total_co2 = sum(r.co2_emissions for r in today_records)
        battery_kwh = sum(r.battery_discharge for r in today_records)

        # Baseline = all diesel
        baseline_cost = total_demand * settings.DIESEL_COST_PER_KWH

        hours_with_power = len(today_records)
        total_hours = max(1, datetime.now().hour + 1)

        last_record = today_records[-1] if today_records else None

        return {
            "today_cost": round(total_cost, 2),
            "baseline_cost": round(baseline_cost, 2),
            "cost_saved": round(baseline_cost - total_cost, 2),
            "cost_saved_percent": round((baseline_cost - total_cost) / max(1, baseline_cost) * 100, 1),
            "co2_avoided_kg": round(total_demand * settings.DIESEL_FUEL_RATE * settings.DIESEL_CO2_PER_LITER - total_co2, 2),
            "co2_emitted_kg": round(total_co2, 2),
            "reliability_percent": round(hours_with_power / total_hours * 100, 1),
            "hours_with_power": hours_with_power,
            "total_hours": total_hours,
            "battery_soc": round(last_record.battery_soc * 100, 1) if last_record else 80.0,
            "battery_health": round(battery_model.health * 100, 1),
            "solar_kwh": round(solar_kwh, 2),
            "wind_kwh": round(wind_kwh, 2),
            "battery_kwh": round(battery_kwh, 2),
            "diesel_kwh": round(diesel_kwh, 2),
            "total_demand_kwh": round(total_demand, 2),
        }

    # From dispatch logs
    solar_kwh = sum(l.solar_dispatch for l in today_logs)
    wind_kwh = sum(l.wind_dispatch for l in today_logs)
    battery_kwh = sum(max(0, l.battery_dispatch) for l in today_logs)
    diesel_kwh = sum(l.diesel_dispatch for l in today_logs)
    total_demand = sum(l.demand for l in today_logs)
    total_cost = sum(l.total_cost for l in today_logs)
    total_co2 = sum(l.co2_emissions for l in today_logs)
    co2_avoided = sum(l.co2_avoided for l in today_logs)

    baseline_cost = total_demand * settings.DIESEL_COST_PER_KWH
    hours_with_power = sum(1 for l in today_logs if l.shortfall == 0)
    total_hours = len(today_logs)

    last_log = today_logs[-1]

    return {
        "today_cost": round(total_cost, 2),
        "baseline_cost": round(baseline_cost, 2),
        "cost_saved": round(baseline_cost - total_cost, 2),
        "cost_saved_percent": round((baseline_cost - total_cost) / max(1, baseline_cost) * 100, 1),
        "co2_avoided_kg": round(co2_avoided, 2),
        "co2_emitted_kg": round(total_co2, 2),
        "reliability_percent": round(hours_with_power / max(1, total_hours) * 100, 1),
        "hours_with_power": hours_with_power,
        "total_hours": total_hours,
        "battery_soc": round(last_log.battery_soc_after * 100, 1),
        "battery_health": round(battery_model.health * 100, 1),
        "solar_kwh": round(solar_kwh, 2),
        "wind_kwh": round(wind_kwh, 2),
        "battery_kwh": round(battery_kwh, 2),
        "diesel_kwh": round(diesel_kwh, 2),
        "total_demand_kwh": round(total_demand, 2),
    }
