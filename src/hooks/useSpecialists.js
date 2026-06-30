import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useSpecialists() {
  return useQuery({
    queryKey: ['specialists'],
    queryFn: ({ signal }) => api.getSpecialists({ signal }),
    staleTime: 300_000,
  });
}
