"""
Member 1 — Rule-Based Dispatch Engine
=======================================
Phase 1 priority-based dispatch logic:

  1. If solar >= demand → use solar, charge battery with excess
  2. If solar + wind >= demand → use both, charge battery with excess
  3. If renewables + battery >= demand → discharge battery for deficit
  4. Else → run diesel to fill remaining gap
  5. Never discharge battery below 20% SoC
"""

from datetime import datetime
from typing import Dict

from app.config import settings
from app.member1_optimizer.battery import BatteryModel
from app.models.schemas import DispatchDecision


class RuleBasedDispatcher:
    """Simple priority-based dispatch engine."""

    def __init__(self, battery: BatteryModel = None):
        self.battery = battery or BatteryModel()
        self.diesel_cost_per_kwh = settings.DIESEL_COST_PER_KWH
        self.diesel_capacity = settings.DIESEL_CAPACITY_KW
        self.diesel_fuel_rate = settings.DIESEL_FUEL_RATE
        self.diesel_co2_per_liter = settings.DIESEL_CO2_PER_LITER
        self.shortfall_penalty = settings.SHORTFALL_PENALTY_PER_KWH

    def dispatch(
        self,
        solar_available: float,
        wind_available: float,
        demand: float,
        timestamp: datetime = None,
        diesel_available: bool = True,
    ) -> DispatchDecision:
        """
        Make a dispatch decision for a single time step.

        Priority order: Solar → Wind → Battery → Diesel
        """
        if timestamp is None:
            timestamp = datetime.now()

        soc_before = self.battery.soc

        solar_used = 0.0
        wind_used = 0.0
        battery_kw = 0.0  # + = discharge, - = charge
        diesel_kw = 0.0
        shortfall = 0.0

        diesel_cost = 0.0
        battery_deg_cost = 0.0

        remaining_demand = demand

        # ── Step 1: Use solar ────────────────────────────────────
        solar_used = min(solar_available, remaining_demand)
        remaining_demand -= solar_used

        # ── Step 2: Use wind ─────────────────────────────────────
        wind_used = min(wind_available, remaining_demand)
        remaining_demand -= wind_used

        # ── Step 3: Use battery if deficit ───────────────────────
        if remaining_demand > 0:
            available = self.battery.get_available_discharge()
            battery_discharge = min(remaining_demand, available)

            if battery_discharge > 0:
                result = self.battery.discharge(battery_discharge)
                battery_kw = result["discharged_kwh"]
                battery_deg_cost = result["degradation_cost"]
                remaining_demand -= battery_kw

        # ── Step 4: Use diesel if still deficit ──────────────────
        if remaining_demand > 0 and diesel_available:
            diesel_kw = min(remaining_demand, self.diesel_capacity)
            diesel_cost = diesel_kw * self.diesel_cost_per_kwh
            remaining_demand -= diesel_kw

        # ── Step 5: Record shortfall ─────────────────────────────
        shortfall = max(0, remaining_demand)

        # ── Step 6: Charge battery with excess renewable ─────────
        excess_renewable = (solar_available - solar_used) + (wind_available - wind_used)
        if excess_renewable > 0 and remaining_demand <= 0:
            charge_result = self.battery.charge(excess_renewable)
            battery_kw = -charge_result["charged_kwh"]  # Negative = charging
            battery_deg_cost += charge_result["degradation_cost"]

        # ── Calculate emissions ──────────────────────────────────
        fuel_liters = diesel_kw * self.diesel_fuel_rate
        co2_emissions = fuel_liters * self.diesel_co2_per_liter

        # CO₂ avoided = what diesel would have been needed if no renewables
        baseline_diesel = demand  # Worst case: all diesel
        co2_baseline = baseline_diesel * self.diesel_fuel_rate * self.diesel_co2_per_liter
        co2_avoided = max(0, co2_baseline - co2_emissions)

        # ── Total cost ───────────────────────────────────────────
        shortfall_cost = shortfall * self.shortfall_penalty
        total_cost = diesel_cost + battery_deg_cost + shortfall_cost

        # ── Determine status ─────────────────────────────────────
        if shortfall > 0:
            status = "critical"
        elif diesel_kw > 0 or self.battery.soc <= 0.25:
            status = "warning"
        else:
            status = "ok"

        return DispatchDecision(
            timestamp=timestamp,
            solar_kw=round(solar_used, 2),
            wind_kw=round(wind_used, 2),
            battery_kw=round(battery_kw, 2),
            diesel_kw=round(diesel_kw, 2),
            demand_kw=round(demand, 2),
            shortfall_kw=round(shortfall, 2),
            battery_soc_before=round(soc_before, 4),
            battery_soc_after=round(self.battery.soc, 4),
            diesel_cost=round(diesel_cost, 2),
            battery_degradation_cost=round(battery_deg_cost, 2),
            total_cost=round(total_cost, 2),
            co2_emissions=round(co2_emissions, 3),
            co2_avoided=round(co2_avoided, 3),
            optimizer_type="rule_based",
            explanation="",
            status=status,
        )


# Module-level singleton
rule_dispatcher = RuleBasedDispatcher()
