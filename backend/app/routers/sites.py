"""
API Router — Microgrid Sites & Configuration Presets
GET  /api/sites         — List available microgrid site presets
GET  /api/sites/{id}    — Get site profile details
"""

from typing import List, Dict
from fastapi import APIRouter, HTTPException
from app.models.schemas import SiteProfile

router = APIRouter(prefix="/api/sites", tags=["Sites"])

SITE_PRESETS: Dict[str, SiteProfile] = {
    "rampur_village": SiteProfile(
        id="rampur_village",
        name="Rampur Village Microgrid",
        location="Uttar Pradesh",
        description="Community microgrid supporting 200 households, solar, wind, battery, and backup diesel generator.",
        solar_capacity_kw=250.0,
        wind_capacity_kw=100.0,
        battery_capacity_kwh=200.0,
        diesel_capacity_kw=150.0,
        diesel_cost_per_l=95.0,
        critical_load_ratio=0.4,
        icon="🌾",
    ),
    "kalka_health": SiteProfile(
        id="kalka_health",
        name="Kalka Regional Health Centre",
        location="Haryana",
        description="High-reliability medical microgrid for vaccine cold storage, ICU equipment, and operational facilities.",
        solar_capacity_kw=150.0,
        wind_capacity_kw=50.0,
        battery_capacity_kwh=300.0,
        diesel_capacity_kw=100.0,
        diesel_cost_per_l=95.0,
        critical_load_ratio=0.7,
        icon="🏥",
    ),
    "sundarbans_hub": SiteProfile(
        id="sundarbans_hub",
        name="Sundarbans Off-Grid Island Hub",
        location="West Bengal",
        description="Isolated island microgrid supporting local market, solar water purification, and fishing cold chain.",
        solar_capacity_kw=300.0,
        wind_capacity_kw=150.0,
        battery_capacity_kwh=400.0,
        diesel_capacity_kw=200.0,
        diesel_cost_per_l=100.0,
        critical_load_ratio=0.5,
        icon="🏝️",
    ),
}

@router.get("", response_model=List[SiteProfile])
async def list_sites():
    """List all available microgrid site presets."""
    return list(SITE_PRESETS.values())

@router.get("/{site_id}", response_model=SiteProfile)
async def get_site(site_id: str):
    """Get profile details for a specific site."""
    if site_id not in SITE_PRESETS:
        raise HTTPException(status_code=404, detail="Site profile not found")
    return SITE_PRESETS[site_id]
