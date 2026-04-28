import { createContext, useContext, useReducer } from 'react';

const BookingContext = createContext(null);

const initialState = {
  step: 1,
  service: null,
  specialist: null,
  date: null,
  time: null,
  clientName: '',
  clientPhone: '',
  confirmation: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SERVICE':
      return { ...state, service: action.payload, step: 2, specialist: null, date: null, time: null };
    case 'SET_SPECIALIST':
      return { ...state, specialist: action.payload, step: 3, date: null, time: null };
    case 'SET_DATETIME':
      return { ...state, date: action.payload.date, time: action.payload.time, step: 4 };
    case 'SET_CLIENT':
      return { ...state, clientName: action.payload.name, clientPhone: action.payload.phone };
    case 'SET_CONFIRMATION':
      return { ...state, confirmation: action.payload, step: 5 };
    case 'GO_BACK':
      return { ...state, step: Math.max(1, state.step - 1) };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
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
