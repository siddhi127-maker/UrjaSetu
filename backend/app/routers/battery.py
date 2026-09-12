"""
API Router — Battery endpoints
GET /api/battery          — Current battery status
GET /api/battery/history  — Battery SoC history
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.member1_optimizer.battery import battery_model
from app.models.db_models import BatteryState, EnergyRecord

router = APIRouter(prefix="/api", tags=["Battery"])


@router.get("/battery")
async def get_battery_status():
    """Get current battery state of charge and health."""
    return battery_model.get_status()


@router.get("/battery/history")
async def get_battery_history(
    limit: int = Query(default=168, ge=1, le=720),
    db: Session = Depends(get_db),
):
    """Get battery SoC history."""
    # Try battery_states table first
    states = (
        db.query(BatteryState)
        .order_by(BatteryState.timestamp.desc())
        .limit(limit)
        .all()
    )

    if states:
        return {
            "history": [
                {
                    "timestamp": s.timestamp.isoformat(),
                    "soc": round(s.soc * 100, 1),
                    "charge_kwh": s.charge_kwh,
                    "discharge_kwh": s.discharge_kwh,
                    "health": round(s.health * 100, 1),
                }
                for s in reversed(states)
            ]
        }

    # Fallback to energy_records
    records = (
        db.query(EnergyRecord.timestamp, EnergyRecord.battery_soc,
                 EnergyRecord.battery_charge, EnergyRecord.battery_discharge)
        .order_by(EnergyRecord.timestamp.desc())
        .limit(limit)
        .all()
    )

    return {
        "history": [
            {
                "timestamp": r.timestamp.isoformat(),
                "soc": round(r.battery_soc * 100, 1),
                "charge_kwh": r.battery_charge,
                "discharge_kwh": r.battery_discharge,
                "health": 100.0,
            }
            for r in reversed(records)
        ]
    }
