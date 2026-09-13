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

    def generate_4block_explanation(self, decision: DispatchDecision, baseline_cost: float = None) -> dict:
        """Generate structured 4-block decision insights for operators."""
        total_renewable = decision.solar_kw + decision.wind_kw
        demand = decision.demand_kw if decision.demand_kw > 0 else 1.0
        ren_pct = min(100.0, (total_renewable / demand) * 100)

        # Block 1: Summary
        if decision.shortfall_kw > 0:
            summary = f"🔴 Critical Supply Deficit: Unserved load of {decision.shortfall_kw:.1f} kW detected."
        elif decision.diesel_kw > 0:
            summary = f"⛽ Diesel Generator Active: Supplying {decision.diesel_kw:.1f} kW alongside renewables ({ren_pct:.0f}% clean power)."
        elif decision.battery_kw > 0:
            summary = f"🔋 Battery Discharging: Delivering {decision.battery_kw:.1f} kW to offset renewable generation gap."
        elif decision.battery_kw < 0:
            summary = f"☀️ Clean Power Surplus: Renewables meeting 100% of load with {abs(decision.battery_kw):.1f} kW stored in battery."
        else:
            summary = f"🌱 Optimal Clean Dispatch: Renewables perfectly balanced with demand ({ren_pct:.0f}% clean energy)."

        # Block 2: Renewable & Battery Strategy
        ren_str = f"Solar output is {decision.solar_kw:.1f} kW and wind output is {decision.wind_kw:.1f} kW ({ren_pct:.0f}% of demand). "
        if decision.battery_kw < 0:
            batt_str = f"Excess renewable power ({abs(decision.battery_kw):.1f} kW) is routed into battery storage, raising SoC from {decision.battery_soc_before*100:.0f}% to {decision.battery_soc_after*100:.0f}%."
        elif decision.battery_kw > 0:
            batt_str = f"Battery is discharging {decision.battery_kw:.1f} kW (SoC: {decision.battery_soc_before*100:.0f}% → {decision.battery_soc_after*100:.0f}%) to protect local energy reserves."
        else:
            batt_str = f"Battery SoC remains stable at {decision.battery_soc_after*100:.0f}%."
        renewable_battery = ren_str + batt_str

        # Block 3: Diesel & Load Shedding Rationale
        if decision.diesel_kw > 0:
            diesel_load = f"Diesel generator operating at {decision.diesel_kw:.1f} kW because renewable generation and battery availability fell short of peak demand by {decision.diesel_kw:.1f} kW (Fuel cost: ₹{decision.diesel_cost:.2f})."
        elif decision.unserved_flexible_kw > 0:
            diesel_load = f"Flexible load of {decision.unserved_flexible_kw:.1f} kW curtailed to preserve battery reserve while fully serving critical load ({decision.critical_load_kw:.1f} kW)."
        elif decision.reserve_shortfall_kw > 0:
            diesel_load = f"⚠️ Operating with a soft reserve shortfall of {decision.reserve_shortfall_kw:.1f} kW — monitor system headroom."
        else:
            diesel_load = "Zero diesel fuel burned; critical and flexible load tiers fully served with zero load shedding."

        # Block 4: Impact & Actionable Recommendation
        cost_savings_str = ""
        if baseline_cost and baseline_cost > decision.total_cost:
            saved = baseline_cost - decision.total_cost
            cost_savings_str = f"MILP optimizer saved ₹{saved:.2f} vs reactive baseline in this period. "

        if decision.battery_soc_after <= 0.25:
            rec = "Recommendation: Battery SoC is low (≤25%). Prepare diesel generator or shed non-essential loads if demand spikes."
        elif decision.diesel_kw > 0:
            rec = "Recommendation: Generator is active. Consider shifting flexible irrigation/pumping load to daylight hours."
        else:
            rec = "Recommendation: Optimal system state. All systems operating within normal safety limits."
        impact_recommendation = cost_savings_str + rec

        return {
            "summary": summary,
            "renewable_battery": renewable_battery,
            "diesel_load": diesel_load,
            "impact_recommendation": impact_recommendation,
        }

    def explain(self, decision: DispatchDecision) -> str:
        """Generate a human-readable explanation for a dispatch decision."""
        blocks = self.generate_4block_explanation(decision)
        return f"{blocks['summary']} {blocks['renewable_battery']} {blocks['diesel_load']}"

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

