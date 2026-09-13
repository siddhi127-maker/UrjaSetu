"""
Module 6.6 — AI-Based Day-Ahead Renewable Generation & Village Demand Forecast
=============================================================================
Implements full physical and ML-augmented forecasting models for:
  1. Input Weather & Equipment Data
  2. Solar Generation Forecast (E_solar,h = P_solar × (G_h / G_ref) × η_system × Δt)
  3. Wind Generation Forecast (Power Curve calculation P_wind(v_h))
  4. Village Demand Forecast (D_forecast = α × D_LY + (1 - α) × D_7day)
  5. Total Renewable Generation (E_renewable = E_solar + E_wind)
  6. Battery Energy Available (B_usable = max(0, B_SOC - B_minimum))
  7. Expected Available Energy (E_available = E_renewable + B_usable)
  8. Surplus / Deficit Calculation (S = E_available - D_forecast)
  9. Sufficiency & Optimization Logic
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.config import settings
from app.models.schemas import WeatherData
from app.models.db_models import EnergyRecord
from app.member3_forecast.solar_forecast import solar_forecast
from app.member3_forecast.wind_forecast import wind_forecast
from app.member3_forecast.demand_forecast import demand_forecast


class DayAheadForecastEngine:
    """Engine executing Module 6.6 Day-Ahead Forecast and Sufficiency Logic."""

    def __init__(self):
        self.solar_capacity_kw = settings.SOLAR_PANEL_CAPACITY_KW  # 100 kW default
        self.wind_capacity_kw = settings.WIND_TURBINE_CAPACITY_KW   # 50 kW default
        self.g_ref = 1000.0  # Reference irradiance W/m²
        self.system_efficiency = 0.85  # Combined system efficiency η_system
        self.alpha_ly = 0.6  # Weight for previous year same date demand
        self.battery_capacity_kwh = settings.BATTERY_CAPACITY_KWH  # 200 kWh default
        self.battery_min_soc_pct = settings.BATTERY_SOC_MIN * 100.0  # 20%
        self.discharge_efficiency = settings.BATTERY_DISCHARGE_EFFICIENCY  # 0.95

    def calculate_day_ahead_forecast(
        self,
        db: Session,
        weather_data: List[WeatherData],
        current_battery_kwh: float = 160.0,
        battery_soc_pct: float = 80.0,
    ) -> Dict[str, Any]:
        """
        Executes the complete Module 6.6 calculations.
        Returns full parameters for the Dashboard Summary Table and hourly breakdown.
        """
        if not weather_data:
            return {}

        hours_count = min(len(weather_data), 24)
        hourly_solar = []
        hourly_wind = []
        hourly_demand = []
        hourly_breakdown = []

        start_time = weather_data[0].timestamp

        # 1. Calculate Hourly Solar & Wind Generation
        for i in range(hours_count):
            w = weather_data[i]
            
            # Formula: E_solar,h = P_solar × (G_h / G_ref) × η_system × Δt
            e_solar_h = solar_forecast.predict_generation(w)
            
            # Formula: E_wind,h = P_wind(v_h) × Δt
            e_wind_h = wind_forecast.predict_generation(w)

            # Formula: D_forecast = α × D_LY + (1 - α) × D_7day
            d_forecast_h = demand_forecast.predict_demand(db, w.timestamp)

            hourly_solar.append(e_solar_h)
            hourly_wind.append(e_wind_h)
            hourly_demand.append(d_forecast_h)

            hourly_breakdown.append({
                "hour": i + 1,
                "timestamp": w.timestamp.isoformat(),
                "irradiance_w_m2": w.solar_irradiance,
                "temperature_c": w.temperature,
                "wind_speed_m_s": w.wind_speed,
                "cloud_cover_pct": w.cloud_cover,
                "solar_kwh": e_solar_h,
                "wind_kwh": e_wind_h,
                "renewable_kwh": round(e_solar_h + e_wind_h, 2),
                "demand_kwh": d_forecast_h,
                "net_surplus_kwh": round((e_solar_h + e_wind_h) - d_forecast_h, 2),
            })

        # 2. Sum Daily Totals
        e_solar_day = round(sum(hourly_solar), 2)
        e_wind_day = round(sum(hourly_wind), 2)
        
        # Formula 5: E_renewable = E_solar + E_wind
        e_renewable_day = round(e_solar_day + e_wind_day, 2)

        # Formula 4: Total Village Demand Forecast
        d_forecast_day = round(sum(hourly_demand), 2)

        # 3. Battery Usable Energy Calculation
        # Formula 6: B_available = B_prev × η_discharge, B_usable = max(0, B_SOC - B_minimum)
        b_minimum_kwh = (self.battery_min_soc_pct / 100.0) * self.battery_capacity_kwh
        b_stored_kwh = (battery_soc_pct / 100.0) * self.battery_capacity_kwh
        b_usable_kwh = round(max(0.0, (b_stored_kwh - b_minimum_kwh) * self.discharge_efficiency), 2)
        b_prev_kwh = round(current_battery_kwh, 2)

        # 4. Formula 7: Expected Available Energy
        # E_available = E_renewable + B_usable
        e_available_day = round(e_renewable_day + b_usable_kwh, 2)

        # 5. Formula 8: Surplus / Deficit Calculation
        # S = E_available - D_forecast
        surplus_deficit_kwh = round(e_available_day - d_forecast_day, 2)
        d_shortfall = round(max(0.0, d_forecast_day - e_available_day), 2)

        # 6. Formula 9: Sufficiency and Optimization Logic
        if e_available_day >= d_forecast_day:
            sufficiency_status = "Sufficient"
            backup_requirement = "Not Required"
            action_recommendation = (
                "Renewable generation and usable battery storage are expected to be fully sufficient "
                "for village demand. Normal green microgrid operation scheduled."
            )
        else:
            sufficiency_status = "Deficit"
            backup_requirement = "Required"
            if b_usable_kwh >= d_shortfall:
                action_recommendation = (
                    f"Expected shortfall of {d_shortfall} kWh. Usable battery energy ({b_usable_kwh} kWh) "
                    "can cover the gap. Scheduled battery discharge strategy."
                )
            else:
                action_recommendation = (
                    f"Expected shortfall of {d_shortfall} kWh exceeds usable battery storage. "
                    "Optimization engine triggered: deferrable load shifting, grid support, or diesel backup required."
                )

        return {
            "forecast_solar_kwh": e_solar_day,
            "forecast_wind_kwh": e_wind_day,
            "total_renewable_kwh": e_renewable_day,
            "predicted_village_demand_kwh": d_forecast_day,
            "previous_day_battery_kwh": b_prev_kwh,
            "usable_battery_kwh": b_usable_kwh,
            "expected_available_kwh": e_available_day,
            "surplus_deficit_kwh": surplus_deficit_kwh,
            "shortfall_kwh": d_shortfall,
            "sufficiency_status": sufficiency_status,
            "backup_requirement": backup_requirement,
            "action_recommendation": action_recommendation,
            "hourly_breakdown": hourly_breakdown,
            "input_parameters": {
                "solar_capacity_kw": self.solar_capacity_kw,
                "wind_capacity_kw": self.wind_capacity_kw,
                "battery_capacity_kwh": self.battery_capacity_kwh,
                "battery_min_soc_pct": self.battery_min_soc_pct,
                "demand_alpha_ly": self.alpha_ly,
            }
        }


# Global singleton instance
day_ahead_engine = DayAheadForecastEngine()
