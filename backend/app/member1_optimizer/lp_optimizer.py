"""
Member 1 — LP/MILP Optimization Engine
========================================
Formulates dispatch as a linear programming problem using PuLP.

Objective:
    min Σ [ fuel_cost(diesel_t) + degradation_cost(battery_t) + penalty(shortfall_t) ]

Subject to:
    - solar_t + wind_t + battery_t + diesel_t >= demand_t
    - 0.20 ≤ SoC_t ≤ 1.00
    - SoC dynamics: SoC_{t+1} = SoC_t + charge × η - discharge / η
    - diesel_t ≤ diesel_max
    - Diesel minimum runtime (MILP binary)
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict

import pulp

from app.config import settings
from app.models.schemas import DispatchDecision

logger = logging.getLogger("urjasetu.optimizer")


class LPOptimizer:
    """PuLP-based LP/MILP dispatch optimizer."""

    def __init__(self):
        self.cfg = settings

    def optimize(
        self,
        solar_forecast: List[float],
        wind_forecast: List[float],
        demand_forecast: List[float],
        initial_soc: float = None,
        use_milp: bool = False,
        start_time: datetime = None,
    ) -> List[DispatchDecision]:
        """
        Solve the multi-period dispatch optimization.

        Args:
            solar_forecast: Predicted solar generation per hour (kWh)
            wind_forecast: Predicted wind generation per hour (kWh)
            demand_forecast: Predicted demand per hour (kWh)
            initial_soc: Starting battery SoC (0–1)
            use_milp: If True, add diesel minimum runtime (binary variables)
            start_time: Timestamp of first period
        """
        T = len(demand_forecast)
        if start_time is None:
            start_time = datetime.now().replace(minute=0, second=0, microsecond=0)

        if initial_soc is None:
            initial_soc = self.cfg.BATTERY_INITIAL_SOC

        # ── Create problem ───────────────────────────────────────
        prob_type = "MILP" if use_milp else "LP"
        prob = pulp.LpProblem(f"UrjaSetu_Dispatch_{prob_type}", pulp.LpMinimize)

        # ── Decision variables ───────────────────────────────────
        solar_used = [pulp.LpVariable(f"solar_{t}", 0, solar_forecast[t]) for t in range(T)]
        wind_used = [pulp.LpVariable(f"wind_{t}", 0, wind_forecast[t]) for t in range(T)]
        battery_charge = [pulp.LpVariable(f"batt_ch_{t}", 0) for t in range(T)]
        battery_discharge = [pulp.LpVariable(f"batt_dis_{t}", 0) for t in range(T)]
        diesel = [pulp.LpVariable(f"diesel_{t}", 0, self.cfg.DIESEL_CAPACITY_KW) for t in range(T)]
        shortfall = [pulp.LpVariable(f"short_{t}", 0) for t in range(T)]
        soc = [pulp.LpVariable(f"soc_{t}", self.cfg.BATTERY_SOC_MIN, self.cfg.BATTERY_SOC_MAX) for t in range(T + 1)]

        # Diesel binary (for MILP minimum runtime)
        if use_milp:
            diesel_on = [pulp.LpVariable(f"diesel_on_{t}", cat="Binary") for t in range(T)]

        # ── Objective function ───────────────────────────────────
        prob += pulp.lpSum([
            # Diesel fuel cost
            diesel[t] * self.cfg.DIESEL_COST_PER_KWH
            # Battery degradation cost (charge + discharge)
            + (battery_charge[t] + battery_discharge[t]) * self.cfg.BATTERY_DEGRADATION_COST_PER_KWH
            # Shortfall penalty
            + shortfall[t] * self.cfg.SHORTFALL_PENALTY_PER_KWH
            for t in range(T)
        ])

        # ── Constraints ─────────────────────────────────────────

        # Initial SoC
        prob += soc[0] == initial_soc

        for t in range(T):
            # Demand satisfaction
            prob += (
                solar_used[t] + wind_used[t] + battery_discharge[t] + diesel[t]
                >= demand_forecast[t] - shortfall[t]
            )

            # SoC dynamics
            prob += (
                soc[t + 1] == soc[t]
                + (battery_charge[t] * self.cfg.BATTERY_CHARGE_EFFICIENCY) / self.cfg.BATTERY_CAPACITY_KWH
                - (battery_discharge[t] / self.cfg.BATTERY_DISCHARGE_EFFICIENCY) / self.cfg.BATTERY_CAPACITY_KWH
            )

            # Battery charge limited by excess renewable
            excess = max(0, solar_forecast[t] + wind_forecast[t] - demand_forecast[t])
            prob += battery_charge[t] <= excess + 0.01  # Small epsilon

            # MILP: diesel minimum runtime
            if use_milp:
                # If diesel_on[t] = 0, diesel[t] must be 0
                prob += diesel[t] <= self.cfg.DIESEL_CAPACITY_KW * diesel_on[t]
                # Minimum runtime: if diesel starts, it must stay on for min_runtime hours
                if t >= 1:
                    # diesel_on[t] - diesel_on[t-1] captures start events
                    for dt in range(1, min(self.cfg.DIESEL_MIN_RUNTIME_HOURS, T - t)):
                        prob += diesel_on[t + dt] >= diesel_on[t] - diesel_on[t - 1]

        # ── Solve ────────────────────────────────────────────────
        solver = pulp.PULP_CBC_CMD(msg=0, timeLimit=30)
        status = prob.solve(solver)

        if status != pulp.constants.LpStatusOptimal:
            logger.warning(f"Optimizer status: {pulp.LpStatus[status]} — falling back")
            return self._fallback_decisions(demand_forecast, start_time)

        # ── Extract results ──────────────────────────────────────
        decisions = []
        for t in range(T):
            ts = start_time + timedelta(hours=t)

            s = pulp.value(solar_used[t]) or 0
            w = pulp.value(wind_used[t]) or 0
            bc = pulp.value(battery_charge[t]) or 0
            bd = pulp.value(battery_discharge[t]) or 0
            d = pulp.value(diesel[t]) or 0
            sf = pulp.value(shortfall[t]) or 0
            soc_before = pulp.value(soc[t]) or initial_soc
            soc_after = pulp.value(soc[t + 1]) or initial_soc

            battery_net = bd - bc  # + = discharge, - = charge
            diesel_cost = d * self.cfg.DIESEL_COST_PER_KWH
            deg_cost = (bc + bd) * self.cfg.BATTERY_DEGRADATION_COST_PER_KWH
            total_cost = diesel_cost + deg_cost + sf * self.cfg.SHORTFALL_PENALTY_PER_KWH

            fuel = d * self.cfg.DIESEL_FUEL_RATE
            co2 = fuel * self.cfg.DIESEL_CO2_PER_LITER
            co2_baseline = demand_forecast[t] * self.cfg.DIESEL_FUEL_RATE * self.cfg.DIESEL_CO2_PER_LITER
            co2_avoided = max(0, co2_baseline - co2)

            if sf > 0:
                status = "critical"
            elif d > 0 or soc_after <= 0.25:
                status = "warning"
            else:
                status = "ok"

            decisions.append(DispatchDecision(
                timestamp=ts,
                solar_kw=round(s, 2),
                wind_kw=round(w, 2),
                battery_kw=round(battery_net, 2),
                diesel_kw=round(d, 2),
                demand_kw=round(demand_forecast[t], 2),
                shortfall_kw=round(sf, 2),
                battery_soc_before=round(soc_before, 4),
                battery_soc_after=round(soc_after, 4),
                diesel_cost=round(diesel_cost, 2),
                battery_degradation_cost=round(deg_cost, 2),
                total_cost=round(total_cost, 2),
                co2_emissions=round(co2, 3),
                co2_avoided=round(co2_avoided, 3),
                optimizer_type="milp" if use_milp else "lp",
                explanation="",
                status=status,
            ))

        logger.info(
            f"Optimization complete: {T} periods, "
            f"total cost = ₹{sum(d.total_cost for d in decisions):.2f}"
        )
        return decisions

    def _fallback_decisions(
        self, demand_forecast: List[float], start_time: datetime
    ) -> List[DispatchDecision]:
        """Return empty decisions if solver fails."""
        return [
            DispatchDecision(
                timestamp=start_time + timedelta(hours=t),
                demand_kw=demand_forecast[t],
                status="critical",
                explanation="Optimizer failed — no dispatch decision available.",
            )
            for t in range(len(demand_forecast))
        ]


# Module-level singleton
lp_optimizer = LPOptimizer()
