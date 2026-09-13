import React, { useState } from 'react';

export const INITIAL_INDIA_SITES = [
  { id: 'kalyanpura', name: 'Kalyanpura Village', state: 'Gujarat', lat: 23.0225, lon: 72.5714, solar: 250, wind: 100, battery: 200, icon: '🌾', type: 'Agricultural Grid' },
  { id: 'barmer_desert', name: 'Barmer Thar Desert', state: 'Rajasthan', lat: 25.7500, lon: 71.4000, solar: 400, wind: 150, battery: 350, icon: '☀️', type: 'Desert Solar Hub' },
  { id: 'leh_ladakh', name: 'Leh Alpine Grid', state: 'Ladakh', lat: 34.1526, lon: 77.5771, solar: 300, wind: 50, battery: 300, icon: '🏔️', type: 'High Altitude Cold Desert' },
  { id: 'sundarbans_hub', name: 'Sundarbans Island', state: 'West Bengal', lat: 21.9497, lon: 88.9007, solar: 180, wind: 90, battery: 250, icon: '🏝️', type: 'Coastal Off-Grid Island' },
  { id: 'wayanad_hills', name: 'Wayanad Plantation', state: 'Kerala', lat: 11.6854, lon: 76.1320, solar: 120, wind: 80, battery: 180, icon: '⛰️', type: 'Western Ghats Monsoon Grid' },
  { id: 'koraput_highlands', name: 'Koraput Highland', state: 'Odisha', lat: 18.8135, lon: 82.7123, solar: 160, wind: 60, battery: 220, icon: '🏕️', type: 'Tribal Highland Grid' },
  { id: 'kutch_mega', name: 'Kutch Salt Hybrid', state: 'Gujarat', lat: 23.7337, lon: 69.8597, solar: 500, wind: 250, battery: 500, icon: '💨', type: 'Coastal Mega Hybrid Grid' },
  { id: 'kanyakumari_wind', name: 'Kanyakumari Cape', state: 'Tamil Nadu', lat: 8.0883, lon: 77.5385, solar: 200, wind: 300, battery: 400, icon: '🌀', type: 'Southern Cape High Wind Grid' },
];

