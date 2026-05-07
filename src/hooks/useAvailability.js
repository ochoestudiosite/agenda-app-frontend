import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useAvailability(date, specialistId) {
  return useQuery({
    queryKey: ['availability', date, specialistId],
    queryFn: () => api.getAvailability(date, specialistId),
    enabled: !!date,
    staleTime: 30_000, // 30 s — revalidate often since slots change
  });
}
