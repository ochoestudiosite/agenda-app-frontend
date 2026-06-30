import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async ({ signal }) => {
      const [s, sp] = await Promise.all([api.getServices({ signal }), api.getSpecialists({ signal })]);
      return { services: s.services, specialists: sp.specialists };
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
