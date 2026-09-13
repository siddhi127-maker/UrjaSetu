import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getForecast } from '../utils/api';
import AIModules from '../components/AIModules';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

export default function Forecast() {
  const [hours, setHours] = useState(24);
  const { data } = useApi(() => getForecast(hours), [hours]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

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

      {/* 6.6 & 6.7 Modules */}
      <div style={{ marginBottom: 28 }}>
        <AIModules />
      </div>

      {/* Forecast Charts */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          📈 24-Hour Solar, Wind & Village Demand Profiles
        </h3>
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="solar" name="Solar (kWh)" stroke="var(--solar)" fill="var(--solar)" fillOpacity={0.2} />
              <Area type="monotone" dataKey="wind" name="Wind (kWh)" stroke="var(--wind)" fill="var(--wind)" fillOpacity={0.2} />
              <Area type="monotone" dataKey="demand" name="Demand (kWh)" stroke="var(--text-secondary)" fill="rgba(255,255,255,0.05)" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
