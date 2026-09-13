import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { getDispatch, runOptimize, getBlackoutRisk, getPerformance, getSites } from '../utils/api';
import DispatchView from '../components/DispatchView';
import BlackoutAlert from '../components/BlackoutAlert';
import ExplainabilityCard from '../components/ExplainabilityCard';
import { downloadCSV } from '../utils/csvExport';

export default function Dispatch() {
  const { data: dispatch, execute: refreshDispatch } = useApi(getDispatch);
  const { data: risk } = useApi(getBlackoutRisk);
  const { data: perf } = useApi(getPerformance);
  const { data: sites } = useApi(getSites);

  const [optimizing, setOptimizing] = useState(false);
  const [optimizer, setOptimizer] = useState('milp');
  const [selectedSiteId, setSelectedSiteId] = useState('rampur_village');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (sites && sites.length > 0) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites]);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await runOptimize({ hours: 24, optimizer, siteId: selectedSiteId });
      setResult(res);
      refreshDispatch();
    } catch (e) {
      console.error(e);
    }
    setOptimizing(false);
  };

  const handleExportCSV = () => {
    if (!result || !result.decisions) return;
    const rows = result.decisions.map(d => ({
      Timestamp: d.timestamp,
      Demand_kW: d.demand_kw,
      Critical_Load_kW: d.critical_load_kw || 0,
      Flexible_Load_kW: d.flexible_load_kw || 0,
      Solar_kW: d.solar_kw,
      Wind_kW: d.wind_kw,
      Battery_Net_kW: d.battery_kw,
      Diesel_kW: d.diesel_kw,
      Unserved_Critical_kW: d.unserved_critical_kw || 0,
      Unserved_Flexible_kW: d.unserved_flexible_kw || 0,
      Reserve_Shortfall_kW: d.reserve_shortfall_kw || 0,
      SoC_Before: d.battery_soc_before,
      SoC_After: d.battery_soc_after,
      Cost_INR: d.total_cost,
      CO2_kg: d.co2_emissions,
      Status: d.status,
    }));
    downloadCSV(`UrjaSetu_24h_Dispatch_Plan_${selectedSiteId}.csv`, rows);
  };

  const PerformanceCard = ({ data, label }) => {
    if (!data) return null;
    return (
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>{label} Performance</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Performance Ratio</span>
          <span style={{
            fontSize: 20, fontWeight: 700,
            color: data.performance_ratio >= 80 ? '#10b981' : data.performance_ratio >= 60 ? '#f59e0b' : '#ef4444'
          }}>
            {data.performance_ratio?.toFixed(1)}%
          </span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>{data.message}</div>
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
      <h1 className="page-title">Live Microgrid Dispatch & MILP Optimization</h1>
      <p className="page-subtitle">Real-time energy mix decisions, load tier shedding & baseline benchmarking</p>

      <BlackoutAlert risk={risk} />

      {/* 4-Block Decision Insights */}
      <ExplainabilityCard
        blocks={dispatch?.explanation_blocks}
        shortSummary={dispatch?.explanation}
        status={dispatch?.status}
      />

      {/* Optimization Controls */}
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">Optimization & Site Selection Controls</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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

          <select className="select-input" value={optimizer} onChange={e => setOptimizer(e.target.value)}>
            <option value="milp">⚡ PuLP MILP Optimization (CBC Solver)</option>
            <option value="lp">📊 Linear Programming (LP)</option>
            <option value="rule_based">📐 Reactive Baseline Dispatch</option>
          </select>

          <button className="btn btn-primary" onClick={handleOptimize} disabled={optimizing}>
            {optimizing ? '⏳ Solving MILP...' : '🚀 Run 24h Optimization'}
          </button>

          {result && result.decisions && (
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              📥 Export CSV Schedule
            </button>
          )}
        </div>
      </div>

      {/* Baseline Benchmarking Summary Banner */}
      {result && result.baseline_comparison && (
        <div
          className="glass-card"
          style={{
            marginBottom: 16,
            padding: 16,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.1) 100%)',
            border: '1px solid rgba(16,185,129,0.3)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Optimized Cost</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>₹{result.total_cost?.toFixed(0)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs Baseline: ₹{result.baseline_comparison.baseline_total_cost?.toFixed(0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cost Saved</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8' }}>₹{result.baseline_comparison.cost_saved?.toFixed(0)} ({result.baseline_comparison.cost_saved_percent}%)</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Direct savings</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CO₂ Avoided</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#a855f7' }}>{result.baseline_comparison.co2_saved_kg?.toFixed(1)} kg</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clean energy displacement</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Diesel Offset</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{result.baseline_comparison.diesel_saved_liters?.toFixed(1)} L</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fuel saved</div>
          </div>
        </div>
      )}

      {/* Current Dispatch */}
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">Current Dispatch Decision</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
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
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">24-Hour Optimization Schedule</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {result.decisions.length} periods | {result.optimizer_type?.toUpperCase()} | {result.site_profile?.name}
              </div>
            </div>
            <button className="btn btn-secondary" onClick={handleExportCSV} style={{ fontSize: 12 }}>
              📥 Export CSV
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Demand (P1/P2)</th>
                  <th>Solar</th>
                  <th>Wind</th>
                  <th>Battery</th>
                  <th>Diesel</th>
                  <th>Unserved</th>
                  <th>SoC</th>
                  <th>Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.decisions.slice(0, 24).map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{new Date(d.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{d.demand_kw?.toFixed(1)} kW <span style={{ fontSize: 10, color: '#64748b' }}>({d.critical_load_kw?.toFixed(0)}/{d.flexible_load_kw?.toFixed(0)})</span></td>
                    <td style={{ color: '#f59e0b' }}>{d.solar_kw?.toFixed(1)}</td>
                    <td style={{ color: '#06b6d4' }}>{d.wind_kw?.toFixed(1)}</td>
                    <td style={{ color: d.battery_kw > 0 ? '#10b981' : d.battery_kw < 0 ? '#38bdf8' : '#64748b' }}>
                      {d.battery_kw > 0 ? `+${d.battery_kw.toFixed(1)}` : d.battery_kw?.toFixed(1)}
                    </td>
                    <td style={{ color: d.diesel_kw > 0 ? '#ef4444' : '#64748b' }}>{d.diesel_kw?.toFixed(1)}</td>
                    <td style={{ color: d.shortfall_kw > 0 ? '#ef4444' : '#64748b' }}>{d.shortfall_kw?.toFixed(1)}</td>
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

