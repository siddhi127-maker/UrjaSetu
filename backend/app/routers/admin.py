"""
API Router — Admin Management endpoints (admin-only)
GET    /api/admin/users          — List all users
PUT    /api/admin/users/{id}/role — Change user role
DELETE /api/admin/users/{id}      — Deactivate user
GET    /api/dataset-info          — Dataset schema and metadata
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user_models import User
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/api", tags=["Admin"])


# ── Request Schemas ──────────────────────────────────────────────────────

class RoleUpdate(BaseModel):
    role: str  # "operator" or "admin"


# ── Admin Endpoints ──────────────────────────────────────────────────────

@router.get("/admin/users")
async def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all registered users (admin only)."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return {
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": len(users),
    }


@router.put("/admin/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    update: RoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Change a user's role (admin only)."""
    if update.role not in ("operator", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'operator' or 'admin'")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from demoting themselves
    if user.id == admin.id and update.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot demote yourself")

    user.role = update.role
    db.commit()

    return {
        "message": f"User '{user.username}' role updated to '{update.role}'",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
        },
    }


@router.delete("/admin/users/{user_id}")
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Deactivate a user account (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from deactivating themselves
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user.is_active = not user.is_active
    db.commit()

    status = "activated" if user.is_active else "deactivated"
    return {
        "message": f"User '{user.username}' {status}",
        "user": {
            "id": user.id,
            "username": user.username,
            "is_active": user.is_active,
        },
    }


# ── Dataset Info (public) ───────────────────────────────────────────────

@router.get("/dataset-info")
async def get_dataset_info():
    """Return dataset schema, column descriptions, and embedded scenarios."""
    return {
        "name": "UrjaSetu Microgrid Energy Dataset",
        "description": "Synthetic hourly energy data for a rural Indian village microgrid",
        "records": "31 days x 24 hours = 744 rows",
        "table": "energy_records",
        "columns": [
            {"name": "timestamp", "type": "DateTime", "unit": "—", "description": "Hourly timestamp"},
            {"name": "solar_irradiance", "type": "Float", "unit": "W/m²", "description": "Solar irradiance at panel surface"},
            {"name": "cloud_cover", "type": "Float", "unit": "0–1", "description": "Cloud cover fraction"},
            {"name": "temperature", "type": "Float", "unit": "°C", "description": "Ambient temperature"},
            {"name": "wind_speed", "type": "Float", "unit": "m/s", "description": "Wind speed at hub height"},
            {"name": "solar_generation", "type": "Float", "unit": "kWh", "description": "Solar panel output (E = P × G/Gref × η)"},
            {"name": "wind_generation", "type": "Float", "unit": "kWh", "description": "Wind turbine output (cubic power curve)"},
            {"name": "demand", "type": "Float", "unit": "kWh", "description": "Village electricity demand"},
            {"name": "battery_soc", "type": "Float", "unit": "0–1", "description": "Battery state of charge after dispatch"},
            {"name": "battery_charge", "type": "Float", "unit": "kWh", "description": "Energy charged into battery"},
            {"name": "battery_discharge", "type": "Float", "unit": "kWh", "description": "Energy discharged from battery"},
            {"name": "diesel_generation", "type": "Float", "unit": "kWh", "description": "Diesel generator output"},
            {"name": "fuel_consumed", "type": "Float", "unit": "liters", "description": "Diesel fuel consumed"},
            {"name": "total_cost", "type": "Float", "unit": "₹", "description": "Diesel + battery degradation cost"},
            {"name": "co2_emissions", "type": "Float", "unit": "kg CO₂", "description": "Carbon emissions from diesel"},
            {"name": "equipment_degradation", "type": "Float", "unit": "0–1", "description": "Equipment health loss (0 = perfect)"},
            {"name": "is_synthetic", "type": "Boolean", "unit": "—", "description": "True for generated data"},
        ],
        "scenarios": [
            {"days": "0–4", "type": "sunny", "description": "Clear sky, high solar generation"},
            {"days": "5–7", "type": "cloudy", "description": "3 consecutive cloudy days, 80% cloud cover"},
            {"days": "8–11", "type": "mixed", "description": "Mix of sunny and partly cloudy"},
            {"days": "12", "type": "festival", "description": "60% demand spike (village festival)"},
            {"days": "18", "type": "high_wind", "description": "High wind day (12 m/s base speed)"},
            {"days": "22", "type": "low_wind", "description": "Calm day (2 m/s base speed)"},
            {"days": "26–30", "type": "degraded", "description": "Equipment degradation (health 1.0 → 0.7)"},
        ],
        "configuration": {
            "solar_capacity_kw": 100.0,
            "wind_capacity_kw": 50.0,
            "battery_capacity_kwh": 200.0,
            "diesel_capacity_kw": 75.0,
            "location": "Jaipur, Rajasthan (26.9°N, 75.8°E)",
        },
    }
