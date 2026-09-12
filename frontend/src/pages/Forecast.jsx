import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getForecast } from '../utils/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, BarChart, Bar,
} from 'recharts';

export default function Forecast() {
  const [hours, setHours] = useState(24);
  const { data, loading, execute } = useApi(() => getForecast(hours), [hours]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  // Merge all forecast data into chart-friendly format
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
          background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#e2e8f0' }}>{label}</div>
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

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">Energy Forecast</h1>
      <p className="page-subtitle">Predicted solar, wind generation, and demand for the upcoming period</p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
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

      {/* Summary Cards */}
      <div className="kpi-grid stagger" style={{ marginBottom: 20 }}>
        <div className="glass-card kpi-card solar">
          <div className="card-title">Solar Forecast</div>
          <div className="card-value">{totalSolar.toFixed(0)} <span style={{ fontSize: 14, opacity: 0.6 }}>kWh</span></div>
        </div>
        <div className="glass-card kpi-card wind">
          <div className="card-title">Wind Forecast</div>
          <div className="card-value">{totalWind.toFixed(0)} <span style={{ fontSize: 14, opacity: 0.6 }}>kWh</span></div>
        </div>
        <div className="glass-card kpi-card" style={{ '--card-color': '#8b5cf6' }}>
          <div className="card-title">Demand Forecast</div>
          <div className="card-value" style={{ color: '#8b5cf6' }}>{totalDemand.toFixed(0)} <span style={{ fontSize: 14, opacity: 0.6 }}>kWh</span></div>
        </div>
        <div className="glass-card kpi-card reliability">
          <div className="card-title">Renewable Coverage</div>
          <div className="card-value">{coverage.toFixed(1)} <span style={{ fontSize: 14, opacity: 0.6 }}>%</span></div>
        </div>
      </div>

      {/* Generation vs Demand Area Chart */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Generation vs Demand</div>
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 300 }} />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={Math.floor(chartData.length / 8)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="solar" stackId="1" stroke="#f59e0b" fill="rgba(245,158,11,0.3)" name="Solar" />
              <Area type="monotone" dataKey="wind" stackId="1" stroke="#06b6d4" fill="rgba(6,182,212,0.3)" name="Wind" />
              <Line type="monotone" dataKey="demand" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Demand" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Solar & Wind Individual Charts */}
      <div className="charts-grid equal">
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">☀️ Solar Generation</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.floor(chartData.length / 6)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="solar" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Solar kWh" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">🌬️ Wind Generation</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.floor(chartData.length / 6)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="wind" stroke="#06b6d4" strokeWidth={2} dot={false} name="Wind kWh" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
