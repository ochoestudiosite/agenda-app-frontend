import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useAvailability(date, specialistId, branchId) {
  return useQuery({
    queryKey: ['availability', date, specialistId, branchId],
    queryFn: () => api.getAvailability(date, specialistId, branchId),
    enabled: !!date,
    staleTime: 30_000, // 30 s — revalidate often since slots change
  });
}

export function useBlockedDates(month, specialistId) {
  return useQuery({
    queryKey: ['blockedDates', month, specialistId],
    queryFn: () => api.getBlockedDates(month, specialistId),
    enabled: !!month,
    staleTime: 300_000, // 5 min — blocked dates don't change often
  });
}
