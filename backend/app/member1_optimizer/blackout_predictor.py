"""
Member 1 — Blackout Risk Predictor
====================================
Forward-simulates SoC trajectory over the next 6–12 hours to assess
blackout risk before it happens.

Risk levels:
  LOW      — SoC expected to stay above 50%
  MEDIUM   — SoC expected to drop to 30–50%
  HIGH     — SoC expected to drop to 20–30%
  CRITICAL — SoC expected to hit floor (20%)
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional

from app.config import settings


class BlackoutPredictor:
    """Forward-simulates SoC to predict blackout risk."""

    def __init__(self):
        self.cfg = settings

    def predict_risk(
        self,
        current_soc: float,
        solar_forecast: List[float],
        wind_forecast: List[float],
        demand_forecast: List[float],
        diesel_available: bool = True,
    ) -> Dict:
        """
        Simulate SoC trajectory and assess blackout risk.

        Args:
            current_soc: Current battery SoC (0–1)
            solar_forecast: Predicted solar generation per hour (kWh)
            wind_forecast: Predicted wind generation per hour (kWh)
            demand_forecast: Predicted demand per hour (kWh)
            diesel_available: Whether diesel is available as backup

        Returns:
            Risk assessment with projected SoC trajectory.
        """
        hours = min(len(solar_forecast), len(wind_forecast), len(demand_forecast))
        if hours == 0:
            return self._build_result("LOW", 0.0, current_soc, [], None)

        capacity = self.cfg.BATTERY_CAPACITY_KWH
        soc_min = self.cfg.BATTERY_SOC_MIN
        eta_charge = self.cfg.BATTERY_CHARGE_EFFICIENCY
        eta_discharge = self.cfg.BATTERY_DISCHARGE_EFFICIENCY

        soc = current_soc
        trajectory = [{"hour": 0, "soc": round(soc * 100, 1)}]
        min_soc = soc
        hours_until_critical = None

        for h in range(hours):
            renewable = solar_forecast[h] + wind_forecast[h]
            demand = demand_forecast[h]

            if renewable >= demand:
                # Excess → charge battery
                excess = renewable - demand
                charge_room = (self.cfg.BATTERY_SOC_MAX - soc) * capacity
                charge = min(excess * eta_charge, charge_room)
                soc += charge / capacity
            else:
                # Deficit → discharge battery
                deficit = demand - renewable
                available = (soc - soc_min) * capacity * eta_discharge

                if available >= deficit:
                    soc -= deficit / (eta_discharge * capacity)
                else:
                    # Battery exhausted — need diesel
                    soc = soc_min
                    remaining = deficit - available

                    if not diesel_available and hours_until_critical is None:
                        hours_until_critical = h + 1

            soc = max(soc_min, min(self.cfg.BATTERY_SOC_MAX, soc))
            min_soc = min(min_soc, soc)
            trajectory.append({"hour": h + 1, "soc": round(soc * 100, 1)})

            # Check if we've hit the floor
            if soc <= soc_min + 0.01 and hours_until_critical is None:
                hours_until_critical = h + 1

        # ── Determine risk level ─────────────────────────────────
        risk_score = self._calculate_risk_score(min_soc, hours_until_critical, diesel_available)
        risk_level = self._score_to_level(risk_score)

        return self._build_result(risk_level, risk_score, min_soc, trajectory, hours_until_critical)

    def _calculate_risk_score(
        self, min_soc: float, hours_until_critical: Optional[float], diesel_available: bool
    ) -> float:
        """Calculate a 0–1 risk score."""
        soc_min = self.cfg.BATTERY_SOC_MIN

        # Base risk from minimum SoC
        if min_soc <= soc_min:
            soc_risk = 1.0
        elif min_soc <= soc_min + 0.10:
            soc_risk = 0.8
        elif min_soc <= soc_min + 0.20:
            soc_risk = 0.5
        elif min_soc <= soc_min + 0.30:
            soc_risk = 0.3
        else:
            soc_risk = 0.1

        # Urgency from hours until critical
        if hours_until_critical is not None:
            if hours_until_critical <= 2:
                time_risk = 1.0
            elif hours_until_critical <= 4:
                time_risk = 0.7
            elif hours_until_critical <= 8:
                time_risk = 0.4
            else:
                time_risk = 0.2
        else:
            time_risk = 0.0

        # Diesel availability reduces risk
        diesel_factor = 0.5 if diesel_available else 1.0

        return min(1.0, max(soc_risk, time_risk) * diesel_factor)

    def _score_to_level(self, score: float) -> str:
        """Convert risk score to risk level."""
        if score >= 0.8:
            return "CRITICAL"
        elif score >= 0.5:
            return "HIGH"
        elif score >= 0.3:
            return "MEDIUM"
        else:
            return "LOW"

    def _build_result(
        self,
        risk_level: str,
        risk_score: float,
        min_soc: float,
        trajectory: List[Dict],
        hours_until_critical: Optional[float],
    ) -> Dict:
        """Build the risk assessment result."""
        messages = {
            "LOW": "Battery reserves are healthy. No blackout risk expected.",
            "MEDIUM": (
                f"Battery SoC is projected to drop to {min_soc*100:.0f}%. "
                "Monitor closely and ensure diesel backup is ready."
            ),
            "HIGH": (
                f"⚠️ High blackout risk: SoC projected to reach {min_soc*100:.0f}%. "
                "Diesel backup should be prepared."
            ),
            "CRITICAL": (
                f"🔴 Critical blackout risk: SoC will hit the 20% floor"
                + (f" in ~{hours_until_critical} hours." if hours_until_critical else ".")
                + " Immediate diesel activation recommended."
            ),
        }

        recommendations = []
        if risk_level in ("HIGH", "CRITICAL"):
            recommendations.append("Prepare diesel generator for immediate use.")
            recommendations.append("Consider reducing non-essential loads.")
        if risk_level == "CRITICAL":
            recommendations.append("Start diesel generator now to prevent blackout.")
            recommendations.append("Alert village operator via SMS.")

        return {
            "risk_level": risk_level,
            "risk_score": round(risk_score, 2),
            "hours_until_critical": hours_until_critical,
            "projected_soc": trajectory,
            "message": messages.get(risk_level, ""),
            "recommendations": recommendations,
        }


# Module-level singleton
blackout_predictor = BlackoutPredictor()
