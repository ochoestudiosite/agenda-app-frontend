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

export function useGroupAppointmentLookup(code) {
  return useQuery({
    queryKey: ['groupAppointment', code],
    queryFn: () => api.getGroupAppointment(code),
    enabled: !!code,
    retry: false,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, date, time, branchId, specialistId }) => api.rescheduleAppointment(code, { date, time, branchId, specialistId }),
    onSuccess: (data) => {
      queryClient.setQueryData(['appointment', data.code], data);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useRescheduleGroupAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, date, time }) => api.rescheduleGroupAppointment(code, { date, time }),
    onSuccess: (data) => {
      queryClient.setQueryData(['groupAppointment', data.groupCode], data);
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

export function useCancelGroupAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code) => api.cancelGroupAppointment(code),
    onSuccess: (data) => {
      queryClient.setQueryData(['groupAppointment', data.groupCode], data);
    },
  });
}
