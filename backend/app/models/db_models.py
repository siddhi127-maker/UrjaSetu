from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.database import Base


class EnergyRecord(Base):
    """Hourly energy data — the core time-series table."""
    __tablename__ = "energy_records"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)

    # Weather inputs
    solar_irradiance = Column(Float, default=0.0)       # W/m²
    cloud_cover = Column(Float, default=0.0)             # 0–1
    temperature = Column(Float, default=25.0)            # °C
    wind_speed = Column(Float, default=0.0)              # m/s

    # Generation
    solar_generation = Column(Float, default=0.0)        # kWh
    wind_generation = Column(Float, default=0.0)         # kWh

    # Demand
    demand = Column(Float, default=0.0)                  # kWh

    # Battery
    battery_soc = Column(Float, default=0.8)             # 0–1
    battery_charge = Column(Float, default=0.0)          # kWh charged
    battery_discharge = Column(Float, default=0.0)       # kWh discharged

    # Diesel
    diesel_generation = Column(Float, default=0.0)       # kWh
    fuel_consumed = Column(Float, default=0.0)           # liters

    # Costs & emissions
    total_cost = Column(Float, default=0.0)              # ₹
    co2_emissions = Column(Float, default=0.0)           # kg CO₂

    # Equipment health
    equipment_degradation = Column(Float, default=0.0)   # 0–1 (0 = perfect)

    # Metadata
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class DispatchLog(Base):
    """Optimizer decision log — records every dispatch decision."""
    __tablename__ = "dispatch_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)

    # Dispatch decision
    solar_dispatch = Column(Float, default=0.0)          # kW
    wind_dispatch = Column(Float, default=0.0)            # kW
    battery_dispatch = Column(Float, default=0.0)         # kW (+ discharge, - charge)
    diesel_dispatch = Column(Float, default=0.0)          # kW

    # Context
    demand = Column(Float, default=0.0)                   # kW
    battery_soc_before = Column(Float, default=0.0)
    battery_soc_after = Column(Float, default=0.0)

    # Cost breakdown
    diesel_cost = Column(Float, default=0.0)
    battery_degradation_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    shortfall = Column(Float, default=0.0)                # kW unmet

    # Optimizer info
    optimizer_type = Column(String(50), default="rule_based")  # rule_based | lp | milp
    explanation = Column(Text, default="")

    # CO₂
    co2_emissions = Column(Float, default=0.0)
    co2_avoided = Column(Float, default=0.0)

    created_at = Column(DateTime, server_default=func.now())


class ForecastRecord(Base):
    """Forecast vs actual comparison — for accuracy tracking."""
    __tablename__ = "forecast_records"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)

    # Forecasted values
    forecast_solar = Column(Float, default=0.0)
    forecast_wind = Column(Float, default=0.0)
    forecast_demand = Column(Float, default=0.0)

    # Actual values (filled in after the fact)
    actual_solar = Column(Float, nullable=True)
    actual_wind = Column(Float, nullable=True)
    actual_demand = Column(Float, nullable=True)

    # Forecast method
    forecast_method = Column(String(50), default="formula")  # formula | ml

    created_at = Column(DateTime, server_default=func.now())


class AlertLog(Base):
    """Alert history — maintenance, blackout risk, etc."""
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)

    alert_type = Column(String(50), nullable=False)
    # Types: blackout_risk, battery_low, diesel_activated,
    #        maintenance_required, performance_degradation
    severity = Column(String(20), default="info")         # info | warning | critical
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False)
    sent_sms = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())


class BatteryState(Base):
    """Battery state history — granular SoC tracking."""
    __tablename__ = "battery_states"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)

    soc = Column(Float, nullable=False)                   # 0–1
    charge_kwh = Column(Float, default=0.0)
    discharge_kwh = Column(Float, default=0.0)
    health = Column(Float, default=1.0)                   # 0–1 (1 = brand new)
    cycle_count = Column(Float, default=0.0)              # Equivalent full cycles

    created_at = Column(DateTime, server_default=func.now())
