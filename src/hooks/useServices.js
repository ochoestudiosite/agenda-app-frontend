import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const [s, sp] = await Promise.all([api.getServices(), api.getSpecialists()]);
      return { services: s.services, specialists: sp.specialists };
    },
    staleTime: 10 * 1000, // 10 seconds - keep it fresh for the booking flow
    refetchOnWindowFocus: true,
  });
}