export default function IndiaMapSelector({ activeSite, onSelectSite }) {
  const [mapMode, setMapMode] = useState('interactive'); // 'interactive', 'google_maps', 'custom'
  const [sites, setSites] = useState(INITIAL_INDIA_SITES);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom location input state
  const [customName, setCustomName] = useState('');
  const [customState, setCustomState] = useState('');
  const [customLat, setCustomLat] = useState('28.6139');
  const [customLon, setCustomLon] = useState('77.2090');
  const [customSolar, setCustomSolar] = useState('200');
  const [customWind, setCustomWind] = useState('80');
  const [customBattery, setCustomBattery] = useState('250');

  const current = sites.find(s => s.id === activeSite?.id) || sites[0];

  const handleAddCustomSite = (e) => {
    e.preventDefault();
    if (!customName) return;
    const newSite = {
      id: `custom_${Date.now()}`,
      name: customName,
      state: customState || 'India',
      lat: parseFloat(customLat) || 20.5937,
      lon: parseFloat(customLon) || 78.9629,
      solar: parseFloat(customSolar) || 200,
      wind: parseFloat(customWind) || 50,
      battery: parseFloat(customBattery) || 200,
      icon: '📍',
      type: 'Custom Selected Microgrid',
    };
    setSites([newSite, ...sites]);
    if (onSelectSite) onSelectSite(newSite);
    setCustomName('');
    setCustomState('');
    setMapMode('interactive');
  };

  const filteredSites = sites.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 24, border: '1px solid rgba(59,130,246,0.3)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🗺️</span> Pan-India Location Selector & Google Maps
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Click any pin marker or type custom coordinates to select any microgrid site across India.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`btn ${mapMode === 'interactive' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMapMode('interactive')}
            style={{ fontSize: 12 }}
          >
            🇮🇳 India Grid Map
          </button>
          <button
            className={`btn ${mapMode === 'google_maps' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMapMode('google_maps')}
            style={{ fontSize: 12 }}
          >
            📍 Google Satellite View
          </button>
          <button
            className={`btn ${mapMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMapMode('custom')}
            style={{ fontSize: 12 }}
          >
            ➕ Add Custom Location
          </button>
        </div>
      </div>

      {/* ─── Search & Active Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            type="text"
            placeholder="Search state, city, or site name in India..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Selected: <strong style={{ color: '#38bdf8' }}>{current.name}</strong> ({current.state} | {current.lat}°N, {current.lon}°E)
        </div>
      </div>

      {/* ─── Map Modes ───────────────────────────────────────────────────── */}
      {mapMode === 'custom' ? (
        /* Custom Location Form */
        <form onSubmit={handleAddCustomSite} className="glass-card" style={{ padding: 20, background: 'rgba(0,0,0,0.3)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
            📍 Add Custom GPS Location in India
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="input-slider-group">
              <label>Location / City Name:</label>
              <input type="text" placeholder="e.g. Ahmedabad / Shimla" value={customName} onChange={(e) => setCustomName(e.target.value)} required style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: '#fff' }} />
            </div>
            <div className="input-slider-group">
              <label>State Name:</label>
              <input type="text" placeholder="e.g. Gujarat / HP" value={customState} onChange={(e) => setCustomState(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: '#fff' }} />
            </div>
            <div className="input-slider-group">
              <label>Latitude (°N):</label>
              <input type="number" step="0.0001" value={customLat} onChange={(e) => setCustomLat(e.target.value)} required style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: '#fff' }} />
            </div>
            <div className="input-slider-group">
              <label>Longitude (°E):</label>
              <input type="number" step="0.0001" value={customLon} onChange={(e) => setCustomLon(e.target.value)} required style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: '#fff' }} />
            </div>
            <div className="input-slider-group">
              <label>Solar Cap (kW):</label>
              <input type="number" value={customSolar} onChange={(e) => setCustomSolar(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: '#fff' }} />
            </div>
            <div className="input-slider-group">
              <label>Wind Cap (kW):</label>
              <input type="number" value={customWind} onChange={(e) => setCustomWind(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: '#fff' }} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>
            ✓ Select & Save Custom Location
          </button>
        </form>
      ) : mapMode === 'google_maps' ? (
        /* Google Maps Satellite Embed + Pin Quick Selector Bar */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
            {filteredSites.map(s => (
              <button
                key={s.id}
                onClick={() => onSelectSite && onSelectSite(s)}
                className={`btn ${s.id === current.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' }}
              >
                {s.icon} {s.name} ({s.state})
              </button>
            ))}
          </div>

          <div style={{ width: '100%', height: 380, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
            <iframe
              title="Google Maps Microgrid Satellite"
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://maps.google.com/maps?q=${current.lat},${current.lon}&z=13&output=embed`}
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        /* Pan-India Interactive Regional Grid Map */
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 18, border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
            {filteredSites.map((site) => {
              const isSelected = site.id === current.id;
              return (
                <div
                  key={site.id}
                  onClick={() => onSelectSite && onSelectSite(site)}
                  style={{
                    padding: '14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: isSelected ? 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(16,185,129,0.25) 100%)' : 'var(--bg-glass)',
                    border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border-glass)',
                    boxShadow: isSelected ? '0 0 16px rgba(59,130,246,0.3)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{site.icon}</span>
                    <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 999, color: 'var(--text-secondary)' }}>
                      {site.state}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {site.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {site.type} ({site.lat}°N, {site.lon}°E)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, display: 'flex', gap: 10 }}>
                    <span>☀️ {site.solar}kW</span>
                    <span>🌬️ {site.wind}kW</span>
                    <span>🔋 {site.battery}kWh</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
