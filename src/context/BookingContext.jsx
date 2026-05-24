import { createContext, useContext, useReducer, useEffect } from 'react';

const BookingContext = createContext(null);
const SESSION_KEY = 'cita24_booking';

const initialState = {
  step: 1,
  branch: null,
  services: [],
  specialist: null,
  date: null,
  time: null,
  clientName: '',
  clientPhone: '',
  confirmation: null,
};

function loadFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw);
    // Never restore a completed booking — always start fresh after confirmation.
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
    case 'SET_SERVICE':
      return { ...state, services: [action.payload], step: 2, specialist: null, date: null, time: null };
    case 'TOGGLE_SERVICE': {
      const exists = state.services.some(s => s.id === action.payload.id);
      const services = exists
        ? state.services.filter(s => s.id !== action.payload.id)
        : state.services.length >= 5 ? state.services : [...state.services, action.payload];
      return { ...state, services, specialist: null, date: null, time: null };
    }
    case 'CONFIRM_SERVICES':
      if (!state.services.length) return state;
      return { ...state, step: 2, specialist: null, date: null, time: null };
    case 'SET_SPECIALIST':
      return { ...state, specialist: action.payload, step: 3, date: null, time: null };
    case 'SET_DATETIME':
      return { ...state, date: action.payload.date, time: action.payload.time, step: 4 };
    case 'SET_CLIENT':
      return { ...state, clientName: action.payload.name, clientPhone: action.payload.phone };
    case 'SET_CONFIRMATION':
      // Guard: only transition to confirmation if all prior steps are complete.
      if (!state.services.length || !state.specialist || !state.date || !state.time) return state;
      return { ...state, confirmation: action.payload, step: 5 };
    case 'GO_BACK':
      if (state.step === 1 && state.branch) return { ...state, branch: null };
      return { ...state, step: Math.max(1, state.step - 1) };
    case 'RESET':
      return initialState;
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
