import { createContext, useContext, useReducer, useEffect } from 'react';

const BookingContext = createContext(null);
const SESSION_KEY = 'cita24_booking';

const initialState = {
  step: 1,
  branch: null,
  services: [],
  // Multi-specialist mode (EP-28): one {service, specialist} pair per service.
  // Built up sequentially in step 2; empty for single-specialist bookings.
  serviceAssignments: [],   // [{service, specialist}]
  currentAssignmentIdx: 0,  // which service is currently awaiting specialist selection
  specialist: null,         // used only for single-service flow
  date: null,
  time: null,
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  confirmation: null,       // single appt or group {groupCode, appointments[]}
};

// True when the booking requires different specialists per service.
// This is the case whenever ≥2 services were selected.
function isGroupMode(state) {
  return state.services.length >= 2;
}

function loadFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw);
    if (saved.step === 5 || saved.confirmation) return initialState;
    return { ...initialState, ...saved };
  } catch {
    return initialState;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_BRANCH':
      return { ...state, branch: action.payload };

    // Single-service fast path (backward compat)
    case 'SET_SERVICE':
      return {
        ...state,
        services: [action.payload],
        serviceAssignments: [],
        currentAssignmentIdx: 0,
        specialist: null, date: null, time: null,
        step: 2,
      };

    case 'TOGGLE_SERVICE': {
      const exists = state.services.some(s => s.id === action.payload.id);
      const services = exists
        ? state.services.filter(s => s.id !== action.payload.id)
        : state.services.length >= 5 ? state.services : [...state.services, action.payload];
      return {
        ...state, services,
        serviceAssignments: [], currentAssignmentIdx: 0,
        specialist: null, date: null, time: null,
      };
    }

    // Advance from service selection to specialist selection
    case 'CONFIRM_SERVICES':
      if (!state.services.length) return state;
      return {
        ...state,
        step: 2,
        serviceAssignments: [],
        currentAssignmentIdx: 0,
        specialist: null, date: null, time: null,
      };

    // Single-service: specialist selected → go to date/time
    case 'SET_SPECIALIST':
      return { ...state, specialist: action.payload, step: 3, date: null, time: null };

    // Multi-service: assign specialist to the current service.
    // If all services have a specialist, advance to date/time (step 3).
    case 'ASSIGN_SPECIALIST': {
      const idx          = state.currentAssignmentIdx;
      const service      = state.services[idx];
      const specialist   = action.payload;
      const newAssignments = [
        ...state.serviceAssignments.slice(0, idx),
        { service, specialist },
        ...state.serviceAssignments.slice(idx + 1),
      ];
      const allDone = newAssignments.length === state.services.length;
      return {
        ...state,
        serviceAssignments: newAssignments,
        currentAssignmentIdx: allDone ? idx : idx + 1,
        step: allDone ? 3 : 2,
        date: null,
        time: null,
      };
    }

    case 'SET_DATETIME':
      return { ...state, date: action.payload.date, time: action.payload.time, step: 4 };

    case 'SET_CLIENT':
      return { ...state, clientName: action.payload.name, clientPhone: action.payload.phone, clientEmail: action.payload.email ?? '' };

    case 'SET_CONFIRMATION': {
      // Guard: group mode requires all assignments + date/time
      if (isGroupMode(state)) {
        if (!state.serviceAssignments.length || !state.date || !state.time) return state;
      } else {
        if (!state.services.length || !state.specialist || !state.date || !state.time) return state;
      }
      return { ...state, confirmation: action.payload, step: 5 };
    }

    case 'GO_BACK':
      if (state.step === 1 && state.branch) return { ...state, branch: null };
      // In multi-service step 2: going back through specialist selection per service
      if (state.step === 2 && isGroupMode(state) && state.currentAssignmentIdx > 0) {
        const prevIdx = state.currentAssignmentIdx - 1;
        return {
          ...state,
          currentAssignmentIdx: prevIdx,
          serviceAssignments: state.serviceAssignments.slice(0, prevIdx),
        };
      }
      return { ...state, step: Math.max(1, state.step - 1) };

    case 'RESET':
      return initialState;

    // Jump directly to a completed step (used by clickable StepIndicator).
    // Clears all state downstream of the target to force re-confirmation of each step.
    case 'GO_TO_STEP': {
      const target = action.payload;
      // Branch step (0): clear branch selection, step stays at 1
      if (target === 0) return { ...state, branch: null };
      // Guard: can't jump forward
      if (target >= state.step) return state;
      if (target === 1) return { ...state, step: 1, serviceAssignments: [], currentAssignmentIdx: 0, specialist: null, date: null, time: null };
      if (target === 2) return { ...state, step: 2, serviceAssignments: [], currentAssignmentIdx: 0, date: null, time: null };
      if (target === 3) return { ...state, step: 3, date: null, time: null };
      return { ...state, step: target };
    }

    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadFromSession);

  useEffect(() => {
    if (state.step === 5 || state.confirmation) {
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
      } catch { /* quota exceeded or SSR — ignore */ }
    }
  }, [state]);

  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used inside BookingProvider');
  return ctx;
}

export { isGroupMode };
