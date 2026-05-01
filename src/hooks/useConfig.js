import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn:  api.getConfig,
    staleTime: Infinity, // config cached for the session; invalidated on admin changes
    gcTime:    Infinity,
  });
}
