import { useState, useEffect } from 'react';
import { runScenario, getSites } from '../utils/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { downloadCSV } from '../utils/csvExport';

export default function Scenarios() {
  const { data: sites } = useApiSites();
  const [selectedSiteId, setSelectedSiteId] = useState('rampur_village');

  const [solarMult, setSolarMult] = useState(1.0);
  const [windMult, setWindMult] = useState(1.0);
  const [batteryMult, setBatteryMult] = useState(1.0);
  const [demandMult, setDemandMult] = useState(1.0);
  const [dieselPrice, setDieselPrice] = useState(95);

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
        siteId: selectedSiteId,
        solarMultiplier: solarMult,
        windMultiplier: windMult,
        batteryCapacityMultiplier: batteryMult,
        demandMultiplier: demandMult,
        dieselPricePerL: dieselPrice,
        cloudyDays,
        lowWind,
        highDemand,
        dieselUnavailable,
        hours: 24,
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleExportCSV = () => {
    if (!result) return;
    const normalDecs = result.normal?.decisions || [];
    const scenarioDecs = result.scenario?.decisions || [];

    const rows = normalDecs.map((n, i) => {
      const s = scenarioDecs[i] || {};
      return {
        Hour: i,
        Timestamp: n.timestamp,
        Normal_Demand_kW: n.demand_kw,
        Scenario_Demand_kW: s.demand_kw,
        Normal_Solar_kW: n.solar_kw,
        Scenario_Solar_kW: s.solar_kw,
        Normal_Wind_kW: n.wind_kw,
        Scenario_Wind_kW: s.wind_kw,
        Normal_Battery_kW: n.battery_kw,
        Scenario_Battery_kW: s.battery_kw,
        Normal_Diesel_kW: n.diesel_kw,
        Scenario_Diesel_kW: s.diesel_kw,
        Normal_SoC: n.battery_soc_after,
        Scenario_SoC: s.battery_soc_after,
        Normal_Cost_INR: n.total_cost,
        Scenario_Cost_INR: s.total_cost,
      };
    });

    downloadCSV(`UrjaSetu_Scenario_Simulation_${selectedSiteId}.csv`, rows);
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

  const ComparisonRow = ({ label, normal, scenario, unit = '', inverse = false }) => {
    const diff = (scenario || 0) - (normal || 0);
    const better = inverse ? diff < 0 : diff > 0;
    return (
      <div className="comparison-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-glass)' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 14 }}>
          <span style={{ color: 'var(--text-secondary)', marginRight: 8 }}>{normal?.toFixed(1)}{unit}</span>
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
      <h1 className="page-title">What-If Scenario Lab & Stress Testing</h1>
      <p className="page-subtitle">Simulate microgrid resilience under weather extremes, load surges & tariff changes</p>

      {/* Site Selection & Parameter Sliders */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">🎛️ Scenario Lab Parameters & Multipliers</div>
          {sites && (
            <select
              className="select-input"
              value={selectedSiteId}
              onChange={e => setSelectedSiteId(e.target.value)}
            >
              {sites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name} ({s.location})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Multipliers Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>☀️ Solar Capacity: {solarMult}x</label>
            <input type="range" min="0" max="3" step="0.1" value={solarMult} onChange={e => setSolarMult(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>🌬️ Wind Capacity: {windMult}x</label>
            <input type="range" min="0" max="3" step="0.1" value={windMult} onChange={e => setWindMult(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>🔋 Battery Size: {batteryMult}x</label>
            <input type="range" min="0.2" max="3" step="0.1" value={batteryMult} onChange={e => setBatteryMult(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>🔥 Demand Scaling: {demandMult}x</label>
            <input type="range" min="0.5" max="2.5" step="0.1" value={demandMult} onChange={e => setDemandMult(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>⛽ Diesel Price: ₹{dieselPrice}/L</label>
            <input type="range" min="70" max="150" step="5" value={dieselPrice} onChange={e => setDieselPrice(parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>

        {/* Stress Controls */}
        <div className="scenario-controls" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>☁️ Cloudy Days:</span>
            <select className="select-input" value={cloudyDays} onChange={e => setCloudyDays(Number(e.target.value))}>
              {[0, 1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d} days</option>)}
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
            ⛽ Diesel Outage
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={handleRun} disabled={loading}>
            {loading ? '⏳ Simulating MILP...' : '🔬 Run Scenario Simulation'}
          </button>
          {result && (
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              📥 Export Comparison CSV
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Impact Summary Cards */}
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
              <div className="card-label">emissions delta</div>
            </div>
            <div className="glass-card kpi-card">
              <div className="card-title">Diesel Consumption</div>
              <div className="card-value" style={{ color: result.comparison?.diesel_diff > 0 ? '#ef4444' : '#10b981' }}>
                {result.comparison?.diesel_diff > 0 ? '+' : ''}{result.comparison?.diesel_diff?.toFixed(1)} L
              </div>
              <div className="card-label">fuel delta</div>
            </div>
            <div className="glass-card kpi-card">
              <div className="card-title">Reliability</div>
              <div className="card-value" style={{ color: result.comparison?.reliability_diff < 0 ? '#ef4444' : '#10b981' }}>
                {result.comparison?.reliability_diff > 0 ? '+' : ''}{result.comparison?.reliability_diff?.toFixed(1)}%
              </div>
              <div className="card-label">unserved load impact</div>
            </div>
          </div>

          {/* SoC Comparison Chart */}
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Battery State-of-Charge (SoC) Trajectory</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={socChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />

                <XAxis dataKey="hour" tick={{ fontSize: 11 }} label={{ value: 'Hour', position: 'insideBottomRight', offset: -5, fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'SoC %', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip formatter={(val) => `${val.toFixed(1)}%`} />
                <Legend />
                <Line type="monotone" dataKey="normal" stroke="#10b981" strokeWidth={2} dot={false} name="Normal Conditions" />
                <Line type="monotone" dataKey="scenario" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Scenario Stress Test" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Side-by-Side Comparison Grid */}
          <div className="comparison-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <div className="glass-card comparison-card" style={{ padding: 16 }}>
              <h3 style={{ color: '#10b981', marginBottom: 12 }}>📊 Normal Conditions</h3>
              <ComparisonRow label="Total Cost" normal={result.normal?.total_cost} scenario={result.normal?.total_cost} unit=" ₹" />
              <ComparisonRow label="CO₂ Emissions" normal={result.normal?.total_co2} scenario={result.normal?.total_co2} unit=" kg" />
              <ComparisonRow label="Diesel Usage" normal={result.normal?.total_diesel_liters} scenario={result.normal?.total_diesel_liters} unit=" L" />
              <ComparisonRow label="Reliability" normal={result.normal?.avg_reliability} scenario={result.normal?.avg_reliability} unit="%" />
            </div>

            <div className="glass-card comparison-card" style={{ padding: 16 }}>
              <h3 style={{ color: '#ef4444', marginBottom: 12 }}>🔬 Scenario Stress Test</h3>
              <ComparisonRow label="Total Cost" normal={result.normal?.total_cost} scenario={result.scenario?.total_cost} unit=" ₹" inverse />
              <ComparisonRow label="CO₂ Emissions" normal={result.normal?.total_co2} scenario={result.scenario?.total_co2} unit=" kg" inverse />
              <ComparisonRow label="Diesel Usage" normal={result.normal?.total_diesel_liters} scenario={result.scenario?.total_diesel_liters} unit=" L" inverse />
              <ComparisonRow label="Reliability" normal={result.normal?.avg_reliability} scenario={result.scenario?.avg_reliability} unit="%" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function useApiSites() {
  const [data, setData] = useState(null);
  useEffect(() => {
    getSites().then(setData).catch(console.error);
  }, []);
  return { data };
}

