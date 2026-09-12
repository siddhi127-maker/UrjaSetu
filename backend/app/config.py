from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """UrjaSetu configuration — reads from .env file or environment variables."""

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./data/urjasetu.db"

    # --- Weather API ---
    OPENWEATHERMAP_API_KEY: str = ""
    WEATHER_LATITUDE: float = 26.9124  # Default: Jaipur, Rajasthan
    WEATHER_LONGITUDE: float = 75.7873

    # --- Solar Panel Configuration ---
    SOLAR_PANEL_CAPACITY_KW: float = 100.0  # Rated power in kW
    SOLAR_REFERENCE_IRRADIANCE: float = 1000.0  # W/m² (STC)
    SOLAR_BASE_EFFICIENCY: float = 0.20  # 20%
    SOLAR_TEMP_COEFFICIENT: float = -0.004  # -0.4% per °C above 25°C

    # --- Wind Turbine Configuration ---
    WIND_TURBINE_CAPACITY_KW: float = 50.0  # Rated power in kW
    WIND_CUT_IN_SPEED: float = 3.0  # m/s
    WIND_RATED_SPEED: float = 12.0  # m/s
    WIND_CUT_OUT_SPEED: float = 25.0  # m/s

    # --- Battery Configuration ---
    BATTERY_CAPACITY_KWH: float = 200.0  # Total capacity
    BATTERY_SOC_MIN: float = 0.20  # 20% minimum
    BATTERY_SOC_MAX: float = 1.00  # 100% maximum
    BATTERY_CHARGE_EFFICIENCY: float = 0.95
    BATTERY_DISCHARGE_EFFICIENCY: float = 0.95
    BATTERY_INITIAL_SOC: float = 0.80  # Start at 80%
    BATTERY_DEGRADATION_COST_PER_KWH: float = 2.0  # ₹/kWh cycled

    # --- Diesel Generator Configuration ---
    DIESEL_CAPACITY_KW: float = 75.0
    DIESEL_COST_PER_KWH: float = 25.0  # ₹/kWh
    DIESEL_FUEL_RATE: float = 0.3  # liters per kWh
    DIESEL_CO2_PER_LITER: float = 2.68  # kg CO₂ per liter
    DIESEL_MIN_RUNTIME_HOURS: int = 2  # Minimum runtime once started

    # --- Optimization ---
    SHORTFALL_PENALTY_PER_KWH: float = 100.0  # ₹/kWh unmet demand

    # --- Twilio (optional) ---
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_FROM_NUMBER: Optional[str] = None
    TWILIO_TO_NUMBER: Optional[str] = None

    # --- General ---
    APP_NAME: str = "UrjaSetu"
    DEBUG: bool = True

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
