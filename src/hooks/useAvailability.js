import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useAvailability(date, specialistId, branchId, serviceId, excludeCode = null, serviceIds = null) {
  return useQuery({
    queryKey: ['availability', date, specialistId, branchId, serviceId, excludeCode, serviceIds],
    queryFn:  () => api.getAvailability(date, specialistId, branchId, serviceId, excludeCode, serviceIds),
    enabled:  !!date,
    staleTime: 30_000,
  });
}

// Group availability: finds start times where all specialists are free sequentially.
// assignments = [{serviceId, specialistId}]
export function useGroupAvailability(date, assignments, branchId, excludeCodes) {
  const enabled = !!date && assignments?.length >= 2;
  return useQuery({
    queryKey: ['groupAvailability', date, assignments, branchId, excludeCodes],
    queryFn:  () => api.getGroupAvailability(date, assignments, branchId, excludeCodes),
    enabled,
    staleTime: 30_000,
  });
}

export function useBlockedDates(month, specialistId, branchId, specialistIds) {
  return useQuery({
    queryKey: ['blockedDates', month, specialistId, branchId, specialistIds],
    queryFn: () => api.getBlockedDates(month, specialistId, branchId, specialistIds),
    enabled: !!month,
    staleTime: 300_000, // 5 min — blocked dates don't change often
  });
}
