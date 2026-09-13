import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { getKPIs, getDispatch, getBlackoutRisk, getSites } from '../utils/api';
import KPICard from '../components/KPICard';
import EnergyMixChart from '../components/EnergyMixChart';
import BatteryGauge from '../components/BatteryGauge';
import DispatchView from '../components/DispatchView';
import BlackoutAlert from '../components/BlackoutAlert';
import ExplainabilityCard from '../components/ExplainabilityCard';
import { downloadCSV } from '../utils/csvExport';

export default function Dashboard() {
  const { data: kpi, loading: kpiLoading } = useApi(getKPIs);
  const { data: dispatch } = useApi(getDispatch);
  const { data: risk } = useApi(getBlackoutRisk);
  const { data: sites } = useApi(getSites);
  const [activeSite, setActiveSite] = useState(null);

  useEffect(() => {
    if (sites && sites.length > 0 && !activeSite) {
      setActiveSite(sites[0]);
    }
  }, [sites]);

  const handleExportCSV = () => {
    if (!dispatch) return;
    const row = {
      Timestamp: dispatch.timestamp,
      Demand_kW: dispatch.demand_kw,
      Solar_kW: dispatch.solar_kw,
      Wind_kW: dispatch.wind_kw,
      Battery_kW: dispatch.battery_kw,
      Diesel_kW: dispatch.diesel_kw,
      SoC_Before: dispatch.battery_soc_before,
      SoC_After: dispatch.battery_soc_after,
      Cost_INR: dispatch.total_cost,
      Status: dispatch.status,
      Explanation: dispatch.explanation,
    };
    downloadCSV(`UrjaSetu_Dispatch_${new Date().toISOString().slice(0, 10)}.csv`, [row]);
  };

  return (
    <div className="animate-fade-in">
      {/* Site Header Banner */}
      {activeSite && (
        <div
          className="glass-card"
          style={{
            marginBottom: 20,
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(14,165,233,0.08) 100%)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>{activeSite.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                {activeSite.name} ({activeSite.location})
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {activeSite.description}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                background: 'var(--bg-glass)',
                padding: '6px 12px',
                borderRadius: 8,
              }}
            >
              ☀️ {activeSite.solar_capacity_kw}kW | 🌬️ {activeSite.wind_capacity_kw}kW | 🔋 {activeSite.battery_capacity_kwh}kWh
            </div>

            <button className="btn btn-secondary" onClick={handleExportCSV} style={{ fontSize: 12, padding: '6px 12px' }}>
              📥 Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Blackout Alert */}
      <BlackoutAlert risk={risk} />

      {/* 4-Block Decision Explainability */}
      <ExplainabilityCard
        blocks={dispatch?.explanation_blocks}
        shortSummary={dispatch?.explanation}
        status={dispatch?.status}
      />

      {/* KPI Cards */}
      <div className="kpi-grid stagger">
        <KPICard
          title="Cost Saved"
          value={kpiLoading ? '...' : `₹${kpi?.cost_saved?.toFixed(0) || 0}`}
          icon="💰"
          type="cost"
          label={kpi ? `Today: ₹${kpi.today_cost?.toFixed(0)} vs Baseline: ₹${kpi.baseline_cost?.toFixed(0)}` : ''}
          change={kpi?.cost_saved_percent}
        />
        <KPICard
          title="CO₂ Avoided"
          value={kpiLoading ? '...' : (kpi?.co2_avoided_kg?.toFixed(0) || 0)}
          unit="kg"
          icon="🌱"
          type="co2"
          label={`Emitted: ${kpi?.co2_emitted_kg?.toFixed(1) || 0} kg`}
        />
        <KPICard
          title="Reliability"
          value={kpiLoading ? '...' : (kpi?.reliability_percent?.toFixed(1) || 0)}
          unit="%"
          icon="🛡️"
          type="reliability"
          label={kpi ? `${kpi.hours_with_power}/${kpi.total_hours} hours` : ''}
        />
        <KPICard
          title="Battery"
          value={kpiLoading ? '...' : (kpi?.battery_soc?.toFixed(0) || 0)}
          unit="%"
          icon="🔋"
          type="battery"
          label={`Health: ${kpi?.battery_health?.toFixed(0) || 100}%`}
        />
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Energy Mix */}
        <div className="glass-card chart-container">
          <div className="card-header">
            <div className="card-title">Energy Mix — Today</div>
          </div>
          <EnergyMixChart
            solar={kpi?.solar_kwh || 0}
            wind={kpi?.wind_kwh || 0}
            battery={kpi?.battery_kwh || 0}
            diesel={kpi?.diesel_kwh || 0}
          />
        </div>

        {/* Battery Gauge */}
        <div className="glass-card chart-container">
          <div className="card-header">
            <div className="card-title">Battery Status</div>
          </div>
          <BatteryGauge
            soc={kpi?.battery_soc || 80}
            health={kpi?.battery_health || 100}
          />
        </div>
      </div>

      {/* Current Dispatch */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">Current Dispatch</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {dispatch?.optimizer_type === 'rule_based' ? '📐 Rule-Based' :
             dispatch?.optimizer_type === 'lp' ? '📊 LP Optimized' : '⚡ PuLP MILP Optimal'}
          </div>
        </div>

        <DispatchView dispatch={dispatch} />
      </div>

      {/* Quick Stats */}
      <div className="kpi-grid stagger">
        <KPICard
          title="Solar Today"
          value={kpiLoading ? '...' : (kpi?.solar_kwh?.toFixed(1) || 0)}
          unit="kWh"
          icon="☀️"
          type="solar"
        />
        <KPICard
          title="Wind Today"
          value={kpiLoading ? '...' : (kpi?.wind_kwh?.toFixed(1) || 0)}
          unit="kWh"
          icon="🌬️"
          type="wind"
        />
        <KPICard
          title="Battery Discharge"
          value={kpiLoading ? '...' : (kpi?.battery_kwh?.toFixed(1) || 0)}
          unit="kWh"
          icon="🔋"
          type="battery"
        />
        <KPICard
          title="Diesel Used"
          value={kpiLoading ? '...' : (kpi?.diesel_kwh?.toFixed(1) || 0)}
          unit="kWh"
          icon="⛽"
          type="diesel"
        />
      </div>
    </div>
  );
}

