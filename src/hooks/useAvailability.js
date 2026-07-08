import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

// Shared queryKey/queryFn builders — used by both the real useQuery hooks below
// AND usePrefetchAvailability (F-04), so a speculative prefetch for a given date
// always lands in the exact same cache slot the real hook will read later.
function availabilityOptions(date, specialistId, branchId, serviceId, excludeCode, serviceIds) {
  return {
    queryKey: ['availability', date, specialistId, branchId, serviceId, excludeCode, serviceIds],
    queryFn:  ({ signal }) => api.getAvailability(date, specialistId, branchId, serviceId, excludeCode, serviceIds, { signal }),
    staleTime: 30_000,
  };
}

function groupAvailabilityOptions(date, assignments, branchId, excludeCodes) {
  return {
    queryKey: ['groupAvailability', date, assignments, branchId, excludeCodes],
    queryFn:  ({ signal }) => api.getGroupAvailability(date, assignments, branchId, excludeCodes, { signal }),
    staleTime: 30_000,
  };
}

export function useAvailability(date, specialistId, branchId, serviceId, excludeCode = null, serviceIds = null) {
  return useQuery({
    ...availabilityOptions(date, specialistId, branchId, serviceId, excludeCode, serviceIds),
    enabled: !!date,
  });
}

// Group availability: finds start times where all specialists are free sequentially.
// assignments = [{serviceId, specialistId}]
export function useGroupAvailability(date, assignments, branchId, excludeCodes) {
  const enabled = !!date && assignments?.length >= 2;
  return useQuery({
    ...groupAvailabilityOptions(date, assignments, branchId, excludeCodes),
    enabled,
  });
}

// F-04: speculative prefetch for DateTimePicker's auto-advance. Warms the cache
// for a candidate date BEFORE the real auto-advance effect decides to jump to
// it, so that if it does, the query below resolves from cache instead of
// waiting on a fresh network round-trip. Never touches auto-advance decision
// logic — purely a cache-warming side effect using the same options builders
// as the hooks above, guaranteeing an identical queryKey.
export function usePrefetchAvailability() {
  const queryClient = useQueryClient();
  return {
    prefetchAvailability: (date, specialistId, branchId, serviceId, excludeCode, serviceIds) => {
      if (!date) return;
      queryClient.prefetchQuery(availabilityOptions(date, specialistId, branchId, serviceId, excludeCode, serviceIds))
        .catch(() => {});
    },
    prefetchGroupAvailability: (date, assignments, branchId, excludeCodes) => {
      if (!date || !(assignments?.length >= 2)) return;
      queryClient.prefetchQuery(groupAvailabilityOptions(date, assignments, branchId, excludeCodes))
        .catch(() => {});
    },
  };
}

export function useBlockedDates(month, specialistId, branchId, specialistIds) {
  return useQuery({
    queryKey: ['blockedDates', month, specialistId, branchId, specialistIds],
    queryFn: ({ signal }) => api.getBlockedDates(month, specialistId, branchId, specialistIds, { signal }),
    enabled: !!month,
    staleTime: 300_000, // 5 min — blocked dates don't change often
  });
}
