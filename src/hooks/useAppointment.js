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

// Only fired as a fallback when the single-appointment lookup 404s, so a normal
// individual booking never triggers a noisy 404 on /appointments/group/:code.
export function useGroupAppointmentLookup(code, enabled = true) {
  return useQuery({
    queryKey: ['groupAppointment', code],
    queryFn: () => api.getGroupAppointment(code),
    enabled: !!code && enabled,
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
    mutationFn: ({ code, date, time, branchId, specialistId, ...ownership }) =>
      api.rescheduleAppointment(code, { date, time, branchId, specialistId, ...ownership }),
    onSuccess: (data) => {
      queryClient.setQueryData(['appointment', data.code], data);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useRescheduleGroupAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, date, time, ...ownership }) =>
      api.rescheduleGroupAppointment(code, { date, time, ...ownership }),
    onSuccess: (data) => {
      queryClient.setQueryData(['groupAppointment', data.groupCode], data);
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, ...ownership }) =>
      api.cancelAppointment(code, Object.keys(ownership).length ? ownership : undefined),
    onSuccess: (_data, { code }) => {
      queryClient.invalidateQueries({ queryKey: ['appointment', code] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useCancelGroupAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, ...ownership }) =>
      api.cancelGroupAppointment(code, Object.keys(ownership).length ? ownership : undefined),
    onSuccess: (data) => {
      queryClient.setQueryData(['groupAppointment', data.groupCode], data);
    },
  });
}
