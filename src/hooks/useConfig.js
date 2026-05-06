import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const CACHE_KEY = 'biz:config:v1';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) ?? undefined; }
  catch { return undefined; }
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
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
        if (err?.status === 404 || err?.status === 403) clearCache();
        throw err;
      }
    },
    initialData:          readCache,
    initialDataUpdatedAt: 0,
    staleTime:            2 * 60 * 1000,
    refetchOnWindowFocus: true,
    // No point retrying — tenant deleted/suspended won't change in 2 seconds
    retry: (failureCount, err) => {
      if (err?.status === 404 || err?.status === 403) return false;
      return failureCount < 2;
    },
  });
}
