import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for API calls with loading/error states.
 * @param {Function} apiCall - API function to call
 * @param {Array} deps - Dependencies to re-fetch on change
 * @param {boolean} immediate - Whether to fetch immediately
 */
export function useApi(apiCall, deps = [], immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [...deps, immediate]);

  return { data, loading, error, execute, setData };
}

/**
 * Hook that polls an API at a given interval.
 */
export function usePollingApi(apiCall, intervalMs = 30000, deps = []) {
  const { data, loading, error, execute } = useApi(apiCall, deps, true);

  useEffect(() => {
    const timer = setInterval(execute, intervalMs);
    return () => clearInterval(timer);
  }, [execute, intervalMs]);

  return { data, loading, error, refresh: execute };
}
