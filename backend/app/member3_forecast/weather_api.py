"""
Member 3 — Weather API Integration
====================================
Fetches current weather and 5-day forecast from OpenWeatherMap.
Falls back to synthetic/cached data if API is unavailable.
"""

import httpx
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from app.config import settings
from app.models.schemas import WeatherData

logger = logging.getLogger("urjasetu.weather")

OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5"


class WeatherAPI:
    """OpenWeatherMap integration for solar/wind forecasting inputs."""

    def __init__(self):
        self.api_key = settings.OPENWEATHERMAP_API_KEY
        self.lat = settings.WEATHER_LATITUDE
        self.lon = settings.WEATHER_LONGITUDE

    async def get_current_weather(self) -> Optional[WeatherData]:
        """Fetch current weather conditions."""
        if not self.api_key:
            logger.warning("No OpenWeatherMap API key — using fallback data")
            return self._fallback_current()

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{OPENWEATHER_BASE}/weather",
                    params={
                        "lat": self.lat,
                        "lon": self.lon,
                        "appid": self.api_key,
                        "units": "metric",
                    },
                )
                resp.raise_for_status()
                data = resp.json()

                return WeatherData(
                    timestamp=datetime.now(),
                    solar_irradiance=self._estimate_irradiance(
                        data.get("clouds", {}).get("all", 50) / 100.0
                    ),
                    cloud_cover=data.get("clouds", {}).get("all", 50) / 100.0,
                    temperature=data.get("main", {}).get("temp", 30.0),
                    wind_speed=data.get("wind", {}).get("speed", 5.0),
                    humidity=data.get("main", {}).get("humidity", 50.0),
                )
        except Exception as e:
            logger.error(f"Weather API error: {e}")
            return self._fallback_current()

    async def get_forecast(self, hours: int = 24) -> List[WeatherData]:
        """Fetch weather forecast for the specified hours ahead."""
        if not self.api_key:
            logger.warning("No API key — generating fallback forecast")
            return self._fallback_forecast(hours)

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{OPENWEATHER_BASE}/forecast",
                    params={
                        "lat": self.lat,
                        "lon": self.lon,
                        "appid": self.api_key,
                        "units": "metric",
                    },
                )
                resp.raise_for_status()
                data = resp.json()

                forecasts = []
                for item in data.get("list", []):
                    ts = datetime.fromtimestamp(item["dt"])
                    if ts > datetime.now() + timedelta(hours=hours):
                        break

                    cloud_cover = item.get("clouds", {}).get("all", 50) / 100.0
                    forecasts.append(WeatherData(
                        timestamp=ts,
                        solar_irradiance=self._estimate_irradiance(cloud_cover, ts.hour),
                        cloud_cover=cloud_cover,
                        temperature=item.get("main", {}).get("temp", 30.0),
                        wind_speed=item.get("wind", {}).get("speed", 5.0),
                        humidity=item.get("main", {}).get("humidity", 50.0),
                    ))

                # Interpolate to hourly if needed (OWM gives 3-hour intervals)
                return self._interpolate_to_hourly(forecasts, hours) if forecasts else self._fallback_forecast(hours)

        except Exception as e:
            logger.error(f"Forecast API error: {e}")
            return self._fallback_forecast(hours)

    def _estimate_irradiance(self, cloud_cover: float, hour: int = None) -> float:
        """Estimate solar irradiance from cloud cover and time of day."""
        import math

        if hour is None:
            hour = datetime.now().hour

        if hour < 6 or hour >= 19:
            return 0.0

        # Bell curve peaking at noon
        peak = 12.0
        sigma = 3.0
        base = 1000.0 * math.exp(-0.5 * ((hour - peak) / sigma) ** 2)

        # Cloud attenuation
        return max(0.0, base * (1.0 - 0.75 * cloud_cover))

    def _interpolate_to_hourly(
        self, forecasts: List[WeatherData], target_hours: int
    ) -> List[WeatherData]:
        """Interpolate 3-hourly forecast data to hourly resolution."""
        if len(forecasts) < 2:
            return forecasts

        hourly = []
        for i in range(len(forecasts) - 1):
            a, b = forecasts[i], forecasts[i + 1]
            diff_hours = (b.timestamp - a.timestamp).total_seconds() / 3600

            for h in range(int(diff_hours)):
                frac = h / diff_hours
                ts = a.timestamp + timedelta(hours=h)
                hourly.append(WeatherData(
                    timestamp=ts,
                    solar_irradiance=a.solar_irradiance + frac * (b.solar_irradiance - a.solar_irradiance),
                    cloud_cover=a.cloud_cover + frac * (b.cloud_cover - a.cloud_cover),
                    temperature=a.temperature + frac * (b.temperature - a.temperature),
                    wind_speed=a.wind_speed + frac * (b.wind_speed - a.wind_speed),
                    humidity=(a.humidity or 50) + frac * ((b.humidity or 50) - (a.humidity or 50)),
                ))

                if len(hourly) >= target_hours:
                    return hourly

        # Add last point
        hourly.append(forecasts[-1])
        return hourly[:target_hours]

    def _fallback_current(self) -> WeatherData:
        """Generate reasonable fallback weather data."""
        import math
        hour = datetime.now().hour
        return WeatherData(
            timestamp=datetime.now(),
            solar_irradiance=self._estimate_irradiance(0.3, hour),
            cloud_cover=0.3,
            temperature=32.0,
            wind_speed=5.5,
            humidity=55.0,
        )

    def _fallback_forecast(self, hours: int) -> List[WeatherData]:
        """Generate fallback forecast with realistic diurnal patterns."""
        import math
        forecasts = []
        now = datetime.now().replace(minute=0, second=0, microsecond=0)

        for h in range(hours):
            ts = now + timedelta(hours=h)
            hour = ts.hour
            cloud = 0.3 + 0.1 * math.sin(2 * math.pi * h / 24)

            forecasts.append(WeatherData(
                timestamp=ts,
                solar_irradiance=self._estimate_irradiance(max(0, min(1, cloud)), hour),
                cloud_cover=max(0, min(1, cloud)),
                temperature=30.0 + 8.0 * math.sin(math.pi * (hour - 6) / 12) if 6 <= hour <= 18 else 27.0,
                wind_speed=5.0 + 2.0 * math.sin(math.pi * (hour - 8) / 12) if 8 <= hour <= 20 else 4.0,
                humidity=55.0,
            ))

        return forecasts


# Module-level singleton
weather_api = WeatherAPI()
