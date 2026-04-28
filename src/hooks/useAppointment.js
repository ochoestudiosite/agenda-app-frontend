import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function useAppointmentLookup(code) {
  return useQuery({
    queryKey: ['appointment', code],
    queryFn: () => api.getAppointment(code),
    enabled: !!code,
    retry: false,
  });
}

export function useCreateAppointment() {
  return useMutation({ mutationFn: api.createAppointment });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, date, time }) => api.rescheduleAppointment(code, { date, time }),
    onSuccess: (data) => {
      queryClient.setQueryData(['appointment', data.code], data);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code) => api.cancelAppointment(code),
    onSuccess: (_data, code) => {
      queryClient.invalidateQueries({ queryKey: ['appointment', code] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
