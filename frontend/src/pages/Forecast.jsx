import React, { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { getForecast } from '../utils/api';
import { downloadCSV } from '../utils/csvExport';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, LineChart
} from 'recharts';

export default function Forecast() {
  const [hours, setHours] = useState(24);
  const { data: apiData, loading } = useApi(() => getForecast(hours), [hours]);

  // ─── Section 6.6 Day-Ahead & Multi-Day Forecast State ────────────────────
  const [solarCapacity, setSolarCapacity] = useState(160); // kW
  const [irradiance, setIrradiance] = useState(750); // W/m2
  const [solarEfficiency] = useState(0.85); // 85%

  const [windCapacity, setWindCapacity] = useState(80); // kW
  const [windSpeed, setWindSpeed] = useState(8.5); // m/s

  const [demandLY, setDemandLY] = useState(140); // kW baseline same date last year
  const [demand7Day, setDemand7Day] = useState(155); // kW 7-day average
  const [alpha, setAlpha] = useState(0.6); // weight for last year

  const [batterySOC, setBatterySOC] = useState(180); // kWh stored
  const [batteryMin, setBatteryMin] = useState(40); // kWh min DoD limit
  const [dischargeEfficiency] = useState(0.92);

  const [tableSearch, setTableSearch] = useState('');

  // Solar Output Calculation
  const sunHours = (irradiance / 1000) * 8;
  const forecastSolarTotal = Math.round(solarCapacity * sunHours * solarEfficiency);

  // Wind Output Calculation
  const calcWindPower = (v) => {
    if (v < 3) return 0;
    if (v >= 12) return windCapacity;
    return (windCapacity * (Math.pow(v, 3) - 27)) / (1728 - 27);
  };
  const forecastWindTotal = Math.round(calcWindPower(windSpeed) * 12);
  const totalRenewableDaily = forecastSolarTotal + forecastWindTotal;

  // Demand Calculation
  const predictedDemandDaily = Math.round((alpha * demandLY + (1 - alpha) * demand7Day) * 18);

  // Battery Usable Reserves
  const batteryAvailable = Math.round(batterySOC * dischargeEfficiency);
  const batteryUsable = Math.max(0, Math.round((batterySOC - batteryMin) * dischargeEfficiency));

  // Expected Available Energy
  const expectedAvailableDaily = totalRenewableDaily + batteryUsable;
  const surplusDeficit = expectedAvailableDaily - predictedDemandDaily;
  const isSufficient = surplusDeficit >= 0;

  // Generates 24h, 48h, or 72h dataset reacting to sliders and API data
  const chartData = useMemo(() => {
    const list = [];
    const now = new Date();
    now.setMinutes(0, 0, 0);

    for (let i = 0; i < hours; i++) {
      const stepTime = new Date(now.getTime() + i * 3600000);
      const tod = stepTime.getHours();

      // Format time label (includes Day 1 / Day 2 / Day 3 for >24h)
      let timeLabel = stepTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      if (hours > 24) {
        const dayNum = Math.floor(i / 24) + 1;
        timeLabel = `D${dayNum} ${timeLabel}`;
      }

      // API fallback blend
      const apiSol = apiData?.solar_forecast?.[i]?.generation_kwh;
      const apiWnd = apiData?.wind_forecast?.[i]?.generation_kwh;
      const apiDmd = apiData?.demand_forecast?.[i]?.demand_kwh;
      const apiWtr = apiData?.weather_inputs?.[i];
      const apiLY = apiData?.demand_forecast?.[i]?.demand_ly;
      const api7D = apiData?.demand_forecast?.[i]?.demand_7d;

      // Diurnal model formulas scaled by interactive sliders
      const isDay = tod >= 6 && tod <= 18;
      const solarPeak = (solarCapacity * (irradiance / 1000) * solarEfficiency) / 1.1;

      // Input parameter dynamics (Weather)
      const inputIrr = apiWtr?.solar_irradiance !== undefined
        ? Math.round(apiWtr.solar_irradiance * (irradiance / 750))
        : (isDay ? Math.round(irradiance * Math.sin((Math.PI * (tod - 6)) / 12)) : 0);

      const inputWindSpd = apiWtr?.wind_speed !== undefined
        ? Math.round(apiWtr.wind_speed * (windSpeed / 8.5) * 10) / 10
        : Math.round(windSpeed * (0.8 + 0.35 * Math.sin((Math.PI * tod) / 12)) * 10) / 10;

      const inputTemp = apiWtr?.temperature !== undefined
        ? Math.round(apiWtr.temperature * 10) / 10
        : Math.round((28 + 6 * Math.sin((Math.PI * (tod - 8)) / 12)) * 10) / 10;

      const inputCloud = apiWtr?.cloud_cover !== undefined
        ? Math.round(apiWtr.cloud_cover * 100)
        : Math.round(25 + 15 * Math.sin(tod / 3));

      // Solar & Wind generation
      const solar_kw = apiSol !== undefined
        ? apiSol * (solarCapacity / 160)
        : (isDay ? Math.max(0, solarPeak * Math.sin((Math.PI * (tod - 6)) / 12)) : 0);

      const wind_kw = apiWnd !== undefined
        ? apiWnd * (windCapacity / 80)
        : Math.max(0, calcWindPower(inputWindSpd) * (0.65 + 0.35 * Math.sin((Math.PI * tod) / 12)));

      // Demand input signals
      const dLY_step = apiLY !== undefined
        ? apiLY * (demandLY / 140)
        : Math.max(20, demandLY * (0.7 + 0.3 * Math.sin((Math.PI * (tod - 14)) / 12)));

      const d7D_step = api7D !== undefined
        ? api7D * (demand7Day / 155)
        : Math.max(20, demand7Day * (0.75 + 0.25 * Math.sin((Math.PI * (tod - 14)) / 12)));

      const demand_kw = apiDmd !== undefined
        ? Math.round(alpha * dLY_step + (1 - alpha) * d7D_step)
        : Math.round(alpha * dLY_step + (1 - alpha) * d7D_step);

      const renewable_kw = Math.round((solar_kw + wind_kw) * 10) / 10;
      const margin_kw = Math.round((renewable_kw - demand_kw) * 10) / 10;

      list.push({
        hourIdx: i + 1,
        time: timeLabel,
        irradiance: inputIrr,
        windSpeed: inputWindSpd,
        temperature: inputTemp,
        cloudCover: inputCloud,
        solar: Math.round(solar_kw * 10) / 10,
        wind: Math.round(wind_kw * 10) / 10,
        demandLY: Math.round(dLY_step * 10) / 10,
        demand7Day: Math.round(d7D_step * 10) / 10,
        demand: demand_kw,
        renewable: renewable_kw,
        margin: margin_kw,
        batterySoC: Math.min(100, Math.max(20, Math.round(75 + Math.sin(tod / 4) * 20))),
      });
    }
    return list;
  }, [apiData, hours, solarCapacity, irradiance, solarEfficiency, windCapacity, windSpeed, demandLY, demand7Day, alpha]);

  // Aggregate multi-day horizon metrics
  const horizonStats = useMemo(() => {
    const totalSolar = Math.round(chartData.reduce((acc, d) => acc + d.solar, 0));
    const totalWind = Math.round(chartData.reduce((acc, d) => acc + d.wind, 0));
    const totalRenewable = totalSolar + totalWind;
    const totalDemand = Math.round(chartData.reduce((acc, d) => acc + d.demand, 0));
    const peakSolar = Math.max(0, ...chartData.map((d) => d.solar));
    const peakWind = Math.max(0, ...chartData.map((d) => d.wind));
    const peakDemand = Math.max(0, ...chartData.map((d) => d.demand));
    const netMargin = totalRenewable + batteryUsable - totalDemand;
    const avgIrradiance = Math.round(chartData.reduce((acc, d) => acc + d.irradiance, 0) / (hours || 1));
    const avgWindSpeed = Math.round((chartData.reduce((acc, d) => acc + d.windSpeed, 0) / (hours || 1)) * 10) / 10;

    return {
      totalSolar,
      totalWind,
      totalRenewable,
      totalDemand,
      peakSolar,
      peakWind,
      peakDemand,
      netMargin,
      avgIrradiance,
      avgWindSpeed,
    };
  }, [chartData, batteryUsable, hours]);

  const filteredTableData = useMemo(() => {
    if (!tableSearch.trim()) return chartData;
    const term = tableSearch.toLowerCase();
    return chartData.filter(
      (d) =>
        d.time.toLowerCase().includes(term) ||
        d.solar.toString().includes(term) ||
        d.demand.toString().includes(term) ||
        d.margin.toString().includes(term)
    );
  }, [chartData, tableSearch]);

  const handleExportCSV = () => {
    const exportRows = chartData.map((d) => ({
      Hour_Index: d.hourIdx,
      Time_Label: d.time,
      Horizon_Hours: hours,
      Solar_Irradiance_Wm2: d.irradiance,
      Wind_Speed_ms: d.windSpeed,
      Temperature_C: d.temperature,
      Cloud_Cover_Pct: d.cloudCover,
      Solar_Generation_kW: d.solar,
      Wind_Generation_kW: d.wind,
      Combined_Renewable_kW: d.renewable,
      Demand_Last_Year_kW: d.demandLY,
      Demand_7Day_Avg_kW: d.demand7Day,
      Predicted_Demand_kW: d.demand,
      Renewable_Margin_kW: d.margin,
    }));
    downloadCSV(`UrjaSetu_Forecast_${hours}h_Horizon.csv`, exportRows);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Header Bar with Horizon Toggles */}
      <div
        className="glass-card"
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(6,20,27,0.95) 0%, rgba(245,158,11,0.12) 100%)',
          borderLeft: '4px solid #f59e0b',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>🌤️ Forecast & Village Demand Multi-Input Horizon Studio</h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
              Physics-informed weather input drivers (Irradiance, Wind Speed, Temp), historical demand signals ($D_{`{LY}`}$, $D_{`{7d}`}$) & 24h / 48h / 72h horizons
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 8 }}>Horizon:</span>
              {[
                { h: 24, label: '24 Hours (Day-Ahead)' },
                { h: 48, label: '48 Hours (2-Day)' },
                { h: 72, label: '72 Hours (3-Day)' },
              ].map((item) => (
                <button
                  key={item.h}
                  className={`btn ${hours === item.h ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setHours(item.h)}
                  style={{ fontSize: 12, padding: '6px 14px' }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button className="btn btn-secondary" onClick={handleExportCSV} style={{ fontSize: 12, padding: '8px 14px' }}>
              📥 Export {hours}h Dataset CSV
            </button>
          </div>
        </div>
      </div>

      {/* Sufficiency Status & Formulations Engine */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <span>⚡</span> Multi-Day AI Forecast & Renewable Sufficiency Engine
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
              Calculates daily renewable potential, battery energy reserves, and village demand shortfall across the {hours}h horizon.
            </p>
          </div>
          <span className={isSufficient ? 'badge-sufficient' : 'badge-deficit'} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700 }}>
            {isSufficient ? `✓ ${hours}H RENEWABLE SUFFICIENT` : `⚠️ ${hours}H DEFICIT EXPECTED`}
          </span>
        </div>

        {/* Mathematical Formulations Callout */}
        <div className="formula-callout" style={{ marginBottom: 20 }}>
          <div><strong>Core Section 6.6 Input & Forecast Formulations:</strong></div>
          <div><code>E_solar = P_solar × (G_h / 1000) × η_system × Δt</code> | <code>E_wind = P_wind(v_h) × Δt</code></div>
          <div><code>D_forecast = α × D_LY + (1 − α) × D_7day</code> (Current Weight α = {alpha})</div>
          <div><code>E_available = E_renewable + B_usable</code> | <code>Horizon Surplus/Deficit = E_available − D_forecast</code></div>
        </div>

        {/* Interactive Input Sliders Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="glass-card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 12 }}>☀️ Solar Forecast Input Drivers</h4>
            <div className="input-slider-group">
              <label>Peak Irradiance (G_h): <strong style={{ color: '#f59e0b' }}>{irradiance} W/m²</strong></label>
              <input type="range" min="100" max="1000" step="25" value={irradiance} onChange={(e) => setIrradiance(+e.target.value)} style={{ width: '100%' }} />
            </div>
            <div className="input-slider-group" style={{ marginTop: 10 }}>
              <label>Solar Array Capacity: <strong style={{ color: '#f59e0b' }}>{solarCapacity} kW</strong></label>
              <input type="range" min="10" max="500" step="10" value={solarCapacity} onChange={(e) => setSolarCapacity(+e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#06b6d4', marginBottom: 12 }}>🌬️ Wind Forecast Input Drivers</h4>
            <div className="input-slider-group">
              <label>Wind Speed (v_h): <strong style={{ color: '#06b6d4' }}>{windSpeed} m/s</strong></label>
              <input type="range" min="0" max="25" step="0.5" value={windSpeed} onChange={(e) => setWindSpeed(+e.target.value)} style={{ width: '100%' }} />
            </div>
            <div className="input-slider-group" style={{ marginTop: 10 }}>
              <label>Turbine Capacity: <strong style={{ color: '#06b6d4' }}>{windCapacity} kW</strong></label>
              <input type="range" min="10" max="300" step="10" value={windCapacity} onChange={(e) => setWindCapacity(+e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#facc15', marginBottom: 12 }}>🏘️ Demand Input Signals</h4>
            <div className="input-slider-group">
              <label>Last Year Date (D_LY): <strong style={{ color: '#facc15' }}>{demandLY} kW</strong></label>
              <input type="range" min="50" max="500" step="10" value={demandLY} onChange={(e) => setDemandLY(+e.target.value)} style={{ width: '100%' }} />
            </div>
            <div className="input-slider-group" style={{ marginTop: 10 }}>
              <label>Previous 7-Day Avg (D_7day): <strong style={{ color: '#facc15' }}>{demand7Day} kW</strong></label>
              <input type="range" min="50" max="500" step="10" value={demand7Day} onChange={(e) => setDemand7Day(+e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginBottom: 12 }}>🔋 Battery Reserve & Weight</h4>
            <div className="input-slider-group">
              <label>Weight (α): <strong style={{ color: '#10b981' }}>{alpha.toFixed(2)}</strong></label>
              <input type="range" min="0" max="1" step="0.05" value={alpha} onChange={(e) => setAlpha(+e.target.value)} style={{ width: '100%' }} />
            </div>
            <div className="input-slider-group" style={{ marginTop: 10 }}>
              <label>Stored Battery (B_SOC): <strong style={{ color: '#10b981' }}>{batterySOC} kWh</strong></label>
              <input type="range" min="0" max="400" step="10" value={batterySOC} onChange={(e) => setBatterySOC(+e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* ─── 24h vs 48h vs 72h Multi-Day Comparative Summary Cards ─────────────────── */}
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
          📊 Horizon Energy & Weather Summary Metrics ({hours} Hours Total)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div className="glass-card" style={{ padding: 14, borderTop: '3px solid #f59e0b' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Solar Energy ({hours}h)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b', marginTop: 2 }}>{horizonStats.totalSolar} kWh</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>Peak: {horizonStats.peakSolar} kW</div>
          </div>

          <div className="glass-card" style={{ padding: 14, borderTop: '3px solid #06b6d4' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Wind Energy ({hours}h)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#06b6d4', marginTop: 2 }}>{horizonStats.totalWind} kWh</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>Peak: {horizonStats.peakWind} kW</div>
          </div>

          <div className="glass-card" style={{ padding: 14, borderTop: '3px solid #10b981' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Renewable ({hours}h)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981', marginTop: 2 }}>{horizonStats.totalRenewable} kWh</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>Solar + Wind Combined</div>
          </div>

          <div className="glass-card" style={{ padding: 14, borderTop: '3px solid #facc15' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Demand ({hours}h)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#facc15', marginTop: 2 }}>{horizonStats.totalDemand} kWh</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>Peak Load: {horizonStats.peakDemand} kW</div>
          </div>

          <div className="glass-card" style={{ padding: 14, borderTop: `3px solid ${horizonStats.netMargin >= 0 ? '#10b981' : '#ef4444'}` }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Grid Margin ({hours}h)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: horizonStats.netMargin >= 0 ? '#10b981' : '#ef4444', marginTop: 2 }}>
              {horizonStats.netMargin >= 0 ? `+${horizonStats.netMargin}` : horizonStats.netMargin} kWh
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>Includes +{batteryUsable} kWh battery</div>
          </div>

          <div className="glass-card" style={{ padding: 14, borderTop: '3px solid #a78bfa' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Avg Weather Inputs</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#a78bfa', marginTop: 2 }}>{horizonStats.avgIrradiance} W/m²</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>Wind Avg: {horizonStats.avgWindSpeed} m/s</div>
          </div>
        </div>
      </div>

      {/* ─── Flagship Recharts Forecast Plots (Input Data & Forecast Outputs) ─────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Plot 1: Weather Input Drivers Graph (Solar Irradiance, Wind Speed, Temperature) */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div className="card-title">🌡️ Weather Input Data Drivers Graph ({hours}-Hour Horizon)</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Visualizing environmental inputs driving solar & wind models: Irradiance (W/m²), Wind Speed (m/s), Temperature (°C), and Cloud Cover (%)
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>● Irradiance (W/m²)</span>
              <span style={{ color: '#06b6d4', fontWeight: 600 }}>● Wind Speed (m/s)</span>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>― Temp (°C)</span>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>- - Cloud Cover (%)</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} interval={Math.max(0, Math.floor(hours / 12))} />
                <YAxis yAxisId="left" stroke="#f59e0b" fontSize={11} label={{ value: 'Irradiance (W/m²)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#f59e0b' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={11} label={{ value: 'Wind (m/s) / Temp (°C)', angle: 90, position: 'insideRight', fontSize: 10, fill: '#06b6d4' }} />
                <Tooltip contentStyle={{ background: '#06141b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8 }} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="irradiance" stroke="#f59e0b" fill="rgba(245,158,11,0.2)" name="Solar Irradiance (W/m²)" />
                <Line yAxisId="right" type="monotone" dataKey="windSpeed" stroke="#06b6d4" strokeWidth={2.5} dot={false} name="Wind Speed (m/s)" />
                <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} dot={false} name="Temperature (°C)" />
                <Line yAxisId="right" type="monotone" dataKey="cloudCover" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Cloud Cover (%)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plot 2: Renewable Generation vs Load Demand Profile */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div className="card-title">📈 Renewable Generation vs Village Demand Curve ({hours}-Hour Horizon)</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Stacked Solar & Wind generation (kW) compared directly with predicted village demand curve (yellow line)
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>● Solar PV</span>
              <span style={{ color: '#06b6d4', fontWeight: 600 }}>● Wind Turbine</span>
              <span style={{ color: '#facc15', fontWeight: 700 }}>― Demand Forecast</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} interval={Math.max(0, Math.floor(hours / 12))} />
                <YAxis stroke="var(--text-muted)" fontSize={11} label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#06141b', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" dataKey="solar" stackId="1" stroke="#f59e0b" fill="rgba(245,158,11,0.35)" name="Solar Generation (kW)" />
                <Area type="monotone" dataKey="wind" stackId="1" stroke="#06b6d4" fill="rgba(6,182,212,0.35)" name="Wind Generation (kW)" />
                <Line type="monotone" dataKey="demand" stroke="#facc15" strokeWidth={3} dot={false} name="Predicted Demand D_forecast (kW)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plot 4: Renewable Surplus / Deficit Margin Bar Chart */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div className="card-title">⚖️ Hourly Renewable Surplus (+) / Deficit (-) Margin ({hours}-Hour Horizon)</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Net hourly margin (Renewable Generation − Demand). Positive green bars indicate surplus; negative red bars indicate deficit requiring battery/genset dispatch.
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} interval={Math.max(0, Math.floor(hours / 12))} />
                <YAxis stroke="var(--text-muted)" fontSize={11} label={{ value: 'kW Margin', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#06141b', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="margin" name="Hourly Margin (kW)" radius={[4, 4, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─── Searchable Multi-Day Hourly Input & Forecast Data Table ─────────────────── */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                📋 Hourly Multi-Input & Forecast Data Log ({hours} Hours Data Points)
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Complete inspection table listing weather drivers, demand inputs, generation outputs, and grid margin.
              </p>
            </div>
            <input
              type="text"
              placeholder="🔍 Search time or values..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                color: 'var(--text-primary)',
                width: 220,
              }}
            />
          </div>

          <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
            <table className="kpi-table" style={{ width: '100%', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#06141b', zIndex: 2 }}>
                <tr>
                  <th>#</th>
                  <th>Time Label</th>
                  <th>Irradiance (W/m²)</th>
                  <th>Wind Speed (m/s)</th>
                  <th>Temp (°C)</th>
                  <th>Solar Gen (kW)</th>
                  <th>Wind Gen (kW)</th>
                  <th>D_LY (kW)</th>
                  <th>D_7day (kW)</th>
                  <th>Forecast Demand (kW)</th>
                  <th>Net Margin (kW)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableData.map((row) => (
                  <tr key={row.hourIdx}>
                    <td>{row.hourIdx}</td>
                    <td><strong style={{ color: 'var(--text-primary)' }}>{row.time}</strong></td>
                    <td style={{ color: '#f59e0b' }}>{row.irradiance}</td>
                    <td style={{ color: '#06b6d4' }}>{row.windSpeed}</td>
                    <td>{row.temperature}</td>
                    <td style={{ color: '#f59e0b', fontWeight: 600 }}>{row.solar}</td>
                    <td style={{ color: '#06b6d4', fontWeight: 600 }}>{row.wind}</td>
                    <td style={{ color: '#a78bfa' }}>{row.demandLY}</td>
                    <td style={{ color: '#38bdf8' }}>{row.demand7Day}</td>
                    <td style={{ color: '#facc15', fontWeight: 700 }}>{row.demand}</td>
                    <td>
                      <span style={{ color: row.margin >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {row.margin >= 0 ? `+${row.margin}` : row.margin}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
