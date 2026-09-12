/**
 * UrjaSetu API Client
 * Centralized API calls to the FastAPI backend.
 */

const API_BASE = 'http://localhost:8000/api';

async function fetchJSON(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${url}`, error);
    throw error;
  }
}

// ─── Forecast ───────────────────────────────────────────────────────────

export const getForecast = (hours = 24) =>
  fetchJSON(`/forecast?hours=${hours}`);

export const getWeather = () =>
  fetchJSON('/weather');

export const getDemand = (hours = 24) =>
  fetchJSON(`/demand?hours=${hours}`);

// ─── Battery ────────────────────────────────────────────────────────────

export const getBattery = () =>
  fetchJSON('/battery');

export const getBatteryHistory = (limit = 168) =>
  fetchJSON(`/battery/history?limit=${limit}`);

// ─── Dispatch & Optimization ────────────────────────────────────────────

export const getDispatch = () =>
  fetchJSON('/dispatch');

export const runOptimize = (params = {}) =>
  fetchJSON('/optimize', {
    method: 'POST',
    body: JSON.stringify({
      hours_ahead: params.hours || 24,
      optimizer_type: params.optimizer || 'rule_based',
      use_forecast: true,
    }),
  });

// ─── KPI ────────────────────────────────────────────────────────────────

export const getKPIs = () =>
  fetchJSON('/kpi');

// ─── Blackout Risk ──────────────────────────────────────────────────────

export const getBlackoutRisk = (hours = 12) =>
  fetchJSON(`/blackout-risk?hours=${hours}`);

// ─── Alerts ─────────────────────────────────────────────────────────────

export const getAlerts = (limit = 50) =>
  fetchJSON(`/alerts?limit=${limit}`);

export const acknowledgeAlert = (id) =>
  fetchJSON(`/alerts/${id}/ack`, { method: 'POST' });

// ─── Performance ────────────────────────────────────────────────────────

export const getPerformance = () =>
  fetchJSON('/performance');

// ─── Scenario / What-If ─────────────────────────────────────────────────

export const runScenario = (params = {}) =>
  fetchJSON('/scenario', {
    method: 'POST',
    body: JSON.stringify({
      cloudy_days: params.cloudyDays || 0,
      low_wind: params.lowWind || false,
      high_demand: params.highDemand || false,
      battery_degradation: params.batteryDegradation || 0,
      diesel_unavailable: params.dieselUnavailable || false,
      hours: params.hours || 72,
    }),
  });

// ─── History ────────────────────────────────────────────────────────────

export const getHistory = (range = 'week') =>
  fetchJSON(`/history?range=${range}`);
