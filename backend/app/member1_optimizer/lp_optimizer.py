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
    """PuLP-based LP/MILP dispatch optimizer with multi-tier load shedding and baseline benchmarking."""

    def __init__(self):
        self.cfg = settings

    def run_reactive_baseline(
        self,
        solar_forecast: List[float],
        wind_forecast: List[float],
        demand_forecast: List[float],
        initial_soc: float = None,
        diesel_available: bool = True,
        start_time: datetime = None,
        site_params: Dict = None,
    ) -> List[DispatchDecision]:
        """
        Greedy, no-lookahead reactive baseline dispatch.
        Priority: Solar -> Wind -> Battery -> Diesel -> Load Shedding.
        Used to measure optimization improvement.
        """
        T = len(demand_forecast)
        if start_time is None:
            start_time = datetime.now().replace(minute=0, second=0, microsecond=0)

        site = site_params or {}
        batt_cap = site.get("battery_capacity_kwh", self.cfg.BATTERY_CAPACITY_KWH)
        diesel_cap = site.get("diesel_capacity_kw", self.cfg.DIESEL_CAPACITY_KW) if diesel_available else 0.0
        diesel_price = site.get("diesel_cost_per_l", self.cfg.DIESEL_COST_PER_KWH / self.cfg.DIESEL_FUEL_RATE)
        critical_ratio = site.get("critical_load_ratio", 0.4)

        current_soc = initial_soc if initial_soc is not None else self.cfg.BATTERY_INITIAL_SOC
        soc_min = self.cfg.BATTERY_SOC_MIN
        max_rate = batt_cap * 0.5  # 0.5C max power

        decisions = []
        for t in range(T):
            ts = start_time + timedelta(hours=t)
            demand = demand_forecast[t]
            crit_demand = demand * critical_ratio
            flex_demand = demand - crit_demand

            solar_avail = solar_forecast[t]
            wind_avail = wind_forecast[t]

            soc_before = current_soc
            remaining_demand = demand

            # 1. Use solar
            s_used = min(solar_avail, remaining_demand)
            remaining_demand -= s_used

            # 2. Use wind
            w_used = min(wind_avail, remaining_demand)
            remaining_demand -= w_used

            # 3. Use battery
            available_kwh = max(0, (current_soc - soc_min) * batt_cap * self.cfg.BATTERY_DISCHARGE_EFFICIENCY)
            max_dis_this_hour = min(available_kwh, max_rate)
            b_dis = min(remaining_demand, max_dis_this_hour)
            remaining_demand -= b_dis

            # 4. Use diesel
            d_used = min(remaining_demand, diesel_cap) if diesel_cap > 0 else 0.0
            remaining_demand -= d_used

            # 5. Shortfall breakdown
            unserved_crit = max(0, min(remaining_demand, crit_demand))
            unserved_flex = max(0, remaining_demand - unserved_crit)

            # 6. Charge battery with excess renewables
            excess_renewables = (solar_avail - s_used) + (wind_avail - w_used)
            space_kwh = max(0, (1.0 - current_soc) * batt_cap / self.cfg.BATTERY_CHARGE_EFFICIENCY)
            max_ch_this_hour = min(space_kwh, max_rate)
            b_ch = min(excess_renewables, max_ch_this_hour)

            # Update SoC
            soc_delta = (b_ch * self.cfg.BATTERY_CHARGE_EFFICIENCY / batt_cap) - (b_dis / (self.cfg.BATTERY_DISCHARGE_EFFICIENCY * batt_cap))
            current_soc = max(soc_min, min(1.0, current_soc + soc_delta))
            soc_after = current_soc

            battery_net = b_dis - b_ch

            # Costs
            fuel_liters = d_used * self.cfg.DIESEL_FUEL_RATE
            diesel_cost = fuel_liters * diesel_price
            deg_cost = (b_ch + b_dis) * self.cfg.BATTERY_DEGRADATION_COST_PER_KWH
            shortfall_cost = unserved_crit * 500.0 + unserved_flex * 100.0
            total_cost = diesel_cost + deg_cost + shortfall_cost

            co2 = fuel_liters * self.cfg.DIESEL_CO2_PER_LITER

            status = "critical" if remaining_demand > 0 else ("warning" if d_used > 0 or soc_after <= 0.25 else "ok")

            decisions.append(DispatchDecision(
                timestamp=ts,
                solar_kw=round(s_used, 2),
                wind_kw=round(w_used, 2),
                battery_kw=round(battery_net, 2),
                diesel_kw=round(d_used, 2),
                demand_kw=round(demand, 2),
                critical_load_kw=round(crit_demand, 2),
                flexible_load_kw=round(flex_demand, 2),
                shortfall_kw=round(remaining_demand, 2),
                unserved_critical_kw=round(unserved_crit, 2),
                unserved_flexible_kw=round(unserved_flex, 2),
                reserve_shortfall_kw=0.0,
                battery_soc_before=round(soc_before, 4),
                battery_soc_after=round(soc_after, 4),
                diesel_cost=round(diesel_cost, 2),
                battery_degradation_cost=round(deg_cost, 2),
                total_cost=round(total_cost, 2),
                co2_emissions=round(co2, 3),
                co2_avoided=0.0,
                optimizer_type="reactive_baseline",
                explanation="",
                status=status,
            ))

        return decisions

    def optimize(
        self,
        solar_forecast: List[float],
        wind_forecast: List[float],
        demand_forecast: List[float],
        initial_soc: float = None,
        use_milp: bool = True,
        start_time: datetime = None,
        diesel_available: bool = True,
        site_params: Dict = None,
    ) -> List[DispatchDecision]:
        """
        Solve multi-period optimal dispatch using PuLP MILP solver.
        Includes battery non-simultaneity, load tier shedding (P1 vs P2-P4),
        and soft reserve constraints.
        """
        T = len(demand_forecast)
        if start_time is None:
            start_time = datetime.now().replace(minute=0, second=0, microsecond=0)

        site = site_params or {}
        batt_cap = site.get("battery_capacity_kwh", self.cfg.BATTERY_CAPACITY_KWH)
        diesel_cap = site.get("diesel_capacity_kw", self.cfg.DIESEL_CAPACITY_KW) if diesel_available else 0.0
        diesel_price = site.get("diesel_cost_per_l", self.cfg.DIESEL_COST_PER_KWH / self.cfg.DIESEL_FUEL_RATE)
        critical_ratio = site.get("critical_load_ratio", 0.4)

        if initial_soc is None:
            initial_soc = self.cfg.BATTERY_INITIAL_SOC

        prob_type = "MILP" if use_milp else "LP"
        prob = pulp.LpProblem(f"UrjaSetu_Dispatch_{prob_type}", pulp.LpMinimize)

        max_batt_rate = batt_cap * 0.5

        # Decision Variables
        solar_used = [pulp.LpVariable(f"solar_{t}", 0, solar_forecast[t]) for t in range(T)]
        wind_used = [pulp.LpVariable(f"wind_{t}", 0, wind_forecast[t]) for t in range(T)]
        battery_charge = [pulp.LpVariable(f"batt_ch_{t}", 0, max_batt_rate) for t in range(T)]
        battery_discharge = [pulp.LpVariable(f"batt_dis_{t}", 0, max_batt_rate) for t in range(T)]
        diesel = [pulp.LpVariable(f"diesel_{t}", 0, diesel_cap) for t in range(T)]

        # Load Shedding Tiers: Critical (P1) vs Flexible (P2-P4)
        unserved_crit = [pulp.LpVariable(f"unserved_crit_{t}", 0) for t in range(T)]
        unserved_flex = [pulp.LpVariable(f"unserved_flex_{t}", 0) for t in range(T)]
        reserve_shortfall = [pulp.LpVariable(f"reserve_short_{t}", 0) for t in range(T)]

        soc = [pulp.LpVariable(f"soc_{t}", self.cfg.BATTERY_SOC_MIN, self.cfg.BATTERY_SOC_MAX) for t in range(T + 1)]

        # MILP Binary Variables for Battery Non-Simultaneity & Diesel Start
        ch_binary = [pulp.LpVariable(f"ch_bin_{t}", cat="Binary") for t in range(T)]
        dis_binary = [pulp.LpVariable(f"dis_bin_{t}", cat="Binary") for t in range(T)]
        diesel_on = [pulp.LpVariable(f"diesel_on_{t}", cat="Binary") for t in range(T)]

        # Objective Function
        prob += pulp.lpSum([
            # Diesel fuel cost per kWh generated
            diesel[t] * self.cfg.DIESEL_FUEL_RATE * diesel_price
            # Battery degradation wear
            + (battery_charge[t] + battery_discharge[t]) * self.cfg.BATTERY_DEGRADATION_COST_PER_KWH
            # Critical load shedding penalty (heavy)
            + unserved_crit[t] * 500.0
            # Flexible load shedding penalty (moderate)
            + unserved_flex[t] * 100.0
            # Soft reserve shortfall penalty
            + reserve_shortfall[t] * 50.0
            for t in range(T)
        ])

        # Initial SoC
        prob += soc[0] == initial_soc

        for t in range(T):
            crit_d = demand_forecast[t] * critical_ratio
            flex_d = demand_forecast[t] - crit_d

            # Critical load cap
            prob += unserved_crit[t] <= crit_d
            # Flexible load cap
            prob += unserved_flex[t] <= flex_d

            # Energy balance: Generation + Battery Discharge + Unserved = Demand
            prob += (
                solar_used[t] + wind_used[t] + battery_discharge[t] + diesel[t]
                + unserved_crit[t] + unserved_flex[t]
                >= demand_forecast[t]
            )

            # Battery SoC dynamics
            prob += (
                soc[t + 1] == soc[t]
                + (battery_charge[t] * self.cfg.BATTERY_CHARGE_EFFICIENCY) / batt_cap
                - (battery_discharge[t] / self.cfg.BATTERY_DISCHARGE_EFFICIENCY) / batt_cap
            )

            # Renewable power conservation: solar_used + wind_used + charge <= forecast
            prob += (
                solar_used[t] + wind_used[t] + battery_charge[t]
                <= solar_forecast[t] + wind_forecast[t]
            )

            # Non-simultaneous battery charge and discharge
            prob += ch_binary[t] + dis_binary[t] <= 1
            prob += battery_charge[t] <= max_batt_rate * ch_binary[t]
            prob += battery_discharge[t] <= max_batt_rate * dis_binary[t]

            # Diesel on/off logic
            if diesel_cap > 0:
                prob += diesel[t] <= diesel_cap * diesel_on[t]
                if t >= 1 and use_milp:
                    for dt in range(1, min(self.cfg.DIESEL_MIN_RUNTIME_HOURS, T - t)):
                        prob += diesel_on[t + dt] >= diesel_on[t] - diesel_on[t - 1]
            else:
                prob += diesel[t] == 0

            # Soft reserve target (10% of demand)
            reserve_target = 0.10 * demand_forecast[t]
            headroom = (diesel_cap - diesel[t]) + (soc[t] - self.cfg.BATTERY_SOC_MIN) * batt_cap - battery_discharge[t]
            prob += headroom + reserve_shortfall[t] >= reserve_target

        # Solve problem
        solver = pulp.PULP_CBC_CMD(msg=0, timeLimit=30)
        status = prob.solve(solver)

        if status != pulp.constants.LpStatusOptimal:
            logger.warning(f"Optimizer status: {pulp.LpStatus[status]} — using baseline fallback")
            return self.run_reactive_baseline(
                solar_forecast, wind_forecast, demand_forecast, initial_soc, diesel_available, start_time, site_params
            )

        # Extract results
        decisions = []
        for t in range(T):
            ts = start_time + timedelta(hours=t)

            s = max(0.0, pulp.value(solar_used[t]) or 0)
            w = max(0.0, pulp.value(wind_used[t]) or 0)
            bc = max(0.0, pulp.value(battery_charge[t]) or 0)
            bd = max(0.0, pulp.value(battery_discharge[t]) or 0)
            d = max(0.0, pulp.value(diesel[t]) or 0)
            uc = max(0.0, pulp.value(unserved_crit[t]) or 0)
            uf = max(0.0, pulp.value(unserved_flex[t]) or 0)
            rs = max(0.0, pulp.value(reserve_shortfall[t]) or 0)
            soc_before = pulp.value(soc[t]) or initial_soc
            soc_after = pulp.value(soc[t + 1]) or initial_soc

            battery_net = bd - bc
            fuel_liters = d * self.cfg.DIESEL_FUEL_RATE
            diesel_cost = fuel_liters * diesel_price
            deg_cost = (bc + bd) * self.cfg.BATTERY_DEGRADATION_COST_PER_KWH
            shortfall_tot = uc + uf
            total_cost = diesel_cost + deg_cost + (uc * 500.0 + uf * 100.0 + rs * 50.0)

            co2 = fuel_liters * self.cfg.DIESEL_CO2_PER_LITER
            co2_baseline = demand_forecast[t] * self.cfg.DIESEL_FUEL_RATE * self.cfg.DIESEL_CO2_PER_LITER
            co2_avoided = max(0, co2_baseline - co2)

            if shortfall_tot > 0:
                st = "critical"
            elif d > 0 or soc_after <= 0.25 or rs > 0:
                st = "warning"
            else:
                st = "ok"

            crit_demand = demand_forecast[t] * critical_ratio
            flex_demand = demand_forecast[t] - crit_demand

            decisions.append(DispatchDecision(
                timestamp=ts,
                solar_kw=round(s, 2),
                wind_kw=round(w, 2),
                battery_kw=round(battery_net, 2),
                diesel_kw=round(d, 2),
                demand_kw=round(demand_forecast[t], 2),
                critical_load_kw=round(crit_demand, 2),
                flexible_load_kw=round(flex_demand, 2),
                shortfall_kw=round(shortfall_tot, 2),
                unserved_critical_kw=round(uc, 2),
                unserved_flexible_kw=round(uf, 2),
                reserve_shortfall_kw=round(rs, 2),
                battery_soc_before=round(soc_before, 4),
                battery_soc_after=round(soc_after, 4),
                diesel_cost=round(diesel_cost, 2),
                battery_degradation_cost=round(deg_cost, 2),
                total_cost=round(total_cost, 2),
                co2_emissions=round(co2, 3),
                co2_avoided=round(co2_avoided, 3),
                optimizer_type="milp" if use_milp else "lp",
                explanation="",
                status=st,
            ))

        logger.info(
            f"Optimization complete: {T} periods, "
            f"total cost = ₹{sum(d.total_cost for d in decisions):.2f}"
        )
        return decisions


# Module-level singleton
lp_optimizer = LPOptimizer()

