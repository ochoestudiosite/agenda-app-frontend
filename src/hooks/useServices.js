import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const [s, sp] = await Promise.all([api.getServices(), api.getSpecialists()]);
      return { services: s.services, specialists: sp.specialists };
    },
    staleTime: 2 * 60 * 1000, // 2 min — refetch when admin changes services/staff
    refetchOnWindowFocus: true,
  });
}
