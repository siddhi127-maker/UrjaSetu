"""
Member 4 — Predictive Maintenance
===================================
Monitors equipment Performance Ratio (PR) and flags maintenance
needs using a persistence rule (gap > 20% for ≥ 3 consecutive observations).
"""

from typing import List, Dict, Tuple
from collections import deque

from app.config import settings


class MaintenanceMonitor:
    """Tracks equipment performance and detects degradation."""

    def __init__(self):
        # Track recent performance gaps for persistence rule
        self._solar_gaps: deque = deque(maxlen=24)  # Last 24 hours
        self._wind_gaps: deque = deque(maxlen=24)

        # Configurable thresholds
        self.gap_threshold = 0.20       # 20% performance gap
        self.persistence_count = 3       # Must persist for 3+ observations

    def calculate_performance_ratio(
        self, actual: float, expected: float
    ) -> float:
        """PR = (E_actual / E_expected) × 100."""
        if expected <= 0:
            return 100.0
        return (actual / expected) * 100.0

    def check_solar_performance(
        self, actual_kwh: float, expected_kwh: float
    ) -> Dict:
        """Check solar panel performance and track gaps."""
        pr = self.calculate_performance_ratio(actual_kwh, expected_kwh)
        gap = max(0, (expected_kwh - actual_kwh) / expected_kwh) if expected_kwh > 0 else 0.0

        self._solar_gaps.append(gap)

        needs_maintenance = self._check_persistence(self._solar_gaps)
        consecutive = self._count_consecutive_high_gaps(self._solar_gaps)

        message = self._build_message("Solar", pr, gap, needs_maintenance, consecutive)

        return {
            "equipment": "solar",
            "performance_ratio": round(pr, 1),
            "expected_generation": round(expected_kwh, 2),
            "actual_generation": round(actual_kwh, 2),
            "gap_percent": round(gap * 100, 1),
            "needs_maintenance": needs_maintenance,
            "consecutive_low_readings": consecutive,
            "message": message,
        }

    def check_wind_performance(
        self, actual_kwh: float, expected_kwh: float
    ) -> Dict:
        """Check wind turbine performance and track gaps."""
        pr = self.calculate_performance_ratio(actual_kwh, expected_kwh)
        gap = max(0, (expected_kwh - actual_kwh) / expected_kwh) if expected_kwh > 0 else 0.0

        self._wind_gaps.append(gap)

        needs_maintenance = self._check_persistence(self._wind_gaps)
        consecutive = self._count_consecutive_high_gaps(self._wind_gaps)

        message = self._build_message("Wind", pr, gap, needs_maintenance, consecutive)

        return {
            "equipment": "wind",
            "performance_ratio": round(pr, 1),
            "expected_generation": round(expected_kwh, 2),
            "actual_generation": round(actual_kwh, 2),
            "gap_percent": round(gap * 100, 1),
            "needs_maintenance": needs_maintenance,
            "consecutive_low_readings": consecutive,
            "message": message,
        }

    def _check_persistence(self, gaps: deque) -> bool:
        """Persistence rule: gap > threshold for >= N consecutive readings."""
        if len(gaps) < self.persistence_count:
            return False

        recent = list(gaps)[-self.persistence_count:]
        return all(g > self.gap_threshold for g in recent)

    def _count_consecutive_high_gaps(self, gaps: deque) -> int:
        """Count consecutive readings where gap > threshold (from most recent)."""
        count = 0
        for gap in reversed(gaps):
            if gap > self.gap_threshold:
                count += 1
            else:
                break
        return count

    def _build_message(
        self, equipment: str, pr: float, gap: float,
        needs_maintenance: bool, consecutive: int
    ) -> str:
        """Build human-readable maintenance message."""
        if needs_maintenance:
            return (
                f"🔧 MAINTENANCE REQUIRED: {equipment} equipment has been underperforming "
                f"(PR: {pr:.1f}%, gap: {gap*100:.1f}%) for {consecutive} consecutive readings. "
                f"Inspection recommended."
            )
        elif gap > self.gap_threshold:
            return (
                f"⚠️ {equipment} performance below expected (PR: {pr:.1f}%, gap: {gap*100:.1f}%). "
                f"Monitoring — {consecutive}/{self.persistence_count} consecutive low readings."
            )
        elif gap > 0.10:
            return (
                f"ℹ️ {equipment} performance slightly below expected (PR: {pr:.1f}%). "
                f"Within acceptable range."
            )
        else:
            return f"✅ {equipment} performing normally (PR: {pr:.1f}%)."


# Module-level singleton
maintenance_monitor = MaintenanceMonitor()
