import { useState } from 'react';
import { runScenario } from '../utils/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

export default function Scenarios() {
  const [cloudyDays, setCloudyDays] = useState(0);
  const [lowWind, setLowWind] = useState(false);
  const [highDemand, setHighDemand] = useState(false);
  const [dieselUnavailable, setDieselUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await runScenario({
        cloudyDays, lowWind, highDemand,
        dieselUnavailable, hours: 72,
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Build SoC comparison chart
  const socChart = [];
  if (result) {
    const normalDecs = result.normal?.decisions || [];
    const scenarioDecs = result.scenario?.decisions || [];
    const len = Math.max(normalDecs.length, scenarioDecs.length);
    for (let i = 0; i < len; i++) {
      socChart.push({
        hour: i,
        normal: (normalDecs[i]?.battery_soc_after || 0) * 100,
        scenario: (scenarioDecs[i]?.battery_soc_after || 0) * 100,
      });
    }
  }

  const Comparison = ({ label, normal, scenario, unit = '', inverse = false }) => {
    const diff = scenario - normal;
    const better = inverse ? diff < 0 : diff > 0;
    return (
      <div className="comparison-row">
        <span className="label">{label}</span>
        <span className="value">
          <span style={{ color: '#94a3b8', marginRight: 8 }}>{normal?.toFixed(1)}{unit}</span>
          →
          <span style={{ color: better ? '#10b981' : '#ef4444', marginLeft: 8, fontWeight: 700 }}>
            {scenario?.toFixed(1)}{unit}
          </span>
        </span>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">What-If Simulator</h1>
      <p className="page-subtitle">Explore how different conditions affect energy dispatch and costs</p>

      {/* Scenario Controls */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Scenario Parameters</div>
        </div>

        <div className="scenario-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>☁️ Cloudy Days:</span>
            <select className="select-input" value={cloudyDays} onChange={e => setCloudyDays(Number(e.target.value))}>
              {[0,1,2,3,4,5].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>

          <label className={`scenario-toggle ${lowWind ? 'active' : ''}`}>
            <input type="checkbox" checked={lowWind} onChange={e => setLowWind(e.target.checked)} />
            🌬️ Low Wind
          </label>

          <label className={`scenario-toggle ${highDemand ? 'active' : ''}`}>
            <input type="checkbox" checked={highDemand} onChange={e => setHighDemand(e.target.checked)} />
            🔥 High Demand (+50%)
          </label>

          <label className={`scenario-toggle ${dieselUnavailable ? 'active' : ''}`}>
            <input type="checkbox" checked={dieselUnavailable} onChange={e => setDieselUnavailable(e.target.checked)} />
            ⛽ Diesel Unavailable
          </label>
        </div>

        <button className="btn btn-primary" onClick={handleRun} disabled={loading}>
          {loading ? '⏳ Simulating...' : '🔬 Run Scenario'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Impact Summary */}
          <div className="kpi-grid stagger" style={{ marginBottom: 20 }}>
            <div className="glass-card kpi-card">
              <div className="card-title">Cost Impact</div>
              <div className="card-value" style={{ color: result.comparison?.cost_diff > 0 ? '#ef4444' : '#10b981' }}>
                {result.comparison?.cost_diff > 0 ? '+' : ''}₹{result.comparison?.cost_diff?.toFixed(0)}
              </div>
              <div className="card-label">vs normal conditions</div>
            </div>
            <div className="glass-card kpi-card">
              <div className="card-title">CO₂ Impact</div>
              <div className="card-value" style={{ color: result.comparison?.co2_diff > 0 ? '#ef4444' : '#10b981' }}>
                {result.comparison?.co2_diff > 0 ? '+' : ''}{result.comparison?.co2_diff?.toFixed(1)} kg
              </div>
            </div>
            <div className="glass-card kpi-card">
              <div className="card-title">Diesel Impact</div>
              <div className="card-value" style={{ color: result.comparison?.diesel_diff > 0 ? '#ef4444' : '#10b981' }}>
                {result.comparison?.diesel_diff > 0 ? '+' : ''}{result.comparison?.diesel_diff?.toFixed(1)} L
              </div>
            </div>
            <div className="glass-card kpi-card">
              <div className="card-title">Reliability Impact</div>
              <div className="card-value" style={{ color: result.comparison?.reliability_diff < 0 ? '#ef4444' : '#10b981' }}>
                {result.comparison?.reliability_diff > 0 ? '+' : ''}{result.comparison?.reliability_diff?.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* SoC Comparison Chart */}
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Battery SoC Comparison</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={socChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" label={{ value: 'Hour', position: 'insideBottomRight', offset: -5, fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'SoC %', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip formatter={(val) => `${val.toFixed(1)}%`} />
                <Legend />
                <Line type="monotone" dataKey="normal" stroke="#10b981" strokeWidth={2} dot={false} name="Normal" />
                <Line type="monotone" dataKey="scenario" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Scenario" />
                {/* 20% floor line */}
                <Line type="monotone" dataKey={() => 20} stroke="#64748b" strokeDasharray="3 3" dot={false} name="SoC Floor (20%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="comparison-grid">
            <div className="glass-card comparison-card">
              <h3>📊 Normal Conditions</h3>
              <Comparison label="Total Cost" normal={result.normal?.total_cost} scenario={result.normal?.total_cost} unit=" ₹" />
              <Comparison label="CO₂ Emissions" normal={result.normal?.total_co2} scenario={result.normal?.total_co2} unit=" kg" />
              <Comparison label="Diesel Usage" normal={result.normal?.total_diesel_liters} scenario={result.normal?.total_diesel_liters} unit=" L" />
              <Comparison label="Reliability" normal={result.normal?.avg_reliability} scenario={result.normal?.avg_reliability} unit="%" />
            </div>
            <div className="glass-card comparison-card">
              <h3 style={{ color: '#ef4444' }}>🔬 Scenario Results</h3>
              <Comparison label="Total Cost" normal={result.normal?.total_cost} scenario={result.scenario?.total_cost} unit=" ₹" inverse />
              <Comparison label="CO₂ Emissions" normal={result.normal?.total_co2} scenario={result.scenario?.total_co2} unit=" kg" inverse />
              <Comparison label="Diesel Usage" normal={result.normal?.total_diesel_liters} scenario={result.scenario?.total_diesel_liters} unit=" L" inverse />
              <Comparison label="Reliability" normal={result.normal?.avg_reliability} scenario={result.scenario?.avg_reliability} unit="%" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
