import { useMemo } from 'react';

export default function BatteryGauge({ soc = 80, health = 100 }) {
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const clampedSoc = Math.max(0, Math.min(100, soc));
  const offset = circumference - (clampedSoc / 100) * circumference;

  const color = useMemo(() => {
    if (clampedSoc <= 20) return '#ef4444';
    if (clampedSoc <= 40) return '#f59e0b';
    return '#10b981';
  }, [clampedSoc]);

  return (
    <div className="battery-gauge">
      <div className="gauge-circle">
        <svg className="gauge-svg" viewBox="0 0 160 160">
          <circle className="gauge-bg" cx="80" cy="80" r={radius} />
          <circle
            className="gauge-fill"
            cx="80"
            cy="80"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="gauge-text">
          <div className="gauge-percent" style={{ color }}>{clampedSoc.toFixed(0)}%</div>
          <div className="gauge-label">State of Charge</div>
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Battery Health</div>
        <div style={{
          fontSize: 18, fontWeight: 700,
          color: health >= 80 ? '#10b981' : health >= 60 ? '#f59e0b' : '#ef4444'
        }}>
          {health.toFixed(0)}%
        </div>
      </div>

    </div>
  );
}
