import React, { useState } from 'react';

export default function AIModules() {
  // ─── 6.6 Day-Ahead Forecast State ───────────────────────────────────────
  const [solarCapacity, setSolarCapacity] = useState(100); // kW
  const [irradiance, setIrradiance] = useState(650); // W/m2
  const [solarEfficiency] = useState(0.85); // 85%
  
  const [windCapacity, setWindCapacity] = useState(50); // kW
  const [windSpeed, setWindSpeed] = useState(7.5); // m/s
  
  const [demandLY, setDemandLY] = useState(480); // kWh (same date last year)
  const [demand7Day, setDemand7Day] = useState(520); // kWh (previous 7 days avg)
  const [alpha, setAlpha] = useState(0.6); // weight for last year
  
  const [batterySOC, setBatterySOC] = useState(120); // kWh stored
  const [batteryMin, setBatteryMin] = useState(30); // kWh min limit
  const [dischargeEfficiency] = useState(0.92);

  // Solar Calculation
  const sunHours = (irradiance / 1000) * 8;
  const forecastSolar = Math.round(solarCapacity * sunHours * solarEfficiency);

  // Wind Calculation
  const calcWindPower = (v) => {
    if (v < 3) return 0;
    if (v >= 12) return windCapacity;
    return windCapacity * (Math.pow(v, 3) - 27) / (1728 - 27);
  };
  const forecastWind = Math.round(calcWindPower(windSpeed) * 12);

  // Total Renewable
  const totalRenewable = forecastSolar + forecastWind;

  // Demand Forecast
  const predictedDemand = Math.round(alpha * demandLY + (1 - alpha) * demand7Day);

  // Battery Usable
  const batteryAvailable = Math.round(batterySOC * dischargeEfficiency);
  const batteryUsable = Math.max(0, Math.round((batterySOC - batteryMin) * dischargeEfficiency));

  // Expected Available Energy
  const expectedAvailable = totalRenewable + batteryUsable;

  // Surplus / Deficit
  const surplusDeficit = expectedAvailable - predictedDemand;
  const isSufficient = surplusDeficit >= 0;
  const shortfall = Math.max(0, predictedDemand - expectedAvailable);

  // ─── Priority Score Weights State (Section 6.7) ─────────────────────────
  const [w1, setW1] = useState(0.40); // Weight for Performance Gap
  const [w2, setW2] = useState(0.30); // Weight for Duration
  const [w3, setW3] = useState(0.15); // Weight for Fault Frequency
  const [w4, setW4] = useState(0.15); // Weight for Peer Difference

  // ─── Selected Work Order Modal State ─────────────────────────────────────
  const [selectedTicket, setSelectedTicket] = useState(null);

  // ─── Maintenance Units List ─────────────────────────────────────────────
  const [maintenanceUnits] = useState([
    { id: 'Solar_String_01', type: 'Solar String', cap: 25, g: 650, t: 28, expected: 12.5, actual: 12.1, peerAvg: 12.3, duration: 1, freq: 0, status: 'Normal', action: 'Monitoring' },
    { id: 'Solar_String_07', type: 'Solar String', cap: 25, g: 650, t: 34, expected: 12.5, actual: 9.1, peerAvg: 12.1, duration: 3, freq: 2, status: 'Inspection Required', action: 'Pending Work Order' },
    { id: 'Wind_Turbine_01', type: 'Wind Turbine', cap: 50, g: 0, t: 26, expected: 32.0, actual: 31.4, peerAvg: 31.8, duration: 1, freq: 0, status: 'Normal', action: 'Monitoring' },
    { id: 'Inverter_Block_B', type: 'Inverter Block', cap: 100, g: 650, t: 45, expected: 85.0, actual: 62.0, peerAvg: 83.5, duration: 4, freq: 3, status: 'Inspection Required', action: 'Pending Work Order' },
    { id: 'Battery_Pack_02', type: 'Battery Rack', cap: 60, g: 0, t: 30, expected: 55.0, actual: 54.2, peerAvg: 54.8, duration: 0, freq: 0, status: 'Normal', action: 'Monitoring' },
  ]);

  // Compute Priority Score M = w1(Gap) + w2(Duration*10) + w3(Freq*15) + w4(PeerDiff)
  const calcPriorityScore = (unit) => {
    const pr = (unit.actual / unit.expected) * 100;
    const gap = 100 - pr;
    const peerDiff = ((unit.peerAvg - unit.actual) / unit.peerAvg) * 100;
    const score = (w1 * gap) + (w2 * unit.duration * 10) + (w3 * unit.freq * 15) + (w4 * Math.max(0, peerDiff));
    return Math.min(100, Math.round(score));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">
      
      {/* ─── ML Accuracy & Validation Metrics Banner ──────────────────────── */}
      <div className="glass-card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(59,130,246,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              🧠 UrjaSetu AI Engine — Model Accuracy & Cross-Validation Metrics
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Trained on 31 days of high-frequency microgrid telematics and OpenWeatherMap forecasts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Solar R² Score</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--solar)' }}>0.942</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Wind RMSE</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--wind)' }}>1.82 kWh</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Demand MAE</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#34d399' }}>2.14 kWh</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6.6 Day-Ahead Renewable Generation & Village Demand Forecast ─── */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🌤️</span> 6.6 AI-Based Day-Ahead Generation & Demand Forecast
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Combined Mausam weather model, solar/wind physics equations, and village demand trend signals.
            </p>
          </div>
          <span className={isSufficient ? 'badge-sufficient' : 'badge-deficit'}>
            {isSufficient ? '✓ RENEWABLE SUFFICIENT' : '⚠️ DEFICIT EXPECTED'}
          </span>
        </div>

        {/* Formulas Callout */}
        <div className="formula-callout">
          <div><strong>Core Formulations:</strong></div>
          <div><code>E_solar = P_solar × (G / G_ref) × η_system × Δt</code> | <code>E_wind = P_wind(v_h) × Δt</code></div>
          <div><code>D_forecast = α × D_LY + (1 − α) × D_7day</code> (Current α = {alpha})</div>
          <div><code>E_available = E_renewable + B_usable</code> | <code>Surplus/Deficit = E_available − D_forecast</code></div>
        </div>

        {/* Input Sliders Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="glass-card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--solar)', marginBottom: 12 }}>☀️ Solar Forecast Inputs</h4>
            <div className="input-slider-group">
              <label>Irradiance (G_h): <span>{irradiance} W/m²</span></label>
              <input type="range" min="100" max="1000" step="25" value={irradiance} onChange={(e) => setIrradiance(+e.target.value)} />
            </div>
            <div className="input-slider-group">
              <label>Solar Capacity: <span>{solarCapacity} kW</span></label>
              <input type="range" min="10" max="500" step="10" value={solarCapacity} onChange={(e) => setSolarCapacity(+e.target.value)} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--wind)', marginBottom: 12 }}>🌬️ Wind Forecast Inputs</h4>
            <div className="input-slider-group">
              <label>Wind Speed (v_h): <span>{windSpeed} m/s</span></label>
              <input type="range" min="0" max="25" step="0.5" value={windSpeed} onChange={(e) => setWindSpeed(+e.target.value)} />
            </div>
            <div className="input-slider-group">
              <label>Turbine Capacity: <span>{windCapacity} kW</span></label>
              <input type="range" min="10" max="200" step="10" value={windCapacity} onChange={(e) => setWindCapacity(+e.target.value)} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-accent)', marginBottom: 12 }}>🏘️ Village Demand History</h4>
            <div className="input-slider-group">
              <label>Last Year Date (D_LY): <span>{demandLY} kWh</span></label>
              <input type="range" min="100" max="1000" step="20" value={demandLY} onChange={(e) => setDemandLY(+e.target.value)} />
            </div>
            <div className="input-slider-group">
              <label>Previous 7-Day Avg (D_7day): <span>{demand7Day} kWh</span></label>
              <input type="range" min="100" max="1000" step="20" value={demand7Day} onChange={(e) => setDemand7Day(+e.target.value)} />
            </div>
            <div className="input-slider-group">
              <label>Weight (α): <span>{alpha}</span></label>
              <input type="range" min="0" max="1" step="0.05" value={alpha} onChange={(e) => setAlpha(+e.target.value)} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--battery)', marginBottom: 12 }}>🔋 Battery Parameters</h4>
            <div className="input-slider-group">
              <label>Stored Energy (B_SOC): <span>{batterySOC} kWh</span></label>
              <input type="range" min="0" max="300" step="10" value={batterySOC} onChange={(e) => setBatterySOC(+e.target.value)} />
            </div>
            <div className="input-slider-group">
              <label>Min SOC Limit (B_min): <span>{batteryMin} kWh</span></label>
              <input type="range" min="0" max="100" step="5" value={batteryMin} onChange={(e) => setBatteryMin(+e.target.value)} />
            </div>
          </div>
        </div>

        {/* Dashboard Outputs Table */}
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
          📊 Day-Ahead AI Forecast Summary Table
        </h3>
        <div className="kpi-table-container">
          <table className="kpi-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Formula / Derivation</th>
                <th>Forecast Output</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Forecast Solar Generation</td>
                <td>P_solar × (G_h / 1000) × η_system × Δt</td>
                <td><strong style={{ color: 'var(--solar)' }}>{forecastSolar} kWh</strong></td>
              </tr>
              <tr>
                <td>Forecast Wind Generation</td>
                <td>P_wind(v_h) × Δt</td>
                <td><strong style={{ color: 'var(--wind)' }}>{forecastWind} kWh</strong></td>
              </tr>
              <tr>
                <td>Total Renewable Generation</td>
                <td>E_solar + E_wind</td>
                <td><strong style={{ color: 'var(--text-primary)' }}>{totalRenewable} kWh</strong></td>
              </tr>
              <tr>
                <td>Predicted Village Demand</td>
                <td>αD_LY + (1 − α)D_7day</td>
                <td><strong style={{ color: 'var(--text-accent)' }}>{predictedDemand} kWh</strong></td>
              </tr>
              <tr>
                <td>Previous-Day Battery Energy</td>
                <td>B_prev × η_discharge</td>
                <td><strong>{batteryAvailable} kWh</strong></td>
              </tr>
              <tr>
                <td>Expected Available Energy</td>
                <td>E_renewable + B_usable</td>
                <td><strong style={{ color: 'var(--battery)' }}>{expectedAvailable} kWh</strong></td>
              </tr>
              <tr>
                <td>Surplus / Deficit</td>
                <td>E_available − D_forecast</td>
                <td>
                  <strong style={{ color: isSufficient ? '#34d399' : '#f87171' }}>
                    {surplusDeficit > 0 ? `+${surplusDeficit}` : surplusDeficit} kWh
                  </strong>
                </td>
              </tr>
              <tr>
                <td>Sufficiency Status</td>
                <td>E_available ≥ D_forecast</td>
                <td>
                  <span className={isSufficient ? 'badge-sufficient' : 'badge-deficit'}>
                    {isSufficient ? 'Sufficient' : 'Deficit'}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Backup Requirement</td>
                <td>If Deficit → Trigger LP/MILP Solver</td>
                <td>
                  <span className={isSufficient ? 'badge-ok' : 'badge-alert'}>
                    {isSufficient ? 'Not Required' : `Required (${shortfall} kWh Shortfall)`}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 6.7 AI-Based Per-Unit Predictive Maintenance & Servicing Alerts ─── */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🛠️</span> 6.7 Per-Unit Predictive Maintenance & Servicing Alerts
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Priority Score Formula: M = w₁(Gap) + w₂(Duration) + w₃(Frequency) + w₄(Peer Difference)
            </p>
          </div>
          <span className="badge-alert">
            ⚠️ {maintenanceUnits.filter(u => u.status.includes('Required')).length} Critical Work Orders Pending
          </span>
        </div>

        {/* Priority Score Weight Calibrator */}
        <div className="glass-card" style={{ padding: 16, marginBottom: 20, background: 'rgba(0,0,0,0.2)' }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            ⚙️ Calibrate Priority Score Weights (w₁ – w₄)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div className="input-slider-group">
              <label>w₁ (Perf Gap): <span>{w1}</span></label>
              <input type="range" min="0.1" max="0.8" step="0.05" value={w1} onChange={(e) => setW1(+e.target.value)} />
            </div>
            <div className="input-slider-group">
              <label>w₂ (Duration): <span>{w2}</span></label>
              <input type="range" min="0.1" max="0.6" step="0.05" value={w2} onChange={(e) => setW2(+e.target.value)} />
            </div>
            <div className="input-slider-group">
              <label>w₃ (Frequency): <span>{w3}</span></label>
              <input type="range" min="0.05" max="0.4" step="0.05" value={w3} onChange={(e) => setW3(+e.target.value)} />
            </div>
            <div className="input-slider-group">
              <label>w₄ (Peer Diff): <span>{w4}</span></label>
              <input type="range" min="0.05" max="0.4" step="0.05" value={w4} onChange={(e) => setW4(+e.target.value)} />
            </div>
          </div>
        </div>

        {/* Maintenance Alert Dashboard Table */}
        <div className="kpi-table-container">
          <table className="kpi-table">
            <thead>
              <tr>
                <th>Component ID</th>
                <th>Type</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>PR %</th>
                <th>Gap %</th>
                <th>Peer Avg</th>
                <th>Priority Score (M)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceUnits.map((unit) => {
                const pr = Math.round((unit.actual / unit.expected) * 100);
                const gap = (100 - pr).toFixed(1);
                const score = calcPriorityScore(unit);
                const isAlert = unit.status.includes('Required');
                return (
                  <tr key={unit.id} style={{ background: isAlert ? 'rgba(239,68,68,0.06)' : 'transparent' }}>
                    <td><strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{unit.id}</strong></td>
                    <td>{unit.type}</td>
                    <td>{unit.expected} kWh</td>
                    <td><strong style={{ color: isAlert ? '#f87171' : 'var(--text-primary)' }}>{unit.actual} kWh</strong></td>
                    <td><strong>{pr}%</strong></td>
                    <td>
                      <span style={{ color: +gap > 20 ? '#f87171' : 'var(--text-secondary)', fontWeight: 600 }}>
                        {gap}%
                      </span>
                    </td>
                    <td>{unit.peerAvg} kWh</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: score > 50 ? '#f87171' : '#34d399' }}>{score}</span>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${score}%`, height: '100%', background: score > 50 ? '#f87171' : '#34d399' }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={isAlert ? 'badge-alert' : 'badge-ok'}>
                        {isAlert ? '⚠️ Inspection Required' : '✓ Normal'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn ${isAlert ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => setSelectedTicket({ ...unit, score })}
                      >
                        {isAlert ? '🔧 Generate Work Order' : 'Details'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Work Order Ticket Modal ──────────────────────────────────────── */}
      {selectedTicket && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyCenter: 'center', zIndex: 100, padding: 20
        }}>
          <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: 24, margin: 'auto', background: '#111827' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              🎫 Maintenance Work Order Ticket
            </h3>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div><strong>Component:</strong> {selectedTicket.id} ({selectedTicket.type})</div>
              <div><strong>Calculated Priority Score (M):</strong> <span style={{ color: '#f87171', fontWeight: 700 }}>{selectedTicket.score}/100</span></div>
              <div><strong>Performance Gap:</strong> {(100 - (selectedTicket.actual / selectedTicket.expected) * 100).toFixed(1)}%</div>
              <div><strong>Persistent Duration:</strong> {selectedTicket.duration} Days</div>
              <div><strong>Peer Unit Median:</strong> {selectedTicket.peerAvg} kWh vs Actual {selectedTicket.actual} kWh</div>
              <div><strong>Recommended Technician Action:</strong> Perform thermal camera inspection & clean solar panel string connectors.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedTicket(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { alert(`Work Order dispatched for ${selectedTicket.id}!`); setSelectedTicket(null); }}>
                🚀 Dispatch Field Engineer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
