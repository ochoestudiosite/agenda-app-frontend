import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

// Cache key namespaced by hostname so a stale read can never bleed across
// tenants even in pathological setups (different tenant served from the same
// origin — e.g. local development with X-Tenant-Slug overrides). In production
// each tenant runs on its own subdomain so localStorage is already isolated,
// but the explicit key makes that invariant obvious in code.
const CACHE_KEY = `biz:config:v2:${typeof window !== 'undefined' ? window.location.hostname : 'ssr'}`;

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) ?? undefined; }
  catch { return undefined; }
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
  // Evict legacy v1 entries while we are at it.
  try { localStorage.removeItem('biz:config:v1'); } catch {}
}

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      try {
        const data = await api.getConfig();
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
        return data;
      } catch (err) {
        // Evict stale cache so next visit starts clean
        if (err?.status === 404 || err?.status === 403 || err?.status === 400) clearCache();
        throw err;
      }
    },
    initialData:          readCache,
    initialDataUpdatedAt: 0,
    staleTime:            10 * 1000,
    refetchOnWindowFocus: true,
    // No point retrying — tenant deleted/suspended won't change in 2 seconds
    retry: (failureCount, err) => {
      if (err?.status === 404 || err?.status === 403 || err?.status === 400) return false;
      return failureCount < 2;
    },
  });
}
