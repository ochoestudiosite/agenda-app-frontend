import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useAvailability(date) {
  return useQuery({
    queryKey: ['availability', date],
    queryFn: () => api.getAvailability(date),
    enabled: !!date,
    staleTime: 30_000, // 30 s — revalidate often since slots change
  });
}
