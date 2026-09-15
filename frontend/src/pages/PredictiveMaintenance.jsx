import React, { useState } from 'react';

export default function PredictiveMaintenance() {
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
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">🛠️ 6.7 Per-Unit Predictive Maintenance & Servicing Alerts</h1>
        <p className="page-subtitle">
          Real-time anomaly detection comparing actual vs. weather-adjusted expected generation and peer unit medians.
        </p>
      </div>

      {/* ─── 6.7 AI-Based Per-Unit Predictive Maintenance & Servicing Alerts ─── */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🛠️</span> Asset Health & Priority Score Calibrator
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
