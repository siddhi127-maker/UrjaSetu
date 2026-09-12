"""
UrjaSetu Backend Verification Test Suite
Tests:
  1. DB init and synthetic seeding
  2. Weather and forecast APIs
  3. Dispatch and optimization (rule_based, lp, milp)
  4. What-if scenario simulation with diesel_unavailable
  5. Blackout risk prediction
  6. Battery status and history
  7. Alerts and performance
"""

import sys
import asyncio
from datetime import datetime
from fastapi.testclient import TestClient

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.main import app
from app.database import init_db, SessionLocal
from app.models.db_models import EnergyRecord, DispatchLog

def run_tests():
    print("🚀 Starting UrjaSetu Verification Tests...")
    
    with TestClient(app) as client:
        # 1. Root
        res = client.get("/")
        assert res.status_code == 200, f"Root failed: {res.text}"
        print("  ✅ GET / : OK")

        # 2. Database verification
        db = SessionLocal()
        records_count = db.query(EnergyRecord).count()
        db.close()
        print(f"  ✅ Database: {records_count} synthetic records found")
        assert records_count >= 720, "Expected at least 720 synthetic records"

        # 3. Forecast endpoint
        res = client.get("/api/forecast?hours=24")
        assert res.status_code == 200, f"Forecast failed: {res.text}"
        data = res.json()
        assert len(data["solar_forecast"]) == 24
        assert len(data["wind_forecast"]) == 24
        assert len(data["demand_forecast"]) == 24
        print("  ✅ GET /api/forecast?hours=24 : OK")

        # 4. Battery endpoint
        res = client.get("/api/battery")
        assert res.status_code == 200
        battery_data = res.json()
        assert "soc" in battery_data
        print(f"  ✅ GET /api/battery : SoC={battery_data['soc_percent']}%")

        # 5. Dispatch endpoint
        res = client.get("/api/dispatch")
        assert res.status_code == 200
        dispatch_data = res.json()
        assert "solar_kw" in dispatch_data
        print("  ✅ GET /api/dispatch : OK")

        # 6. Optimize endpoint (Rule-Based)
        res = client.post("/api/optimize", json={"hours_ahead": 24, "optimizer_type": "rule_based"})
        assert res.status_code == 200
        opt_rb = res.json()
        assert len(opt_rb["decisions"]) == 24
        print(f"  ✅ POST /api/optimize (rule_based) : Cost=₹{opt_rb['total_cost']}")

        # 7. Optimize endpoint (LP)
        res = client.post("/api/optimize", json={"hours_ahead": 24, "optimizer_type": "lp"})
        assert res.status_code == 200
        opt_lp = res.json()
        assert len(opt_lp["decisions"]) == 24
        print(f"  ✅ POST /api/optimize (lp) : Cost=₹{opt_lp['total_cost']}")

        # 8. Optimize endpoint (MILP)
        res = client.post("/api/optimize", json={"hours_ahead": 24, "optimizer_type": "milp"})
        assert res.status_code == 200
        opt_milp = res.json()
        assert len(opt_milp["decisions"]) == 24
        print(f"  ✅ POST /api/optimize (milp) : Cost=₹{opt_milp['total_cost']}")

        # 9. Scenario simulation normal vs diesel_unavailable
        res = client.post("/api/scenario", json={"hours": 24, "diesel_unavailable": False})
        assert res.status_code == 200
        scen_normal = res.json()

        res_no_diesel = client.post("/api/scenario", json={"hours": 24, "diesel_unavailable": True})
        assert res_no_diesel.status_code == 200
        scen_no_diesel = res_no_diesel.json()
        
        diesel_liters_normal = scen_normal["scenario"]["total_diesel_liters"]
        diesel_liters_no_diesel = scen_no_diesel["scenario"]["total_diesel_liters"]
        assert diesel_liters_no_diesel == 0.0, f"Diesel should be 0 when diesel_unavailable=True, got {diesel_liters_no_diesel}"
        print(f"  ✅ POST /api/scenario (diesel_unavailable=True) : Diesel Liters={diesel_liters_no_diesel} (properly 0.0)")

        # 10. Blackout risk endpoint
        res = client.get("/api/blackout-risk?hours=12")
        assert res.status_code == 200
        risk_data = res.json()
        assert "risk_level" in risk_data
        print(f"  ✅ GET /api/blackout-risk : Level={risk_data['risk_level']}")

        # 11. KPI endpoint
        res = client.get("/api/kpi")
        assert res.status_code == 200
        kpi_data = res.json()
        assert "cost_saved" in kpi_data
        print(f"  ✅ GET /api/kpi : Cost Saved=₹{kpi_data['cost_saved']}")

        # 12. History endpoint
        res = client.get("/api/history?range=week")
        assert res.status_code == 200
        hist_data = res.json()
        assert "records" in hist_data
        print(f"  ✅ GET /api/history : {len(hist_data['records'])} records returned")

        # 13. Performance & Alerts
        res = client.get("/api/performance")
        assert res.status_code == 200
        print("  ✅ GET /api/performance : OK")

        res = client.get("/api/alerts")
        assert res.status_code == 200
        print("  ✅ GET /api/alerts : OK")

    print("\n🎉 ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
