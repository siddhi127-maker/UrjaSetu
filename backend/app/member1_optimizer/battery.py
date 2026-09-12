"""
Member 1 — Battery SoC Model & Degradation
=============================================
Tracks battery State of Charge with:
    SoC(t+1) = SoC(t) + (E_charge × η_charge) - (E_discharge / η_discharge)

Also calculates degradation cost based on cycle depth.
"""

from datetime import datetime
from typing import Dict, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.models.db_models import BatteryState


class BatteryModel:
    """Battery SoC tracking, constraints, and degradation cost."""

    def __init__(self):
        self.capacity = settings.BATTERY_CAPACITY_KWH
        self.soc_min = settings.BATTERY_SOC_MIN
        self.soc_max = settings.BATTERY_SOC_MAX
        self.eta_charge = settings.BATTERY_CHARGE_EFFICIENCY
        self.eta_discharge = settings.BATTERY_DISCHARGE_EFFICIENCY
        self.degradation_cost = settings.BATTERY_DEGRADATION_COST_PER_KWH

        # Current state
        self.soc = settings.BATTERY_INITIAL_SOC
        self.health = 1.0
        self.total_cycles = 0.0

    def get_available_discharge(self) -> float:
        """Available energy for discharge (kWh), respecting SoC floor."""
        return max(0.0, (self.soc - self.soc_min) * self.capacity * self.eta_discharge)

    def get_available_charge(self) -> float:
        """Available capacity for charging (kWh), respecting SoC ceiling."""
        return max(0.0, (self.soc_max - self.soc) * self.capacity / self.eta_charge)

    def charge(self, energy_kwh: float) -> Dict:
        """
        Charge the battery.

        SoC(t+1) = SoC(t) + E_charge × η_charge / capacity

        Returns the actual amount charged and new SoC.
        """
        max_charge = self.get_available_charge()
        actual_charge = min(energy_kwh, max_charge)

        soc_before = self.soc
        self.soc += (actual_charge * self.eta_charge) / self.capacity
        self.soc = min(self.soc, self.soc_max)

        # Track degradation
        cycle_depth = actual_charge / self.capacity
        self.total_cycles += cycle_depth / 2  # Half cycle for charge
        deg_cost = actual_charge * self.degradation_cost

        return {
            "charged_kwh": round(actual_charge, 2),
            "soc_before": round(soc_before, 4),
            "soc_after": round(self.soc, 4),
            "degradation_cost": round(deg_cost, 2),
        }

    def discharge(self, energy_kwh: float) -> Dict:
        """
        Discharge the battery.

        SoC(t+1) = SoC(t) - E_discharge / (η_discharge × capacity)

        Returns the actual amount discharged and new SoC.
        """
        max_discharge = self.get_available_discharge()
        actual_discharge = min(energy_kwh, max_discharge)

        soc_before = self.soc
        self.soc -= actual_discharge / (self.eta_discharge * self.capacity)
        self.soc = max(self.soc, self.soc_min)

        # Track degradation
        cycle_depth = actual_discharge / self.capacity
        self.total_cycles += cycle_depth / 2  # Half cycle for discharge
        deg_cost = actual_discharge * self.degradation_cost

        return {
            "discharged_kwh": round(actual_discharge, 2),
            "soc_before": round(soc_before, 4),
            "soc_after": round(self.soc, 4),
            "degradation_cost": round(deg_cost, 2),
        }

    def get_status(self) -> Dict:
        """Current battery status."""
        return {
            "soc": round(self.soc, 4),
            "soc_percent": round(self.soc * 100, 1),
            "available_kwh": round(self.get_available_discharge(), 2),
            "capacity_kwh": self.capacity,
            "health": round(self.health, 4),
            "cycle_count": round(self.total_cycles, 2),
            "is_charging": False,
            "is_discharging": False,
        }

    def set_soc(self, soc: float):
        """Set SoC directly (for initialization/simulation)."""
        self.soc = max(self.soc_min, min(self.soc_max, soc))

    def log_state(self, db: Session, charge_kwh: float = 0, discharge_kwh: float = 0):
        """Log current battery state to database."""
        state = BatteryState(
            timestamp=datetime.now(),
            soc=self.soc,
            charge_kwh=charge_kwh,
            discharge_kwh=discharge_kwh,
            health=self.health,
            cycle_count=self.total_cycles,
        )
        db.add(state)
        db.commit()

    def calculate_degradation_cost(self, energy_kwh: float) -> float:
        """Calculate degradation cost for a given amount of cycling."""
        return energy_kwh * self.degradation_cost


# Module-level singleton
battery_model = BatteryModel()
