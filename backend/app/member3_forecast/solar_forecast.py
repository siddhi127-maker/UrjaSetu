"""
Member 3 — Solar Generation Forecast
======================================
Converts solar irradiance forecasts into expected generation using:
    E_solar = P × (G / G_ref) × η × Δt
With temperature derating and equipment health adjustments.
"""

import math
from datetime import datetime
from typing import List, Dict

from app.config import settings
from app.models.schemas import WeatherData


class SolarForecast:
    """Predicts solar panel generation from weather data."""

    def __init__(self):
        self.capacity = settings.SOLAR_PANEL_CAPACITY_KW
        self.g_ref = settings.SOLAR_REFERENCE_IRRADIANCE
        self.base_efficiency = settings.SOLAR_BASE_EFFICIENCY
        self.temp_coefficient = settings.SOLAR_TEMP_COEFFICIENT

    def predict_generation(
        self,
        weather: WeatherData,
        equipment_health: float = 1.0,
    ) -> float:
        """
        Predict solar generation for a single hour.

        E_solar = P × (G / G_ref) × η × Δt × health

        Temperature derating: η adjusted by -0.4% per °C above 25°C.
        """
        irradiance = weather.solar_irradiance
        if irradiance <= 0:
            return 0.0

        # Temperature derating
        temp_factor = 1.0 + self.temp_coefficient * max(0, weather.temperature - 25.0)
        efficiency = self.base_efficiency * max(0.5, temp_factor)

        generation = (
            self.capacity
            * (irradiance / self.g_ref)
            * efficiency
            * 1.0  # Δt = 1 hour
            * equipment_health
        )
        return max(0.0, round(generation, 2))

    def predict_batch(
        self,
        weather_data: List[WeatherData],
        equipment_health: float = 1.0,
    ) -> List[Dict]:
        """Predict solar generation for multiple hours."""
        results = []
        for w in weather_data:
            gen = self.predict_generation(w, equipment_health)
            results.append({
                "timestamp": w.timestamp.isoformat(),
                "generation_kwh": gen,
                "irradiance": w.solar_irradiance,
                "temperature": w.temperature,
                "cloud_cover": w.cloud_cover,
            })
        return results

    def get_daily_total(
        self,
        weather_data: List[WeatherData],
        equipment_health: float = 1.0,
    ) -> float:
        """Sum expected solar generation for a day."""
        return sum(
            self.predict_generation(w, equipment_health)
            for w in weather_data
        )


# Module-level singleton
solar_forecast = SolarForecast()
