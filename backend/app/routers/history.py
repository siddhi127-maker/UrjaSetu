"""
API Router — History endpoints
GET /api/history — Historical energy records with summary
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import EnergyRecord, DispatchLog
from app.config import settings

router = APIRouter(prefix="/api", tags=["History"])


@router.get("/history")
async def get_history(
    range: str = Query(default="week", pattern="^(day|week|month)$"),
    db: Session = Depends(get_db),
):
    """Get historical energy data with summary statistics."""
    now = datetime.now()
    if range == "day":
        start = now - timedelta(days=1)
    elif range == "week":
        start = now - timedelta(weeks=1)
    else:
        start = now - timedelta(days=30)

    records = (
        db.query(EnergyRecord)
        .filter(EnergyRecord.timestamp >= start)
        .order_by(EnergyRecord.timestamp.asc())
        .all()
    )

    if not records:
        return {"records": [], "summary": {}, "range": range}

    record_list = [
        {
            "timestamp": r.timestamp.isoformat(),
            "solar_generation": r.solar_generation,
            "wind_generation": r.wind_generation,
            "demand": r.demand,
            "battery_soc": round(r.battery_soc * 100, 1),
            "battery_charge": r.battery_charge,
            "battery_discharge": r.battery_discharge,
            "diesel_generation": r.diesel_generation,
            "fuel_consumed": r.fuel_consumed,
            "total_cost": r.total_cost,
            "co2_emissions": r.co2_emissions,
        }
        for r in records
    ]

    # Summary statistics
    total_solar = sum(r.solar_generation for r in records)
    total_wind = sum(r.wind_generation for r in records)
    total_diesel = sum(r.diesel_generation for r in records)
    total_demand = sum(r.demand for r in records)
    total_cost = sum(r.total_cost for r in records)
    total_co2 = sum(r.co2_emissions for r in records)
    total_fuel = sum(r.fuel_consumed for r in records)

    baseline_cost = total_demand * settings.DIESEL_COST_PER_KWH
    baseline_co2 = total_demand * settings.DIESEL_FUEL_RATE * settings.DIESEL_CO2_PER_LITER

    hours_with_power = len(records)  # Synthetic data has no shortfalls

    summary = {
        "total_solar_kwh": round(total_solar, 2),
        "total_wind_kwh": round(total_wind, 2),
        "total_diesel_kwh": round(total_diesel, 2),
        "total_demand_kwh": round(total_demand, 2),
        "total_cost": round(total_cost, 2),
        "baseline_cost": round(baseline_cost, 2),
        "cost_saved": round(baseline_cost - total_cost, 2),
        "total_co2_kg": round(total_co2, 2),
        "co2_avoided_kg": round(baseline_co2 - total_co2, 2),
        "total_fuel_liters": round(total_fuel, 2),
        "renewable_percent": round((total_solar + total_wind) / max(1, total_demand) * 100, 1),
        "hours_with_power": hours_with_power,
        "total_hours": len(records),
        "reliability": round(hours_with_power / max(1, len(records)) * 100, 1),
    }

    return {
        "records": record_list,
        "summary": summary,
        "range": range,
    }
