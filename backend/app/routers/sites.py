"""
API Router — Microgrid Sites & Configuration Presets Across India
GET  /api/sites         — List available microgrid site presets across India
GET  /api/sites/{id}    — Get site profile details
"""

from typing import List, Dict
from fastapi import APIRouter, HTTPException
from app.models.schemas import SiteProfile

router = APIRouter(prefix="/api/sites", tags=["Sites"])

SITE_PRESETS: Dict[str, SiteProfile] = {
    "rampur_village": SiteProfile(
        id="rampur_village",
        name="Rampur Rural Microgrid",
        location="Uttar Pradesh (Lat: 28.80°N, Lon: 79.02°E)",
        description="Core agricultural village microgrid with solar PV, wind, battery storage, and backup diesel genset.",
        solar_capacity_kw=160.0,
        wind_capacity_kw=50.0,
        battery_capacity_kwh=220.0,
        diesel_capacity_kw=120.0,
        diesel_cost_per_l=95.0,
        critical_load_ratio=0.45,
        icon="🏡",
    ),
    "kalyanpura": SiteProfile(
        id="kalyanpura",
        name="Kalyanpura Village Microgrid",
        location="Gujarat (Lat: 23.02°N, Lon: 72.57°E)",
        description="Semi-arid agricultural community microgrid with solar, wind, battery, and backup diesel.",
        solar_capacity_kw=250.0,
        wind_capacity_kw=100.0,
        battery_capacity_kwh=200.0,
        diesel_capacity_kw=150.0,
        diesel_cost_per_l=95.0,
        critical_load_ratio=0.4,
        icon="🌾",
    ),
    "barmer_desert": SiteProfile(
        id="barmer_desert",
        name="Barmer Thar Desert Microgrid",
        location="Rajasthan (Lat: 25.75°N, Lon: 71.40°E)",
        description="High-irradiance desert renewable hybrid grid supplying remote border communities.",
        solar_capacity_kw=400.0,
        wind_capacity_kw=150.0,
        battery_capacity_kwh=350.0,
        diesel_capacity_kw=200.0,
        diesel_cost_per_l=98.0,
        critical_load_ratio=0.35,
        icon="☀️",
    ),
    "leh_ladakh": SiteProfile(
        id="leh_ladakh",
        name="Leh Himalayan Cold Desert Grid",
        location="Ladakh (Lat: 34.15°N, Lon: 77.57°E)",
        description="High-altitude alpine solar & battery storage system with low-temperature battery thermal management.",
        solar_capacity_kw=300.0,
        wind_capacity_kw=50.0,
        battery_capacity_kwh=300.0,
        diesel_capacity_kw=120.0,
        diesel_cost_per_l=110.0,
        critical_load_ratio=0.6,
        icon="🏔️",
    ),
    "sundarbans_hub": SiteProfile(
        id="sundarbans_hub",
        name="Sundarbans Off-Grid Island Hub",
        location="West Bengal (Lat: 21.94°N, Lon: 88.90°E)",
        description="Isolated island microgrid supporting local market, solar water purification, and fishing cold chain.",
        solar_capacity_kw=180.0,
        wind_capacity_kw=90.0,
        battery_capacity_kwh=250.0,
        diesel_capacity_kw=180.0,
        diesel_cost_per_l=100.0,
        critical_load_ratio=0.5,
        icon="🏝️",
    ),
    "wayanad_hills": SiteProfile(
        id="wayanad_hills",
        name="Wayanad Western Ghats Microgrid",
        location="Kerala (Lat: 11.68°N, Lon: 76.13°E)",
        description="Monsoon-resilient microgrid with hydro/wind support and plantation cold storage.",
        solar_capacity_kw=120.0,
        wind_capacity_kw=80.0,
        battery_capacity_kwh=180.0,
        diesel_capacity_kw=100.0,
        diesel_cost_per_l=97.0,
        critical_load_ratio=0.45,
        icon="⛰️",
    ),
    "koraput_highlands": SiteProfile(
        id="koraput_highlands",
        name="Koraput Tribal Highland Grid",
        location="Odisha (Lat: 18.81°N, Lon: 82.71°E)",
        description="Highland village community grid powering primary health centers and agricultural pumps.",
        solar_capacity_kw=160.0,
        wind_capacity_kw=60.0,
        battery_capacity_kwh=220.0,
        diesel_capacity_kw=120.0,
        diesel_cost_per_l=96.0,
        critical_load_ratio=0.5,
        icon="🏕️",
    ),
    "kutch_mega": SiteProfile(
        id="kutch_mega",
        name="Kutch Coastal Mega Hybrid Microgrid",
        location="Gujarat (Lat: 23.73°N, Lon: 69.85°E)",
        description="High-capacity coastal wind and solar microgrid for salt production and desalination.",
        solar_capacity_kw=500.0,
        wind_capacity_kw=250.0,
        battery_capacity_kwh=500.0,
        diesel_capacity_kw=300.0,
        diesel_cost_per_l=95.0,
        critical_load_ratio=0.4,
        icon="💨",
    ),
    "kanyakumari_wind": SiteProfile(
        id="kanyakumari_wind",
        name="Kanyakumari Southern Cape Wind & Solar",
        location="Tamil Nadu (Lat: 8.08°N, Lon: 77.53°E)",
        description="Coastal high-wind resource grid with continuous sea breeze generation profile.",
        solar_capacity_kw=200.0,
        wind_capacity_kw=300.0,
        battery_capacity_kwh=400.0,
        diesel_capacity_kw=150.0,
        diesel_cost_per_l=96.0,
        critical_load_ratio=0.35,
        icon="🌀",
    )
}

@router.get("", response_model=List[SiteProfile])
async def list_sites():
    """List all available microgrid site presets across India."""
    return list(SITE_PRESETS.values())

@router.get("/{site_id}", response_model=SiteProfile)
async def get_site(site_id: str):
    """Get profile details for a specific site."""
    if site_id not in SITE_PRESETS:
        raise HTTPException(status_code=404, detail="Site profile not found")
    return SITE_PRESETS[site_id]
