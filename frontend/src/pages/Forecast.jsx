import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getForecast, getDayAheadForecast, getPerUnitMaintenance } from '../utils/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, BarChart, Bar,
} from 'recharts';

export default function Forecast() {
  const [hours, setHours] = useState(24);
  const [maintFilter, setMaintFilter] = useState('all');

  const { data, loading } = useApi(() => getForecast(hours), [hours]);
  const { data: dayAheadData, loading: dayAheadLoading } = useApi(() => getDayAheadForecast(160, 80), []);
  const { data: maintData, loading: maintLoading } = useApi(() => getPerUnitMaintenance(), []);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  // Merge forecast data for charts
  const chartData = [];
  if (data) {
    const maxLen = Math.max(
      data.solar_forecast?.length || 0,
      data.wind_forecast?.length || 0,
      data.demand_forecast?.length || 0
    );
    for (let i = 0; i < maxLen; i++) {
      chartData.push({
        time: formatTime(
          data.solar_forecast?.[i]?.timestamp ||
          data.demand_forecast?.[i]?.timestamp ||
          new Date().toISOString()
        ),
        solar: data.solar_forecast?.[i]?.generation_kwh || 0,
        wind: data.wind_forecast?.[i]?.generation_kwh || 0,
        demand: data.demand_forecast?.[i]?.demand_kwh || 0,
        renewable: (data.solar_forecast?.[i]?.generation_kwh || 0) + (data.wind_forecast?.[i]?.generation_kwh || 0),
      });
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-glass-hover)',
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
          {payload.map((p, i) => (
            <div key={i} style={{ color: p.color, padding: '2px 0' }}>
              {p.name}: {p.value?.toFixed(1)} kWh
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const totalSolar = chartData.reduce((s, d) => s + d.solar, 0);
  const totalWind = chartData.reduce((s, d) => s + d.wind, 0);
  const totalDemand = chartData.reduce((s, d) => s + d.demand, 0);
  const totalRenewable = totalSolar + totalWind;
  const coverage = totalDemand > 0 ? (totalRenewable / totalDemand * 100) : 0;

  // Filter components for 6.7 Maintenance table
  const componentsList = maintData?.components || [];
  const filteredComponents = componentsList.filter(c => {
    if (maintFilter === 'solar') return c.component_type === 'Solar String';
    if (maintFilter === 'wind') return c.component_type === 'Wind Turbine';
    if (maintFilter === 'alerts') return c.persistent_anomaly;
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 className="page-title">AI Forecast & Predictive Maintenance</h1>
          <p className="page-subtitle">Day-ahead renewable generation, village demand forecast & per-unit servicing alerts</p>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          {[24, 48, 72, 120].map(h => (
            <button
              key={h}
              className={`btn ${hours === h ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setHours(h)}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODULE 6.6: DAY-AHEAD RENEWABLE GENERATION & VILLAGE DEMAND FORECAST
         ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="glass-card" style={{ marginBottom: 28, border: '1px solid rgba(59, 130, 246, 0.3)', background: 'var(--bg-glass)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <div className="card-title" style={{ fontSize: 18, color: 'var(--text-primary)' }}>
                6.6 AI-Based Day-Ahead Renewable Generation & Demand Forecast
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Integrated Physical & ML Model: E_solar = P × (G/1000) × η × Δt | D_forecast = 0.6×D_LY + 0.4×D_7day
              </p>
            </div>
          </div>
          {dayAheadData?.sufficiency_status && (
            <div className={`status-badge ${dayAheadData.sufficiency_status === 'Sufficient' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 13, padding: '6px 14px' }}>
              {dayAheadData.sufficiency_status === 'Sufficient' ? '✅ Renewable Sufficient' : '⚠️ Deficit Expected'}
            </div>
          )}
        </div>

        {dayAheadLoading ? (
          <div className="skeleton" style={{ height: 180 }} />
        ) : (
          <div>
            {/* Dashboard Outputs Table */}
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table className="data-table" style={{ width: '100%', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Formula / Source</th>
                    <th style={{ textAlign: 'right' }}>Calculated Value</th>
                    <th style={{ textAlign: 'center' }}>Status / Impact</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Forecast Solar Generation</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>E_solar,day = Σ (P × G_h / G_ref × η)</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>
                      {dayAheadData?.forecast_solar_kwh ?? totalSolar.toFixed(1)} kWh
                    </td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-warning">☀️ Solar Peak</span></td>
                  </tr>
                  <tr>
                    <td><strong>Forecast Wind Generation</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>E_wind,day = Σ P_wind(v_h)</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#06b6d4' }}>
                      {dayAheadData?.forecast_wind_kwh ?? totalWind.toFixed(1)} kWh
                    </td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-info">🌬️ Wind Stream</span></td>
                  </tr>
                  <tr style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                    <td><strong>Total Renewable Generation</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>E_renewable = E_solar + E_wind</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: 15 }}>
                      {dayAheadData?.total_renewable_kwh ?? totalRenewable.toFixed(1)} kWh
                    </td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-success">🌿 Clean Total</span></td>
                  </tr>
                  <tr>
                    <td><strong>Predicted Village Demand</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>D_forecast = 0.6·D_LY + 0.4·D_7day</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#8b5cf6' }}>
                      {dayAheadData?.predicted_village_demand_kwh ?? totalDemand.toFixed(1)} kWh
                    </td>
                    <td style={{ textAlign: 'center' }}><span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>📈 Village Load</span></td>
                  </tr>
                  <tr>
                    <td><strong>Previous-Day Battery Energy</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>B_prev (Stored energy at start of day)</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {dayAheadData?.previous_day_battery_kwh ?? 160} kWh
                    </td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-secondary">🔋 Battery Stored</span></td>
                  </tr>
                  <tr style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                    <td><strong>Expected Available Energy</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>E_available = E_renewable + B_usable</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#3b82f6', fontSize: 15 }}>
                      {dayAheadData?.expected_available_kwh ?? (totalRenewable + 120).toFixed(1)} kWh
                    </td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-info">⚡ Max Available</span></td>
                  </tr>
                  <tr style={{
                    background: (dayAheadData?.surplus_deficit_kwh ?? (totalRenewable - totalDemand)) >= 0
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)'
                  }}>
                    <td><strong>Surplus / Deficit</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>S = E_available − D_forecast</td>
                    <td style={{
                      textAlign: 'right', fontWeight: 800, fontSize: 16,
                      color: (dayAheadData?.surplus_deficit_kwh ?? (totalRenewable - totalDemand)) >= 0 ? '#10b981' : '#ef4444'
                    }}>
                      {(dayAheadData?.surplus_deficit_kwh ?? (totalRenewable - totalDemand)) >= 0 ? '+' : ''}
                      {dayAheadData?.surplus_deficit_kwh ?? (totalRenewable - totalDemand).toFixed(1)} kWh
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${(dayAheadData?.surplus_deficit_kwh ?? 0) >= 0 ? 'badge-success' : 'badge-danger'}`}>
                        {(dayAheadData?.surplus_deficit_kwh ?? 0) >= 0 ? 'Surplus Expected' : 'Deficit Expected'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Sufficiency Status</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>E_available ≥ D_forecast check</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {dayAheadData?.sufficiency_status || 'Sufficient'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${dayAheadData?.sufficiency_status === 'Sufficient' ? 'badge-success' : 'badge-danger'}`}>
                        {dayAheadData?.sufficiency_status || 'Sufficient'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Backup Requirement</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>Grid / Diesel generator dispatch decision</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {dayAheadData?.backup_requirement || 'Not Required'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${dayAheadData?.backup_requirement === 'Not Required' ? 'badge-success' : 'badge-warning'}`}>
                        {dayAheadData?.backup_requirement || 'Not Required'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action Recommendation Banner */}
            <div style={{
              padding: '14px 18px',
              borderRadius: 12,
              background: dayAheadData?.sufficiency_status === 'Sufficient' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${dayAheadData?.sufficiency_status === 'Sufficient' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>
                {dayAheadData?.sufficiency_status === 'Sufficient' ? '💡' : '🚨'}
              </span>
              <div>
                <strong style={{ color: dayAheadData?.sufficiency_status === 'Sufficient' ? '#10b981' : '#ef4444', fontSize: 14 }}>
                  Optimization Recommendation:
                </strong>
                <p style={{ margin: '2px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {dayAheadData?.action_recommendation || 'Renewable generation and storage expected to meet village demand.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generation vs Demand Area Chart */}
      <div className="glass-card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <div className="card-title">Hourly Generation vs Demand Profile</div>
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 300 }} />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={Math.floor(chartData.length / 8)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="solar" stackId="1" stroke="#f59e0b" fill="rgba(245,158,11,0.3)" name="Solar" />
              <Area type="monotone" dataKey="wind" stackId="1" stroke="#06b6d4" fill="rgba(6,182,212,0.3)" name="Wind" />
              <Line type="monotone" dataKey="demand" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Village Demand" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODULE 6.7: AI-BASED PER-UNIT PREDICTIVE MAINTENANCE & SERVICING ALERTS
         ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="glass-card" style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'var(--bg-glass)' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border-glass)', paddingBottom: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔧</span>
            <div>
              <div className="card-title" style={{ fontSize: 18, color: 'var(--text-primary)' }}>
                6.7 AI-Based Per-Unit Predictive Maintenance & Servicing Alerts
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                PR = (E_actual / E_expected) × 100 | Persistent Rule: Gap &gt; 20% for ≥ 3 observations → Inspection Alert
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'all', label: 'All Units' },
              { id: 'solar', label: 'Solar Strings' },
              { id: 'wind', label: 'Wind Turbines' },
              { id: 'alerts', label: `⚠️ Alerts (${maintData?.alerts_count || 0})` },
            ].map(tab => (
              <button
                key={tab.id}
                className={`btn ${maintFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '5px 12px' }}
                onClick={() => setMaintFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {maintLoading ? (
          <div className="skeleton" style={{ height: 220 }} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Component ID</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Expected Output</th>
                  <th style={{ textAlign: 'right' }}>Actual Output</th>
                  <th style={{ textAlign: 'right' }}>Perf Gap (%)</th>
                  <th style={{ textAlign: 'center' }}>Duration</th>
                  <th style={{ textAlign: 'right' }}>Similar Peer Avg</th>
                  <th style={{ textAlign: 'center' }}>Priority Score</th>
                  <th style={{ textAlign: 'center' }}>Diagnostic Status</th>
                  <th style={{ textAlign: 'center' }}>Servicing Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredComponents.map((comp) => {
                  const isAnomaly = comp.persistent_anomaly;
                  const gap = comp.performance_gap_pct;

                  return (
                    <tr
                      key={comp.component_id}
                      style={{
                        background: isAnomaly
                          ? 'rgba(239, 68, 68, 0.08)'
                          : gap > 15
                          ? 'rgba(245, 158, 11, 0.05)'
                          : 'transparent'
                      }}
                    >
                      <td>
                        <strong>{comp.component_id}</strong>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{comp.component_type}</td>
                      <td style={{ textAlign: 'right' }}>{comp.expected_output_kwh} kWh</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{comp.actual_output_kwh} kWh</td>
                      <td style={{
                        textAlign: 'right', fontWeight: 700,
                        color: gap >= 20 ? '#ef4444' : gap >= 15 ? '#f59e0b' : '#10b981'
                      }}>
                        {gap}%
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {comp.duration_days > 0 ? `${comp.duration_days} days` : '0 days'}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {comp.similar_unit_avg_kwh} kWh
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 12,
                          background: comp.priority_score > 30 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                          color: comp.priority_score > 30 ? '#ef4444' : 'var(--text-primary)'
                        }}>
                          {comp.priority_score}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${
                          comp.status === 'Inspection Required'
                            ? 'badge-danger'
                            : comp.status === 'Warning / Monitor'
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}>
                          {comp.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 8,
                          background: comp.maintenance_status === 'Pending'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : comp.maintenance_status === 'In Inspection'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(16, 185, 129, 0.2)',
                          color: comp.maintenance_status === 'Pending'
                            ? '#f87171'
                            : comp.maintenance_status === 'In Inspection'
                            ? '#fbbf24'
                            : '#34d399'
                        }}>
                          {comp.maintenance_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
