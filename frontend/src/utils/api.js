/**
 * UrjaSetu API Client
 * Centralized API calls to the FastAPI backend.
 */

import { getToken } from './auth';

const API_BASE = 'http://localhost:8000/api';

async function fetchJSON(url, options = {}) {
  try {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}${url}`, {
      headers,
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

// ─── Sites & Microgrid Profiles ─────────────────────────────────────────

export const getSites = () =>
  fetchJSON('/sites');

export const getSiteDetails = (siteId) =>
  fetchJSON(`/sites/${siteId}`);

// ─── Dispatch & Optimization ────────────────────────────────────────────

export const getDispatch = () =>
  fetchJSON('/dispatch');

export const runOptimize = (params = {}) =>
  fetchJSON('/optimize', {
    method: 'POST',
    body: JSON.stringify({
      hours_ahead: params.hours || 24,
      optimizer_type: params.optimizer || 'milp',
      use_forecast: true,
      site_id: params.siteId || 'rampur_village',
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
      site_id: params.siteId || 'rampur_village',
      solar_multiplier: params.solarMultiplier ?? 1.0,
      wind_multiplier: params.windMultiplier ?? 1.0,
      battery_capacity_multiplier: params.batteryCapacityMultiplier ?? 1.0,
      demand_multiplier: params.demandMultiplier ?? 1.0,
      diesel_price_per_l: params.dieselPricePerL || null,
      cloudy_days: params.cloudyDays || 0,
      low_wind: params.lowWind || false,
      high_demand: params.highDemand || false,
      battery_degradation: params.batteryDegradation || 0,
      diesel_unavailable: params.dieselUnavailable || false,
      hours: params.hours || 24,
    }),
  });

// ─── History ────────────────────────────────────────────────────────────

export const getHistory = (range = 'week') =>
  fetchJSON(`/history?range=${range}`);

// ─── Admin ──────────────────────────────────────────────────────────────

export const getAdminUsers = () =>
  fetchJSON('/admin/users');

export const updateUserRole = (userId, role) =>
  fetchJSON(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });

export const toggleUserActive = (userId) =>
  fetchJSON(`/admin/users/${userId}`, { method: 'DELETE' });

// ─── Auth ───────────────────────────────────────────────────────────────

export { googleLogin } from './auth';

// ─── Dataset Info ───────────────────────────────────────────────────────

export const getDatasetInfo = () =>
  fetchJSON('/dataset-info');

// ─── Modules 6.6 & 6.7 ─────────────────────────────────────────────────

export const getDayAheadForecast = (batteryKwh = 160.0, socPct = 80.0) =>
  fetchJSON(`/forecast/day-ahead?battery_kwh=${batteryKwh}&battery_soc_pct=${socPct}`);

export const getPerUnitMaintenance = (irradiance = 850, temp = 32, wind = 8.5) =>
  fetchJSON(`/maintenance/per-unit?irradiance=${irradiance}&temperature=${temp}&wind_speed=${wind}`);



