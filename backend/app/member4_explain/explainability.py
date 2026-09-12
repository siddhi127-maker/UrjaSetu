"""
Member 4 — Explainability Engine
==================================
Converts raw dispatch decisions into human-readable explanations
using template-based logic.
"""

from app.models.schemas import DispatchDecision
from app.config import settings


class ExplainabilityEngine:
    """Template-based explanation generator for dispatch decisions."""

    def explain(self, decision: DispatchDecision) -> str:
        """Generate a human-readable explanation for a dispatch decision."""
        parts = []

        total_renewable = decision.solar_kw + decision.wind_kw
        renewable_pct = (total_renewable / decision.demand_kw * 100) if decision.demand_kw > 0 else 0

        # ── Solar status ────────────────────────────────────────
        if decision.solar_kw > 0 and decision.solar_kw >= decision.demand_kw * 0.5:
            parts.append(
                f"Solar generation is strong at {decision.solar_kw:.1f} kW, "
                f"providing {decision.solar_kw / decision.demand_kw * 100:.0f}% of demand."
            )
        elif decision.solar_kw > 0:
            parts.append(
                f"Solar is contributing {decision.solar_kw:.1f} kW "
                f"({decision.solar_kw / decision.demand_kw * 100:.0f}% of demand)."
            )

        # ── Wind status ─────────────────────────────────────────
        if decision.wind_kw > 0:
            parts.append(
                f"Wind turbines are generating {decision.wind_kw:.1f} kW."
            )

        # ── Renewable sufficiency ───────────────────────────────
        if total_renewable >= decision.demand_kw and decision.diesel_kw == 0:
            parts.append(
                "Renewable sources are sufficient to meet current demand. "
                "No diesel backup is needed."
            )
            if decision.battery_kw < 0:  # Charging
                parts.append(
                    f"Excess renewable energy ({abs(decision.battery_kw):.1f} kW) "
                    f"is being stored in the battery."
                )

        # ── Battery discharging ─────────────────────────────────
        if decision.battery_kw > 0:
            parts.append(
                f"Battery is supplying {decision.battery_kw:.1f} kW because "
                f"renewable generation ({total_renewable:.1f} kW) is below "
                f"current demand ({decision.demand_kw:.1f} kW)."
            )

        # ── Battery SoC warnings ────────────────────────────────
        if decision.battery_soc_after <= 0.25:
            soc_pct = decision.battery_soc_after * 100
            parts.append(
                f"⚠️ Battery SoC is at {soc_pct:.0f}% — approaching the "
                f"20% safety threshold. Consider preparing diesel backup."
            )

        # ── Diesel activation ───────────────────────────────────
        if decision.diesel_kw > 0:
            available = total_renewable + max(0, decision.battery_kw)
            parts.append(
                f"Diesel generator was activated at {decision.diesel_kw:.1f} kW "
                f"because available renewable + battery capacity ({available:.1f} kW) "
                f"could not meet demand ({decision.demand_kw:.1f} kW)."
            )

        # ── Shortfall ───────────────────────────────────────────
        if decision.shortfall_kw > 0:
            parts.append(
                f"🔴 SHORTFALL: {decision.shortfall_kw:.1f} kW of demand "
                f"could not be met by any available source."
            )

        # ── Cost summary ────────────────────────────────────────
        if decision.total_cost > 0:
            parts.append(
                f"This cycle costs ₹{decision.total_cost:.2f} "
                f"(diesel: ₹{decision.diesel_cost:.2f}, "
                f"battery wear: ₹{decision.battery_degradation_cost:.2f})."
            )

        # ── Status ──────────────────────────────────────────────
        if decision.status == "critical":
            parts.append("🔴 System status: CRITICAL — immediate action required.")
        elif decision.status == "warning":
            parts.append("🟡 System status: WARNING — monitor closely.")

        return " ".join(parts) if parts else "System is operating normally."

    def get_status(self, decision: DispatchDecision) -> str:
        """Determine operational status from a dispatch decision."""
        if decision.shortfall_kw > 0:
            return "critical"
        if decision.battery_soc_after <= 0.25:
            return "warning"
        if decision.diesel_kw > 0:
            return "warning"
        return "ok"

    def get_short_summary(self, decision: DispatchDecision) -> str:
        """One-line summary for dashboard display."""
        total_renewable = decision.solar_kw + decision.wind_kw

        if decision.shortfall_kw > 0:
            return f"🔴 Power shortfall of {decision.shortfall_kw:.1f} kW"
        if decision.diesel_kw > 0:
            return f"⛽ Diesel active at {decision.diesel_kw:.1f} kW — renewables insufficient"
        if decision.battery_kw > 0:
            return f"🔋 Battery supplementing {decision.battery_kw:.1f} kW"
        if decision.battery_kw < 0:
            return f"☀️ Renewables sufficient — battery charging"
        return f"☀️ Renewable sources meeting demand ({total_renewable:.1f} kW)"


# Module-level singleton
explainability_engine = ExplainabilityEngine()
