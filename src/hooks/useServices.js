import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

// branchId: optional DB id of the selected sucursal. When set, the catalog's
// promo decoration is scoped to that branch (see GET /api/services?branch=).
// Landing and other branch-agnostic callers omit it and get the same result
// as before.
export function useServices(branchId) {
  const bId = Number.isInteger(branchId) && branchId > 0 ? branchId : null;
  return useQuery({
    queryKey: ['services', bId],
    queryFn: async ({ signal }) => {
      const [s, sp] = await Promise.all([api.getServices(bId, { signal }), api.getSpecialists({ signal })]);
      return { services: s.services, specialists: sp.specialists };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
