<div align="center">
<img width="1600" height="712" alt="WhatsApp Image 2026-09-13 at 9 17 58 AM" src="https://github.com/user-attachments/assets/cbe3f0b4-c59b-4b54-ac3f-b6169a6178e4" />


# UrjaSetu

**AI-driven dispatch engine for solar–wind–battery–diesel microgrids**

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](#contributing)

Built by **Team Tatva** for **HackOut'26** — *Renewable Energy Intelligence*

[Overview](#overview) • [Features](#features) • [Architecture](#architecture) • [Getting Started](#getting-started) • [API](#api-reference) • [Tech Stack](#tech-stack) • [Contributing](#contributing)

</div>

---

## Overview

Off-grid microgrids already have the hardware they need — solar arrays, wind turbines, battery banks, and a diesel genset as backup. What's usually missing is the intelligence layer that decides, cycle by cycle, how to combine them.

Most sites today run on a **fixed schedule** (e.g. diesel from 6–9 PM) or an **operator's judgment call**. Both approaches lead to the same three failure modes:

| Failure | Cause |
|---|---|
| Diesel burned unnecessarily | No visibility into whether renewables already covered the load |
| Batteries degrade prematurely | Dispatch logic optimizes for today's cost, ignoring long-term wear |
| Unplanned blackouts | No forward-looking check for an upcoming supply shortfall |

**UrjaSetu** replaces guesswork with a re-optimizing dispatch engine: it forecasts solar, wind, and demand a few hours out, computes the lowest-cost and lowest-emission mix of sources, tracks battery health explicitly in its cost function, predicts blackout risk before it happens, and attaches a plain-language explanation to every decision it makes.

## Features

- **Forecasting** — solar, wind, and demand, driven by live weather data with an offline synthetic fallback
- **Dispatch optimization** — switchable rule-based engine or LP/MILP solver (`PuLP` / `scipy.optimize.linprog`)
- **Battery intelligence** — real-time state-of-charge, health tracking, and a degradation-aware cost term
- **Blackout risk prediction** — forward-simulates upcoming cycles to flag shortfalls before they occur
- **Explainability layer** — every dispatch decision ships with a human-readable justification
- **What-if simulator** — test demand spikes, multi-day cloud cover, or equipment failure before they happen
- **Historical replay** — runs real past weather/load data through the optimizer for an auditable before/after
- **SMS alerts** — the same explanation text is deliverable over SMS (via Twilio) for low-connectivity sites
- **Predictive maintenance** — per-unit performance-ratio tracking with persistence checks to avoid false alarms
- **Role-based access** — JWT-secured operator and admin accounts

## Architecture


```text
  Weather API  ─┐
                 ├──▶  Forecasting Engine  ──▶  Optimization Engine  ◀── Battery State
  Demand History ┘                                     │
                                                         ▼
                                    Dispatch: Solar / Wind / Battery / Diesel
                                                         │
                                                         ▼
                                       Reliability & Blackout Check
                                                         │
                                                         ▼
                                          Explainability Layer
                                                    │         │
                                                    ▼         ▼
                                              Dashboard    SMS Alert
                                                    │
                                                    ▼
                                             History Log ──▶ (fed into next cycle's forecast)
```

The dispatch cycle re-runs every 15–60 minutes:

```text
Sense ──▶ Forecast ──▶ Optimize ──▶ Dispatch ──▶ Validate ──▶ Display ──┐
  ▲                                                                     │
  └─────────────────────────────  loop  ──────────────────────────────┘
```

### Optimization model

```text
minimize    diesel_cost + emissions_penalty + battery_degradation_cost

subject to  solar + wind + battery_discharge + diesel  ≥  demand      (every timestep)
            battery_SoC                                 ≥  safety_floor (~20%)
            diesel_runtime                               ≥  min_runtime
            remaining_fuel                                ≥  0
```

## Screenshot

<p align="center">
  <img width="1600" height="736" alt="dash" src="https://github.com/user-attachments/assets/f1726ccd-b1ba-462d-b0fc-e9d3f03326f6" />
  <img width="1600" height="738" alt="live" src="https://github.com/user-attachments/assets/abd8603e-00e3-4248-98ae-d57bcd5921ec" />
   <img width="1600" height="729" alt="blackout" src="https://github.com/user-attachments/assets/a4742d80-9838-4228-9d25-35b3a5c3d4be" />
   <img width="1600" height="668" alt="whatif" src="https://github.com/user-attachments/assets/657ed016-e690-47ae-adf1-128e68c33cbe" />
   <img width="1600" height="712" alt="optimizer" src="https://github.com/user-attachments/assets/6af2aa49-0212-4e2c-b485-7c2c643aefa6" />



</p>

<p align="center"><em>Live cost, CO₂ avoided, and reliability metrics with a plain-language explanation panel.</em></p>

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- (Optional) an [OpenWeatherMap](https://openweathermap.org/api) API key for live weather

### Backend

\`\`\`bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
\`\`\`

On first run the backend will:
1. Create the SQLite database
2. Seed 31 days × 24 hours of synthetic energy data
3. Create a default admin account — \`admin\` / \`admin123\` (**change this before any real deployment**)

API and interactive Swagger docs are served at \`http://localhost:8000/docs\`.

### Frontend

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

Dashboard runs at \`http://localhost:5173\`.

### Environment variables (optional)

\`\`\`bash
# backend/.env
OPENWEATHERMAP_API_KEY=your_key_here
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
\`\`\`

Without these, the backend falls back to synthetic weather and disables SMS alerts — the app runs fully offline.

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| \`POST\` | \`/api/auth/login\` | Authenticate and receive a JWT |
| \`POST\` | \`/api/auth/signup\` | Create a new operator account |
| \`GET\`  | \`/api/forecast\` | Solar + wind + demand forecast |
| \`GET\`  | \`/api/weather\` | Current weather conditions |
| \`GET\`  | \`/api/demand\` | Demand forecast |
| \`GET\`  | \`/api/battery\` | Battery state-of-charge status |
| \`GET\`  | \`/api/dispatch\` | Current dispatch decision |
| \`POST\` | \`/api/optimize\` | Run optimization (\`rule_based\` \| \`lp\` \| \`milp\`) |
| \`GET\`  | \`/api/blackout-risk\` | Blackout risk prediction |
| \`GET\`  | \`/api/kpi\` | Dashboard KPIs |
| \`GET\`  | \`/api/alerts\` | Active alerts |
| \`GET\`  | \`/api/performance\` | Equipment performance ratios |
| \`POST\` | \`/api/scenario\` | Run a what-if simulation |
| \`GET\`  | \`/api/history\` | Historical dispatch data |

Full interactive documentation is generated automatically at \`/docs\` once the backend is running.

## Tech Stack

| Layer | Technology |
|---|---|
| Optimization | Python, PuLP, SciPy (\`linprog\`) |
| ML / Forecasting | scikit-learn, NumPy, pandas |
| Backend | FastAPI, SQLAlchemy, Pydantic, PyJWT |
| Frontend | React 19, Vite, React Router, Recharts |
| Database | SQLite (SQLAlchemy + aiosqlite) |
| Weather | OpenWeatherMap API |
| Alerts | Twilio |

## Project Structure


```text
UrjaSetu/
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py               # FastAPI entrypoint, startup & seeding
│       ├── member1_optimizer/    # Rule-based + LP/MILP dispatch, battery, blackout risk
│       ├── member3_forecast/     # Solar, wind, demand forecasting + weather API
│       ├── member4_explain/      # Explainability engine, alerts, predictive maintenance
│       ├── member4_synthetic/    # Synthetic data generator
│       ├── models/               # SQLAlchemy + Pydantic schemas
│       └── routers/              # API route handlers
└── frontend/
    ├── package.json
    └── src/
        ├── pages/                # Dashboard, Dispatch, Forecast, Scenarios, History, Admin
        ├── components/           # KPI cards, charts, gauges, alerts
        └── utils/, hooks/        # API client, auth, data hooks
```

## Roadmap

- [ ] Live BMS (battery management system) ingestion, in addition to simulated data
- [ ] Full LP/MILP solver as default, with rule-based engine as fallback
- [ ] Demand-side load shifting for flexible loads (irrigation, cold storage)
- [ ] Multi-site fleet view for NGOs managing several microgrids

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a pull request.

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/your-feature\`)
3. Commit your changes
4. Open a pull request

## Team Tatva

| Area | Scope |
|---|---|
| Core Backend & Optimization | Rule-based + LP/MILP dispatch, battery SoC, blackout prediction |
| Frontend Dashboard | React dashboard, charts, what-if simulator, history |
| Forecasting | Solar/wind/demand forecasting, weather API integration |
| Explainability & AI | Plain-language explanations, alerts, predictive maintenance, synthetic data |

## License

Distributed under the MIT License. See [\`LICENSE\`](LICENSE) for details.
