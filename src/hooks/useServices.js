import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const DEFAULT_STALE_TIME = 60_000;

// branchId: optional DB id of the selected sucursal. When set, the catalog's
// promo decoration is scoped to that branch (see GET /api/services?branch=).
// Landing and other branch-agnostic callers omit it and get the same result
// as before.
//
// staleTime: per-caller freshness override. The booking wizard (Home →
// Booking → SpecialistSelector) remounts this hook several times within the
// same session, so it keeps the 60s default to avoid redundant refetches
// (perf(booking) b8b6685). The public landing page mounts once per session
// and should reflect admin edits quickly, so it passes a shorter window —
// React Query tracks staleness per observer, so this doesn't reintroduce the
// wizard's redundant-refetch problem: whichever caller is stale first
// refreshes the shared cache entry, and the other simply reuses that data.
export function useServices(branchId, { staleTime = DEFAULT_STALE_TIME } = {}) {
  const bId = Number.isInteger(branchId) && branchId > 0 ? branchId : null;
  return useQuery({
    queryKey: ['services', bId],
    queryFn: async ({ signal }) => {
      const [s, sp] = await Promise.all([api.getServices(bId, { signal }), api.getSpecialists({ signal })]);
      return { services: s.services, specialists: sp.specialists };
    },
    staleTime,
    refetchOnWindowFocus: true,
  });
}
