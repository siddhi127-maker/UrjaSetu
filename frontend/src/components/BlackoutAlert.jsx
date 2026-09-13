export default function BlackoutAlert({ risk }) {
  if (!risk || risk.risk_level === 'LOW') return null;

  const styles = {
    MEDIUM: { bg: 'rgba(245, 158, 11, 0.06)', border: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', icon: '⚠️' },
    HIGH: { bg: 'rgba(239, 68, 68, 0.06)', border: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', icon: '🔴' },
    CRITICAL: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', icon: '🚨' },
  };

  const s = styles[risk.risk_level] || styles.MEDIUM;

  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 16,
      animation: risk.risk_level === 'CRITICAL' ? 'pulse-badge 1.5s infinite' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{s.icon}</span>
        <span style={{ fontWeight: 700, color: s.color, fontSize: 15 }}>
          Blackout Risk: {risk.risk_level}
        </span>
        <span style={{
          marginLeft: 'auto', padding: '2px 10px', borderRadius: 99,
          background: s.bg, border: `1px solid ${s.border}`, fontSize: 12, fontWeight: 600, color: s.color,
        }}>
          Score: {(risk.risk_score * 100).toFixed(0)}%
        </span>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 12 }}>
        {risk.message}
      </div>

      {risk.hours_until_critical && (
        <div style={{ fontSize: 13, color: s.color, fontWeight: 600 }}>
          ⏱️ Estimated {risk.hours_until_critical} hours until critical
        </div>
      )}

      {risk.recommendations && risk.recommendations.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            RECOMMENDATIONS
          </div>
          {risk.recommendations.map((rec, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '3px 0' }}>
              → {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

