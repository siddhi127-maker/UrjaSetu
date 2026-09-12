import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getDispatch, runOptimize, getBlackoutRisk, getPerformance } from '../utils/api';
import DispatchView from '../components/DispatchView';
import BlackoutAlert from '../components/BlackoutAlert';

export default function Dispatch() {
  const { data: dispatch, execute: refreshDispatch } = useApi(getDispatch);
  const { data: risk } = useApi(getBlackoutRisk);
  const { data: perf } = useApi(getPerformance);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizer, setOptimizer] = useState('rule_based');
  const [result, setResult] = useState(null);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await runOptimize({ hours: 24, optimizer });
      setResult(res);
      refreshDispatch();
    } catch (e) {
      console.error(e);
    }
    setOptimizing(false);
  };

  const PerformanceCard = ({ data, label }) => {
    if (!data) return null;
    return (
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>{label} Performance</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#94a3b8' }}>Performance Ratio</span>
          <span style={{
            fontSize: 20, fontWeight: 700,
            color: data.performance_ratio >= 80 ? '#10b981' : data.performance_ratio >= 60 ? '#f59e0b' : '#ef4444'
          }}>
            {data.performance_ratio?.toFixed(1)}%
          </span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: '#94a3b8' }}>{data.message}</div>
        {data.needs_maintenance && (
          <div style={{
            marginTop: 8, padding: '6px 12px', borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
            fontSize: 12, color: '#ef4444', fontWeight: 600,
          }}>
            🔧 Maintenance Required
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">Live Dispatch</h1>
      <p className="page-subtitle">Real-time energy dispatch decisions and optimization controls</p>

      <BlackoutAlert risk={risk} />

      {/* Optimization Controls */}
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">Optimization Controls</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="select-input" value={optimizer} onChange={e => setOptimizer(e.target.value)}>
            <option value="rule_based">📐 Rule-Based</option>
            <option value="lp">📊 LP Optimization</option>
            <option value="milp">🔧 MILP Optimization</option>
          </select>
          <button className="btn btn-primary" onClick={handleOptimize} disabled={optimizing}>
            {optimizing ? '⏳ Optimizing...' : '🚀 Run 24h Optimization'}
          </button>
          {result && (
            <span style={{ fontSize: 13, color: '#10b981' }}>
              ✅ Cost: ₹{result.total_cost?.toFixed(0)} | Reliability: {result.avg_reliability?.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Current Dispatch */}
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">Current Dispatch Decision</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {dispatch?.timestamp && new Date(dispatch.timestamp).toLocaleString('en-IN')}
          </div>
        </div>
        <DispatchView dispatch={dispatch} />
      </div>

      {/* Equipment Performance */}
      <div className="charts-grid equal">
        <PerformanceCard data={perf?.solar} label="☀️ Solar" />
        <PerformanceCard data={perf?.wind} label="🌬️ Wind" />
      </div>

      {/* Optimization Results Table */}
      {result && result.decisions && (
        <div className="glass-card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">24-Hour Optimization Results</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {result.decisions.length} periods | {result.optimizer_type}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Solar</th>
                  <th>Wind</th>
                  <th>Battery</th>
                  <th>Diesel</th>
                  <th>Demand</th>
                  <th>SoC</th>
                  <th>Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.decisions.slice(0, 24).map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{new Date(d.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ color: '#f59e0b' }}>{d.solar_kw?.toFixed(1)}</td>
                    <td style={{ color: '#06b6d4' }}>{d.wind_kw?.toFixed(1)}</td>
                    <td style={{ color: '#10b981' }}>{d.battery_kw?.toFixed(1)}</td>
                    <td style={{ color: d.diesel_kw > 0 ? '#ef4444' : '#64748b' }}>{d.diesel_kw?.toFixed(1)}</td>
                    <td>{d.demand_kw?.toFixed(1)}</td>
                    <td>{(d.battery_soc_after * 100)?.toFixed(0)}%</td>
                    <td>₹{d.total_cost?.toFixed(0)}</td>
                    <td>{d.status === 'ok' ? '✅' : d.status === 'warning' ? '⚠️' : '🔴'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
