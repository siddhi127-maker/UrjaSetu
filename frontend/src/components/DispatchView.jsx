export default function DispatchView({ dispatch }) {
  if (!dispatch) {
    return <div className="card-label">No dispatch data available</div>;
  }

  const sources = [
    { icon: '☀️', label: 'Solar', value: dispatch.solar_kw, unit: 'kW', type: 'solar' },
    { icon: '🌬️', label: 'Wind', value: dispatch.wind_kw, unit: 'kW', type: 'wind' },
    { icon: '🔋', label: 'Battery', value: Math.abs(dispatch.battery_kw), unit: 'kW', type: 'battery',
      suffix: dispatch.battery_kw < 0 ? '(charging)' : dispatch.battery_kw > 0 ? '(discharging)' : '' },
    { icon: '⛽', label: 'Diesel', value: dispatch.diesel_kw, unit: 'kW', type: 'diesel' },
    { icon: '🔴', label: 'Demand', value: dispatch.demand_kw, unit: 'kW', type: 'demand' },
  ];

  const status = dispatch.status || 'ok';
  const statusText = {
    ok: '✅ Renewable sources sufficient',
    warning: '⚠️ Backup sources active',
    critical: '🔴 Power shortfall detected',
  };

  return (
    <div>
      <div className={`status-banner ${status}`}>
        {statusText[status] || statusText.ok}
      </div>

      <div className="dispatch-view">
        {sources.map(s => (
          <div key={s.type} className={`dispatch-source ${s.type}`}>
            <div className="dispatch-icon">{s.icon}</div>
            <div>
              <div className="dispatch-value">
                {(s.value || 0).toFixed(1)} <span style={{ fontSize: 12, opacity: 0.6 }}>{s.unit}</span>
              </div>
              <div className="dispatch-label">
                {s.label} {s.suffix && <span style={{ opacity: 0.7 }}>{s.suffix}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {dispatch.explanation && (
        <div className="explanation-card">
          💡 {dispatch.explanation}
        </div>
      )}
    </div>
  );
}
