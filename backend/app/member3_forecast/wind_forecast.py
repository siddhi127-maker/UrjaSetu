"""
Member 3 — Wind Generation Forecast
=====================================
Converts wind speed forecasts into expected generation using a
turbine power curve with cut-in, rated, and cut-out speeds.
"""

from typing import List, Dict

from app.config import settings
from app.models.schemas import WeatherData


class WindForecast:
    """Predicts wind turbine generation from weather data."""

    def __init__(self):
        self.capacity = settings.WIND_TURBINE_CAPACITY_KW
        self.cut_in = settings.WIND_CUT_IN_SPEED
        self.rated = settings.WIND_RATED_SPEED
        self.cut_out = settings.WIND_CUT_OUT_SPEED

    def predict_generation(
        self,
        weather: WeatherData,
        equipment_health: float = 1.0,
    ) -> float:
        """
        Predict wind generation for a single hour using power curve.

        Power curve:
          - Below cut-in (3 m/s): 0
          - Cut-in to rated: cubic ramp → ((v - cut_in) / (rated - cut_in))³
          - At/above rated: 100% capacity
          - Above cut-out (25 m/s): 0 (safety shutdown)
        """
        v = weather.wind_speed

        if v < self.cut_in or v > self.cut_out:
            return 0.0

        if v >= self.rated:
            output_fraction = 1.0
        else:
            # Cubic interpolation between cut-in and rated
            speed_range = self.rated - self.cut_in
            normalized = (v - self.cut_in) / speed_range
            output_fraction = normalized ** 3

        generation = self.capacity * output_fraction * 1.0 * equipment_health
        return max(0.0, round(generation, 2))

    def predict_batch(
        self,
        weather_data: List[WeatherData],
        equipment_health: float = 1.0,
    ) -> List[Dict]:
        """Predict wind generation for multiple hours."""
        results = []
        for w in weather_data:
            gen = self.predict_generation(w, equipment_health)
            results.append({
                "timestamp": w.timestamp.isoformat(),
                "generation_kwh": gen,
                "wind_speed": w.wind_speed,
            })
        return results

    def get_daily_total(
        self,
        weather_data: List[WeatherData],
        equipment_health: float = 1.0,
    ) -> float:
        """Sum expected wind generation for a day."""
        return sum(
            self.predict_generation(w, equipment_health)
            for w in weather_data
        )

    def get_power_curve(self) -> List[Dict]:
        """Return the turbine power curve for visualization."""
        import numpy as np
        curve = []
        for v in np.arange(0, 30, 0.5):
            if v < self.cut_in or v > self.cut_out:
                output = 0.0
            elif v >= self.rated:
                output = self.capacity
            else:
                normalized = (v - self.cut_in) / (self.rated - self.cut_in)
                output = self.capacity * (normalized ** 3)
            curve.append({"wind_speed": float(v), "power_kw": round(output, 2)})
        return curve


# Module-level singleton
wind_forecast = WindForecast()
