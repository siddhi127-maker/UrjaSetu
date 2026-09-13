import React from 'react';

export default function ExplainabilityCard({ blocks, shortSummary, status }) {
  if (!blocks && !shortSummary) return null;

  const b = blocks || {
    summary: shortSummary || 'System operating normally.',
    renewable_battery: 'Solar and wind generation powering connected loads.',
    diesel_load: 'Zero diesel generator dispatch required.',
    impact_recommendation: 'All equipment operating within optimal parameters.',
  };

  return (
    <div className="glass-card explainability-card" style={{ marginBottom: 20, borderLeft: '4px solid #10b981' }}>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          <span>🤖</span> AI Operator Decision Explanation (4-Block Insight)
        </div>
        <span className={`status-badge ${status || 'ok'}`} style={{ textTransform: 'uppercase', fontSize: 11 }}>
          {status || 'Optimal'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {/* Block 1: Summary */}
        <div style={{ background: 'var(--bg-glass)', padding: 12, borderRadius: 8, border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>
            1️⃣ OPERATIONAL SUMMARY
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {b.summary}
          </div>
        </div>

        {/* Block 2: Renewable & Battery Strategy */}
        <div style={{ background: 'var(--bg-glass)', padding: 12, borderRadius: 8, border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>
            2️⃣ RENEWABLE & BATTERY STRATEGY
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {b.renewable_battery}
          </div>
        </div>

        {/* Block 3: Diesel & Load Shedding Rationale */}
        <div style={{ background: 'var(--bg-glass)', padding: 12, borderRadius: 8, border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
            3️⃣ DIESEL & LOAD SHEDDING GUARDRAILS
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {b.diesel_load}
          </div>
        </div>

        {/* Block 4: Impact & Guidance */}
        <div style={{ background: 'var(--bg-glass)', padding: 12, borderRadius: 8, border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', marginBottom: 4 }}>
            4️⃣ ACTIONABLE RECOMMENDATION
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {b.impact_recommendation}
          </div>
        </div>
      </div>
    </div>
  );
}

