import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = {
  Solar: '#f59e0b',
  Wind: '#06b6d4',
  Battery: '#10b981',
  Diesel: '#ef4444',
};

export default function EnergyMixChart({ solar = 0, wind = 0, battery = 0, diesel = 0 }) {
  const total = solar + wind + battery + diesel;
  if (total === 0) return <div className="card-label" style={{ textAlign: 'center', padding: 40 }}>No energy data yet</div>;

  const data = [
    { name: 'Solar', value: solar, color: COLORS.Solar },
    { name: 'Wind', value: wind, color: COLORS.Wind },
    { name: 'Battery', value: battery, color: COLORS.Battery },
    { name: 'Diesel', value: diesel, color: COLORS.Diesel },
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const pct = ((item.value / total) * 100).toFixed(1);
      return (
        <div style={{
          background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px 14px', fontSize: 13,
        }}>
          <div style={{ color: item.payload.color, fontWeight: 600 }}>{item.name}</div>
          <div style={{ color: '#e2e8f0' }}>{item.value.toFixed(1)} kWh ({pct}%)</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div style={{ textAlign: 'center', marginTop: -160, marginBottom: 100, pointerEvents: 'none' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>
          {total.toFixed(0)}
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>kWh Total</div>
      </div>

      {/* Legend bar */}
      <div className="energy-mix-bar">
        {data.map(d => (
          <div
            key={d.name}
            className={`energy-mix-segment ${d.name.toLowerCase()}`}
            style={{ width: `${(d.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="energy-legend">
        {data.map(d => (
          <div key={d.name} className="legend-item">
            <div className={`legend-dot ${d.name.toLowerCase()}`} />
            <span>{d.name}</span>
            <span className="legend-value">{d.value.toFixed(1)} kWh</span>
            <span style={{ color: '#64748b' }}>({((d.value / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
