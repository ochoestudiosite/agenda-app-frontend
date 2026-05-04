import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const CACHE_KEY = 'biz:config:v1';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) ?? undefined; }
  catch { return undefined; }
}

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const data = await api.getConfig();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
      return data;
    },
    initialData:          readCache,  // show cached data immediately — no loading flash on repeat visits
    initialDataUpdatedAt: 0,          // always treat cache as stale → silently refetch in background
    staleTime:            2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
