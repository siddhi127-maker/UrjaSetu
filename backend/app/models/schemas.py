from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Weather & Forecast Schemas ─────────────────────────────────────────────

class WeatherData(BaseModel):
    timestamp: datetime
    solar_irradiance: float = Field(ge=0, description="W/m²")
    cloud_cover: float = Field(ge=0, le=1, description="0–1 fraction")
    temperature: float = Field(description="°C")
    wind_speed: float = Field(ge=0, description="m/s")
    humidity: Optional[float] = Field(default=None, ge=0, le=100)


class ForecastResponse(BaseModel):
    solar_forecast: List[dict]     # [{timestamp, generation_kwh}]
    wind_forecast: List[dict]      # [{timestamp, generation_kwh}]
    demand_forecast: List[dict]    # [{timestamp, demand_kwh}]
    forecast_method: str = "formula"


class DemandForecastResponse(BaseModel):
    forecasts: List[dict]          # [{timestamp, demand_kwh}]
    method: str = "weighted_average"


# ─── Battery Schemas ────────────────────────────────────────────────────────

class BatteryStatus(BaseModel):
    soc: float = Field(ge=0, le=1, description="State of Charge (0–1)")
    soc_percent: float = Field(ge=0, le=100)
    available_kwh: float
    capacity_kwh: float
    health: float = Field(ge=0, le=1, description="Battery health (0–1)")
    cycle_count: float
    is_charging: bool
    is_discharging: bool


class BatteryHistory(BaseModel):
    history: List[dict]            # [{timestamp, soc, charge, discharge}]


# ─── Dispatch Schemas ───────────────────────────────────────────────────────

class DispatchDecision(BaseModel):
    timestamp: datetime
    solar_kw: float = 0.0
    wind_kw: float = 0.0
    battery_kw: float = 0.0       # + = discharge, - = charge
    diesel_kw: float = 0.0
    demand_kw: float = 0.0
    shortfall_kw: float = 0.0

    battery_soc_before: float = 0.0
    battery_soc_after: float = 0.0

    diesel_cost: float = 0.0
    battery_degradation_cost: float = 0.0
    total_cost: float = 0.0

    co2_emissions: float = 0.0
    co2_avoided: float = 0.0

    optimizer_type: str = "rule_based"
    explanation: str = ""
    status: str = "ok"             # ok | warning | critical


class OptimizeRequest(BaseModel):
    hours_ahead: int = Field(default=24, ge=1, le=168, description="Hours to optimize")
    optimizer_type: str = Field(default="rule_based", description="rule_based | lp | milp")
    use_forecast: bool = True


class OptimizeResponse(BaseModel):
    decisions: List[DispatchDecision]
    total_cost: float
    total_co2: float
    total_diesel_liters: float
    avg_reliability: float
    optimizer_type: str


# ─── Scenario / What-If Schemas ─────────────────────────────────────────────

class ScenarioRequest(BaseModel):
    cloudy_days: int = Field(default=0, ge=0, le=7)
    low_wind: bool = False
    high_demand: bool = False
    battery_degradation: float = Field(default=0.0, ge=0, le=0.5, description="Extra degradation (0–0.5)")
    diesel_unavailable: bool = False
    hours: int = Field(default=72, ge=1, le=168)


class ScenarioResponse(BaseModel):
    normal: OptimizeResponse
    scenario: OptimizeResponse
    comparison: dict                # {cost_diff, co2_diff, reliability_diff, ...}


# ─── Blackout Risk Schemas ──────────────────────────────────────────────────

class BlackoutRisk(BaseModel):
    risk_level: str                 # LOW | MEDIUM | HIGH | CRITICAL
    risk_score: float = Field(ge=0, le=1)
    hours_until_critical: Optional[float] = None
    projected_soc: List[dict]       # [{hour, soc}]
    message: str
    recommendations: List[str]


# ─── Alert Schemas ──────────────────────────────────────────────────────────

class Alert(BaseModel):
    id: Optional[int] = None
    timestamp: datetime
    alert_type: str
    severity: str                   # info | warning | critical
    message: str
    acknowledged: bool = False


class AlertsResponse(BaseModel):
    alerts: List[Alert]
    unacknowledged_count: int


# ─── Performance / Maintenance Schemas ──────────────────────────────────────

class PerformanceData(BaseModel):
    equipment: str                  # solar | wind
    performance_ratio: float       # 0–100%
    expected_generation: float
    actual_generation: float
    gap_percent: float
    needs_maintenance: bool
    consecutive_low_readings: int
    message: str


class PerformanceResponse(BaseModel):
    solar: PerformanceData
    wind: PerformanceData


# ─── KPI Schemas ────────────────────────────────────────────────────────────

class KPIResponse(BaseModel):
    # Cost
    today_cost: float
    baseline_cost: float
    cost_saved: float
    cost_saved_percent: float

    # CO₂
    co2_avoided_kg: float
    co2_emitted_kg: float

    # Reliability
    reliability_percent: float
    hours_with_power: int
    total_hours: int

    # Battery
    battery_soc: float
    battery_health: float

    # Energy mix (today)
    solar_kwh: float
    wind_kwh: float
    battery_kwh: float
    diesel_kwh: float
    total_demand_kwh: float


# ─── History Schemas ────────────────────────────────────────────────────────

class HistoryQuery(BaseModel):
    range: str = Field(default="week", description="day | week | month")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class HistoryResponse(BaseModel):
    records: List[dict]
    summary: dict                   # {total_cost, total_co2, avg_reliability, ...}
    range: str
