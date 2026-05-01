import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn:  api.getConfig,
    staleTime: 2 * 60 * 1000, // 2 min — picks up admin changes without hard reload
    refetchOnWindowFocus: true,
  });
}
