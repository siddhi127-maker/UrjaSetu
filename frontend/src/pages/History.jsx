import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getHistory } from '../utils/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, BarChart, Bar,
} from 'recharts';

export default function History() {
  const [range, setRange] = useState('week');
  const { data, loading } = useApi(() => getHistory(range), [range]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    if (range === 'day') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  // Aggregate by day for week/month views
  const aggregateByDay = (records) => {
    const dayMap = {};
    records.forEach(r => {
      const dayKey = new Date(r.timestamp).toLocaleDateString('en-IN');
      if (!dayMap[dayKey]) {
        dayMap[dayKey] = {
          date: dayKey, solar: 0, wind: 0, diesel: 0, demand: 0,
          cost: 0, co2: 0, count: 0, avg_soc: 0,
        };
      }
      dayMap[dayKey].solar += r.solar_generation;
      dayMap[dayKey].wind += r.wind_generation;
      dayMap[dayKey].diesel += r.diesel_generation;
      dayMap[dayKey].demand += r.demand;
      dayMap[dayKey].cost += r.total_cost;
      dayMap[dayKey].co2 += r.co2_emissions;
      dayMap[dayKey].avg_soc += r.battery_soc;
      dayMap[dayKey].count++;
    });
    return Object.values(dayMap).map(d => ({
      ...d,
      avg_soc: d.avg_soc / d.count,
    }));
  };

  const chartData = data?.records
    ? (range === 'day' ? data.records.map(r => ({
        time: formatTime(r.timestamp),
        solar: r.solar_generation,
        wind: r.wind_generation,
        diesel: r.diesel_generation,
        demand: r.demand,
        soc: r.battery_soc,
      })) : aggregateByDay(data.records).map(d => ({
        time: d.date,
        solar: d.solar,
        wind: d.wind,
        diesel: d.diesel,
        demand: d.demand,
        soc: d.avg_soc,
        cost: d.cost,
      })))
    : [];

  const summary = data?.summary || {};

  const SummaryRow = ({ label, value, unit = '', color }) => (
    <div className="comparison-row">
      <span className="label">{label}</span>
      <span className="value" style={{ color }}>{value}{unit}</span>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">Historical Performance</h1>
      <p className="page-subtitle">Review past energy data and compare optimizer vs baseline</p>

      {/* Range Selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { key: 'day', label: 'Last 24h' },
          { key: 'week', label: 'Last Week' },
          { key: 'month', label: 'Last Month' },
        ].map(r => (
          <button
            key={r.key}
            className={`btn ${range === r.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Performance Summary */}
      <div className="comparison-grid" style={{ marginBottom: 20 }}>
        <div className="glass-card comparison-card">
          <h3>📊 Optimizer Performance</h3>
          <SummaryRow label="Total Cost" value={`₹${summary.total_cost?.toFixed(0) || 0}`} color="#10b981" />
          <SummaryRow label="CO₂ Emitted" value={`${summary.total_co2_kg?.toFixed(1) || 0}`} unit=" kg" />
          <SummaryRow label="Diesel Used" value={`${summary.total_fuel_liters?.toFixed(1) || 0}`} unit=" L" />
          <SummaryRow label="Renewable %" value={`${summary.renewable_percent?.toFixed(1) || 0}`} unit="%" color="#10b981" />
          <SummaryRow label="Reliability" value={`${summary.reliability?.toFixed(1) || 0}`} unit="%" color="#10b981" />
        </div>
        <div className="glass-card comparison-card">
          <h3>⚡ Savings vs Baseline</h3>
          <SummaryRow label="Baseline Cost" value={`₹${summary.baseline_cost?.toFixed(0) || 0}`} color="#ef4444" />
          <SummaryRow label="Cost Saved" value={`₹${summary.cost_saved?.toFixed(0) || 0}`} color="#10b981" />
          <SummaryRow label="CO₂ Avoided" value={`${summary.co2_avoided_kg?.toFixed(1) || 0}`} unit=" kg" color="#06b6d4" />
          <SummaryRow label="Solar Total" value={`${summary.total_solar_kwh?.toFixed(0) || 0}`} unit=" kWh" color="#f59e0b" />
          <SummaryRow label="Wind Total" value={`${summary.total_wind_kwh?.toFixed(0) || 0}`} unit=" kWh" color="#06b6d4" />
        </div>
      </div>

      {/* Stacked Generation Chart */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Energy Generation History</div>
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 300 }} />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(chartData.length / 8))} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="solar" stackId="1" stroke="#f59e0b" fill="rgba(245,158,11,0.3)" name="Solar" />
              <Area type="monotone" dataKey="wind" stackId="1" stroke="#06b6d4" fill="rgba(6,182,212,0.3)" name="Wind" />
              <Area type="monotone" dataKey="diesel" stackId="1" stroke="#ef4444" fill="rgba(239,68,68,0.3)" name="Diesel" />
              <Line type="monotone" dataKey="demand" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Demand" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Battery SoC History */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">Battery SoC History</div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(chartData.length / 8))} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
            <Line type="monotone" dataKey="soc" stroke="#10b981" strokeWidth={2} dot={false} name="SoC %" />
            <Line type="monotone" dataKey={() => 20} stroke="#64748b" strokeDasharray="3 3" dot={false} name="Floor (20%)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
