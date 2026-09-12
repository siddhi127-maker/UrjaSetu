export default function KPICard({ title, value, unit, icon, type, change, label }) {
  return (
    <div className={`glass-card kpi-card ${type || ''} animate-fade-in`}>
      <div className="kpi-icon">{icon}</div>
      <div className="card-title">{title}</div>
      <div className="card-value">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        {unit && <span style={{ fontSize: '16px', fontWeight: 500, marginLeft: 4, opacity: 0.7 }}>{unit}</span>}
      </div>
      {label && <div className="card-label">{label}</div>}
      {change !== undefined && (
        <div className={`card-change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
