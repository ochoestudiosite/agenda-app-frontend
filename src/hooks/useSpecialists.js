import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useSpecialists() {
  return useQuery({
    queryKey: ['specialists'],
    queryFn: api.getSpecialists,
    staleTime: 300_000,
  });
}
