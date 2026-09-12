"""
Member 4 — Synthetic Data Generator
====================================
Generates 30 days × 24 hours = 720 rows of realistic village microgrid data.
Embeds realistic scenarios: sunny days, cloudy spells, high wind, low battery,
equipment degradation, demand spikes (festival days).
"""

import numpy as np
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.config import settings


class SyntheticDataGenerator:
    """Generates realistic synthetic village microgrid data."""

    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)
        self.cfg = settings

    def generate(self, days: int = 31, start_date: datetime = None) -> List[Dict[str, Any]]:
        """Generate `days` × 24 hourly records of synthetic microgrid data.
        
        Default: 31 days from (now - 30 days) through end of today, ensuring
        the dashboard and KPI pages always have data for the current day.
        """
        if start_date is None:
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)

        records = []
        battery_soc = self.cfg.BATTERY_INITIAL_SOC
        equipment_health = 1.0  # Starts perfect
        cycle_count = 0.0

        for day in range(days):
            current_date = start_date + timedelta(days=day)

            # Determine day type for scenario embedding
            day_type = self._get_day_type(day, days)

            for hour in range(24):
                timestamp = current_date + timedelta(hours=hour)

                # ── Weather ──────────────────────────────────────────
                cloud_cover = self._generate_cloud_cover(hour, day_type)
                temperature = self._generate_temperature(hour, day, day_type)
                wind_speed = self._generate_wind_speed(hour, day_type)
                solar_irradiance = self._generate_solar_irradiance(hour, cloud_cover)

                # ── Equipment degradation (last 5 days) ─────────────
                if day >= days - 5:
                    degradation_progress = (day - (days - 5)) / 5.0
                    equipment_health = max(0.7, 1.0 - 0.3 * degradation_progress)

                # ── Generation ───────────────────────────────────────
                solar_gen = self._calculate_solar_generation(
                    solar_irradiance, temperature, equipment_health
                )
                wind_gen = self._calculate_wind_generation(
                    wind_speed, equipment_health
                )

                # ── Demand ───────────────────────────────────────────
                demand = self._generate_demand(hour, day, day_type)

                # ── Dispatch simulation ──────────────────────────────
                renewable_total = solar_gen + wind_gen
                dispatch = self._simulate_dispatch(
                    renewable_total, demand, battery_soc, day_type
                )

                # Update battery SoC
                battery_soc = dispatch["battery_soc_after"]
                cycle_count += dispatch["cycle_contribution"]

                # ── Costs & emissions ────────────────────────────────
                diesel_cost = dispatch["diesel_kwh"] * self.cfg.DIESEL_COST_PER_KWH
                fuel_consumed = dispatch["diesel_kwh"] * self.cfg.DIESEL_FUEL_RATE
                co2_emissions = fuel_consumed * self.cfg.DIESEL_CO2_PER_LITER
                degradation_cost = abs(dispatch["battery_delta"]) * self.cfg.BATTERY_DEGRADATION_COST_PER_KWH
                total_cost = diesel_cost + degradation_cost

                record = {
                    "timestamp": timestamp,
                    "solar_irradiance": round(solar_irradiance, 1),
                    "cloud_cover": round(cloud_cover, 3),
                    "temperature": round(temperature, 1),
                    "wind_speed": round(wind_speed, 1),
                    "solar_generation": round(solar_gen, 2),
                    "wind_generation": round(wind_gen, 2),
                    "demand": round(demand, 2),
                    "battery_soc": round(battery_soc, 4),
                    "battery_charge": round(max(0, -dispatch["battery_delta"]), 2),
                    "battery_discharge": round(max(0, dispatch["battery_delta"]), 2),
                    "diesel_generation": round(dispatch["diesel_kwh"], 2),
                    "fuel_consumed": round(fuel_consumed, 3),
                    "total_cost": round(total_cost, 2),
                    "co2_emissions": round(co2_emissions, 3),
                    "equipment_degradation": round(1.0 - equipment_health, 4),
                    "is_synthetic": True,
                }
                records.append(record)

        return records

    # ─── Day Type Scenarios ─────────────────────────────────────────────────

    def _get_day_type(self, day: int, total_days: int) -> str:
        """Assign a scenario type to each day for realistic variation."""
        if 5 <= day <= 7:
            return "cloudy"           # 3 consecutive cloudy days
        elif day == 12:
            return "festival"         # High demand spike
        elif day == 18:
            return "high_wind"        # Windy day
        elif day == 22:
            return "low_wind"         # Calm day
        elif day >= total_days - 5:
            return "degraded"         # Equipment degradation period
        elif day % 4 == 0:
            return "partly_cloudy"
        else:
            return "sunny"

    # ─── Weather Generation ─────────────────────────────────────────────────

    def _generate_solar_irradiance(self, hour: int, cloud_cover: float) -> float:
        """Generate solar irradiance based on hour and cloud cover."""
        if hour < 6 or hour >= 19:
            return 0.0

        # Bell curve peaking at solar noon (12:00)
        peak_hour = 12.0
        sigma = 3.0
        base_irradiance = 1000.0 * math.exp(-0.5 * ((hour - peak_hour) / sigma) ** 2)

        # Cloud attenuation
        irradiance = base_irradiance * (1.0 - 0.75 * cloud_cover)

        # Add noise ±5%
        noise = self.rng.normal(0, 0.05) * irradiance
        return max(0.0, irradiance + noise)

    def _generate_cloud_cover(self, hour: int, day_type: str) -> float:
        """Generate cloud cover fraction (0–1)."""
        base_cover = {
            "sunny": 0.1,
            "partly_cloudy": 0.4,
            "cloudy": 0.8,
            "festival": 0.2,
            "high_wind": 0.3,
            "low_wind": 0.15,
            "degraded": 0.2,
        }.get(day_type, 0.2)

        # Afternoon clouds tend to build up
        afternoon_boost = 0.1 if 14 <= hour <= 17 else 0.0
        noise = self.rng.normal(0, 0.08)
        return float(np.clip(base_cover + afternoon_boost + noise, 0, 1))

    def _generate_temperature(self, hour: int, day: int, day_type: str) -> float:
        """Generate realistic temperature with diurnal variation."""
        # Base: hot Indian village (30–42°C range)
        base_temp = 32.0 + 5.0 * math.sin(2 * math.pi * (day % 30) / 30)  # Seasonal

        # Diurnal: cool at night, hot midday
        diurnal = 8.0 * math.sin(math.pi * (hour - 6) / 12) if 6 <= hour <= 18 else -3.0

        # Cloudy days are cooler
        cloud_effect = -3.0 if day_type == "cloudy" else 0.0

        noise = self.rng.normal(0, 1.5)
        return base_temp + diurnal + cloud_effect + noise

    def _generate_wind_speed(self, hour: int, day_type: str) -> float:
        """Generate wind speed (m/s) with realistic patterns."""
        base_speed = {
            "sunny": 5.0,
            "partly_cloudy": 6.0,
            "cloudy": 4.0,
            "festival": 5.0,
            "high_wind": 12.0,
            "low_wind": 2.0,
            "degraded": 5.0,
        }.get(day_type, 5.0)

        # Wind tends to be stronger in afternoon
        time_factor = 1.0 + 0.3 * math.sin(math.pi * (hour - 8) / 12) if 8 <= hour <= 20 else 0.8

        noise = self.rng.normal(0, 1.5)
        return max(0.0, base_speed * time_factor + noise)

    # ─── Generation Calculations ────────────────────────────────────────────

    def _calculate_solar_generation(
        self, irradiance: float, temperature: float, equipment_health: float
    ) -> float:
        """E_solar = P × (G / G_ref) × η × Δt, with temperature derating."""
        if irradiance <= 0:
            return 0.0

        # Temperature derating: efficiency drops above 25°C
        temp_factor = 1.0 + self.cfg.SOLAR_TEMP_COEFFICIENT * max(0, temperature - 25.0)
        efficiency = self.cfg.SOLAR_BASE_EFFICIENCY * max(0.5, temp_factor)

        generation = (
            self.cfg.SOLAR_PANEL_CAPACITY_KW
            * (irradiance / self.cfg.SOLAR_REFERENCE_IRRADIANCE)
            * efficiency
            * 1.0  # Δt = 1 hour
            * equipment_health
        )
        return max(0.0, generation)

    def _calculate_wind_generation(self, wind_speed: float, equipment_health: float) -> float:
        """Wind generation using turbine power curve."""
        if wind_speed < self.cfg.WIND_CUT_IN_SPEED:
            return 0.0
        if wind_speed > self.cfg.WIND_CUT_OUT_SPEED:
            return 0.0

        if wind_speed >= self.cfg.WIND_RATED_SPEED:
            output_fraction = 1.0
        else:
            # Cubic interpolation between cut-in and rated speed
            speed_range = self.cfg.WIND_RATED_SPEED - self.cfg.WIND_CUT_IN_SPEED
            normalized = (wind_speed - self.cfg.WIND_CUT_IN_SPEED) / speed_range
            output_fraction = normalized ** 3  # Cubic power curve

        generation = self.cfg.WIND_TURBINE_CAPACITY_KW * output_fraction * 1.0 * equipment_health
        return max(0.0, generation)

    # ─── Demand Generation ──────────────────────────────────────────────────

    def _generate_demand(self, hour: int, day: int, day_type: str) -> float:
        """Generate realistic village demand profile with morning/evening peaks."""
        # Base load profile (kWh) — typical Indian rural village
        hourly_profile = {
            0: 25, 1: 22, 2: 20, 3: 18, 4: 18, 5: 22,
            6: 35, 7: 50, 8: 55, 9: 60, 10: 65, 11: 70,
            12: 75, 13: 70, 14: 65, 15: 60, 16: 55, 17: 60,
            18: 80, 19: 90, 20: 85, 21: 75, 22: 55, 23: 35,
        }

        base_demand = hourly_profile.get(hour, 50)

        # Day type multipliers
        multiplier = {
            "sunny": 1.0,
            "partly_cloudy": 1.0,
            "cloudy": 0.95,           # Slightly less cooling demand
            "festival": 1.6,          # Festival: 60% higher demand
            "high_wind": 1.0,
            "low_wind": 1.05,
            "degraded": 1.0,
        }.get(day_type, 1.0)

        # Weekend effect (lower industrial)
        if day % 7 in [5, 6]:
            multiplier *= 0.85

        noise = self.rng.normal(0, 0.08) * base_demand
        return max(10.0, base_demand * multiplier + noise)

    # ─── Dispatch Simulation ────────────────────────────────────────────────

    def _simulate_dispatch(
        self,
        renewable_kwh: float,
        demand_kwh: float,
        battery_soc: float,
        day_type: str,
    ) -> Dict[str, float]:
        """Simplified rule-based dispatch for synthetic data generation."""
        battery_capacity = self.cfg.BATTERY_CAPACITY_KWH
        soc_min = self.cfg.BATTERY_SOC_MIN
        soc_max = self.cfg.BATTERY_SOC_MAX

        diesel_kwh = 0.0
        battery_delta = 0.0  # + = discharge, - = charge

        if renewable_kwh >= demand_kwh:
            # Excess renewable → charge battery
            excess = renewable_kwh - demand_kwh
            charge_room = (soc_max - battery_soc) * battery_capacity
            charge_amount = min(excess, charge_room) * self.cfg.BATTERY_CHARGE_EFFICIENCY
            battery_delta = -charge_amount  # Negative = charging

        else:
            # Deficit → use battery, then diesel
            deficit = demand_kwh - renewable_kwh
            battery_available = (battery_soc - soc_min) * battery_capacity * self.cfg.BATTERY_DISCHARGE_EFFICIENCY

            if battery_available >= deficit:
                battery_delta = deficit / self.cfg.BATTERY_DISCHARGE_EFFICIENCY
            else:
                battery_delta = max(0, battery_available / self.cfg.BATTERY_DISCHARGE_EFFICIENCY)
                remaining = deficit - battery_available

                # Diesel fills the rest (unless unavailable in scenario)
                if day_type != "diesel_unavailable":
                    diesel_kwh = min(remaining, self.cfg.DIESEL_CAPACITY_KW)

        # Update SoC
        new_soc = battery_soc - (battery_delta / battery_capacity)
        new_soc = float(np.clip(new_soc, soc_min, soc_max))

        # Cycle contribution (for degradation tracking)
        cycle_contribution = abs(battery_delta) / (2.0 * battery_capacity)

        return {
            "battery_soc_after": new_soc,
            "battery_delta": battery_delta,
            "diesel_kwh": diesel_kwh,
            "cycle_contribution": cycle_contribution,
        }


def generate_synthetic_dataset(days: int = 31, seed: int = 42) -> List[Dict[str, Any]]:
    """Convenience function to generate a synthetic dataset."""
    generator = SyntheticDataGenerator(seed=seed)
    return generator.generate(days=days)
