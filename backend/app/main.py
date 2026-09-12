"""
UrjaSetu — Microgrid Energy Management System
===============================================
FastAPI application entry point.

On startup:
  1. Initialize database tables
  2. Seed with synthetic data if empty
  3. Register all API routers
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, SessionLocal
from app.models.db_models import EnergyRecord
from app.member4_synthetic.data_generator import generate_synthetic_dataset
from app.routers import forecast, optimize, battery, alerts, history

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-28s │ %(levelname)-8s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("urjasetu")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle events."""
    # ── Startup ──────────────────────────────────────────────
    logger.info("⚡ UrjaSetu starting up...")

    # Initialize database
    init_db()
    logger.info("✅ Database initialized")

    # Seed synthetic data if empty
    db = SessionLocal()
    try:
        count = db.query(EnergyRecord).count()
        if count == 0:
            logger.info("📊 Seeding synthetic data (30 days × 24 hours)...")
            data = generate_synthetic_dataset(days=30)

            for record in data:
                db.add(EnergyRecord(**record))
            db.commit()

            logger.info(f"✅ Seeded {len(data)} synthetic energy records")
        else:
            logger.info(f"📊 Database has {count} existing records")
    finally:
        db.close()

    logger.info("🚀 UrjaSetu ready — API docs at http://localhost:8000/docs")

    yield

    # ── Shutdown ─────────────────────────────────────────────
    logger.info("⚡ UrjaSetu shutting down...")


# ── Create FastAPI app ───────────────────────────────────────────────────

app = FastAPI(
    title="UrjaSetu",
    description=(
        "Microgrid Energy Management System — "
        "Optimizing renewable energy dispatch for rural Indian villages. "
        "Combines solar/wind forecasting, battery management, diesel optimization, "
        "and AI-powered explainability."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS middleware (allow React frontend) ───────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ────────────────────────────────────────────────────

app.include_router(forecast.router)
app.include_router(optimize.router)
app.include_router(battery.router)
app.include_router(alerts.router)
app.include_router(history.router)


# ── Root endpoint ────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "UrjaSetu",
        "version": "1.0.0",
        "description": "Microgrid Energy Management System",
        "docs": "/docs",
        "endpoints": {
            "forecast": "/api/forecast",
            "weather": "/api/weather",
            "demand": "/api/demand",
            "battery": "/api/battery",
            "dispatch": "/api/dispatch",
            "optimize": "/api/optimize",
            "blackout_risk": "/api/blackout-risk",
            "alerts": "/api/alerts",
            "performance": "/api/performance",
            "kpi": "/api/kpi",
            "history": "/api/history",
            "scenario": "/api/scenario",
        },
    }
