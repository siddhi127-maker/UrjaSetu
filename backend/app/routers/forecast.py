"""
API Router — Forecast endpoints
GET /api/forecast           — Combined solar + wind + demand forecast
GET /api/forecast/day-ahead — Module 6.6 Day-Ahead Renewable & Demand Forecast Engine
GET /api/weather            — Raw weather data
GET /api/demand             — Demand forecast only
"""

from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.member3_forecast.weather_api import weather_api
from app.member3_forecast.solar_forecast import solar_forecast
from app.member3_forecast.wind_forecast import wind_forecast
from app.member3_forecast.demand_forecast import demand_forecast
from app.member3_forecast.day_ahead_engine import day_ahead_engine

router = APIRouter(prefix="/api", tags=["Forecast"])


@router.get("/forecast")
async def get_forecast(hours: int = Query(default=24, ge=1, le=168), db: Session = Depends(get_db)):
    """Get combined solar, wind, and demand forecast."""
    weather_data = await weather_api.get_forecast(hours)

    solar_results = solar_forecast.predict_batch(weather_data)
    wind_results = wind_forecast.predict_batch(weather_data)

    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    demand_results = demand_forecast.predict_batch(db, now, hours)

    return {
        "solar_forecast": solar_results,
        "wind_forecast": wind_results,
        "demand_forecast": demand_results,
        "forecast_method": "formula",
        "hours": hours,
    }


@router.get("/forecast/day-ahead")
async def get_day_ahead_forecast(
    db: Session = Depends(get_db),
    battery_kwh: float = Query(default=160.0, ge=0.0),
    battery_soc_pct: float = Query(default=80.0, ge=0.0, le=100.0),
):
    """
    Module 6.6: AI-Based Day-Ahead Renewable Generation & Village Demand Forecast.
    Executes full physical formulas and returns parameters for the Dashboard Summary Table.
    """
    weather_data = await weather_api.get_forecast(24)
    result = day_ahead_engine.calculate_day_ahead_forecast(
        db,
        weather_data,
        current_battery_kwh=battery_kwh,
        battery_soc_pct=battery_soc_pct,
    )
    return result


@router.get("/weather")
async def get_weather():
    """Get current weather conditions."""
    current = await weather_api.get_current_weather()
    if current:
        return current.model_dump()
    return {"error": "Weather data unavailable"}


@router.get("/demand")
async def get_demand(hours: int = Query(default=24, ge=1, le=168), db: Session = Depends(get_db)):
    """Get demand forecast."""
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    results = demand_forecast.predict_batch(db, now, hours)
    return {
        "forecasts": results,
        "method": "weighted_average",
    }
