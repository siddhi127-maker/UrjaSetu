
⚡ UrjaSetu — Energy Bridge
AI-powered microgrid management for rural India, so the lights don't go out.

उर्जा सेतु — "the bridge to power"

Python FastAPI React Vite License

Overview · Prototype · Architecture · Quick Start · API · Team


⚡ What is UrjaSetu?

Millions of people in rural Indian villages depend on microgrids — small, local power systems stitching together solar panels, wind turbines, battery storage, and a diesel generator as backup. Running one well is a constant juggling act: when do you charge the battery, when do you discharge it, and when do you reluctantly fire up the diesel genset? Get it wrong and villages face blackouts or waste money burning diesel that solar could've covered for free.

UrjaSetu is the operator's co-pilot. It forecasts solar, wind, and demand for the hours ahead, runs an optimizer to decide the cheapest, greenest dispatch plan, tracks battery health in real time, predicts blackouts before they happen — and explains why it made every decision, in plain language, on a single dashboard.

Built for a hackathon. Built to actually work.

Highlights
🔮 Forecasting — solar & wind generation and demand, powered by live weather data (with a synthetic fallback so it never breaks)
🧮 Dispatch optimization — choose between a fast rule-based engine or LP/MILP optimization via PuLP for a provably (near-)optimal plan
🔋 Battery intelligence — real-time state-of-charge, health tracking, and charge/discharge scheduling
🚨 Blackout prediction — forward-simulates state of charge to flag risk before the power goes out
🤖 Explainability layer — every dispatch decision comes with a human-readable "why," not just a number
🔬 What-if scenarios — simulate demand spikes, cloudy days, or equipment failure before they happen for real
🔐 Role-based auth — JWT-secured operator/admin accounts, so the dashboard is safe to hand to a real village operator
🛠️ Predictive maintenance & alerts — surfaces equipment performance drops before they become outages
🖼️ Prototype
<div align="center"> <img src="docs/images/dashboard-preview.svg" alt="UrjaSetu dashboard prototype — dark glassmorphism UI showing KPI cards, energy mix donut chart, battery gauge, hourly dispatch bars, and an AI explainability panel" width="100%">

Live operator dashboard — KPIs, energy mix, battery gauge, hourly dispatch, and AI-generated explanations, all on one screen.

</div>

The dashboard runs as a dark, glassmorphic React app (see frontend/src/index.css for the full design system) — the preview above is rendered from that same palette. Spin it up yourself with the Quick Start below to see it live with real data.

🏗️ Architecture
                     ┌────────────────────┐
  Weather APIs  ───▶ │   Forecasting (M3)  │
  (OpenWeatherMap)   │  solar·wind·demand   │
                     └──────────┬───────────┘
                                ▼
                     ┌────────────────────┐
                     │  Optimization (M1)  │
                     │ rule-based / LP·MILP │
                     │  battery · blackout  │
                     └──────────┬───────────┘
                                ▼
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
   ┌───────────────────┐ ┌─────────────┐ ┌──────────────────┐
   │  Dashboard (M2)    │ │  Explain-    │ │  SQLite Database  │
   │  React · Recharts  │ │  ability &   │ │  history · users   │
   │  operator UI        │ │  Alerts (M4) │ │                    │
   └───────────────────┘ └─────────────┘ └──────────────────┘

Each numbered module (M1–M4) maps directly to a package under backend/app/ and was owned by one team member — see Team.

🚀 Quick Start
Backend (FastAPI)
bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

On first run, the backend automatically:

Creates the SQLite database tables
Seeds 31 days × 24 hours of synthetic energy data
Creates a default admin account (admin / admin123 — change this before any real deployment!)
Serves the API at http://localhost:8000 (interactive docs at /docs)
Frontend (React + Vite)
bash
cd frontend
npm install
npm run dev

Dashboard opens at http://localhost:5173 — log in with the seeded admin account or sign up as a new operator.

Optional: live weather data
bash
# backend/.env
OPENWEATHERMAP_API_KEY=your_key_here

No key? No problem — forecasting falls back to realistic synthetic weather so the app runs fully offline.

📡 API Reference
Method	Endpoint	Description
POST	/api/auth/login	Authenticate, returns JWT
POST	/api/auth/signup	Create a new operator account
GET	/api/forecast	Solar + wind + demand forecast
GET	/api/weather	Current weather data
GET	/api/demand	Demand forecast
GET	/api/battery	Battery SoC status
GET	/api/dispatch	Current dispatch decision
POST	/api/optimize	Run optimization (rule_based / lp / milp)
GET	/api/blackout-risk	Blackout risk prediction
GET	/api/kpi	Dashboard KPIs
GET	/api/alerts	Active alerts
GET	/api/performance	Equipment performance ratios
POST	/api/scenario	What-if simulation
GET	/api/history	Historical data

Full interactive documentation (Swagger UI) is generated automatically at http://localhost:8000/docs once the backend is running.

🧰 Tech Stack
Layer	Technology
Backend	Python 3.11+ · FastAPI · SQLAlchemy · Pydantic
Optimization	PuLP (LP/MILP) · custom rule-based engine
ML / Forecasting	scikit-learn · NumPy · pandas
Auth	PyJWT, password hashing
Frontend	React 19 · Vite 8 · React Router · Recharts
Database	SQLite (via SQLAlchemy + aiosqlite)
Weather	OpenWeatherMap API (with synthetic fallback)
Alerts	Twilio (SMS, optional)
📁 Project Structure
UrjaSetu/
├── backend/
│   └── app/
│       ├── main.py                  # FastAPI entrypoint, startup & seeding
│       ├── member1_optimizer/       # Rule-based + LP/MILP dispatch, battery, blackout risk
│       ├── member3_forecast/        # Solar, wind, demand forecasting + weather API
│       ├── member4_explain/         # Explainability engine, alerts, predictive maintenance
│       ├── member4_synthetic/       # Synthetic data generator
│       ├── models/                  # SQLAlchemy + Pydantic schemas
│       └── routers/                 # API route handlers
└── frontend/
    └── src/
        ├── pages/                   # Dashboard, Dispatch, Forecast, Scenarios, History, Admin
        ├── components/              # KPI cards, charts, gauges, alerts
        └── utils/ hooks/            # API client, auth, data hooks
👥 Team
Member	Role	Key Deliverables
M1	Core Backend & Optimization	Rule-based + LP/MILP dispatch, battery SoC, blackout prediction
M2	Frontend Dashboard	React dashboard, charts, what-if simulator, history
M3	Forecasting Module	Solar/wind/demand forecasting, weather API integration
M4	Explainability & AI	Template-based explanations, alerts, predictive maintenance, synthetic data


Built with ⚡ for villages that deserve reliable power.

</div>

