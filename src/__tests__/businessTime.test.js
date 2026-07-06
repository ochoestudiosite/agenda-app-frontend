/**
 * Unit — frontend/src/utils/businessTime.js
 *
 * All tests pin "now" to 2026-01-15 16:00:00 UTC via vi.setSystemTime, which gives:
 *   America/Mexico_City (UTC-6 in January): 10:00 AM Thursday
 *   America/New_York    (UTC-5 in January): 11:00 AM Thursday
 *
 * This makes timezone-sensitive assertions fully deterministic without touching
 * OS locale or Intl configuration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  nowPartsInTz,
  todayDateInTz,
  nowMinutesInTz,
  isPastDateTime,
  findNextAvailableDate,
} from '../utils/businessTime'

const FIXED_UTC_MS = Date.UTC(2026, 0, 15, 16, 0, 0)  // 2026-01-15T16:00:00Z

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FIXED_UTC_MS) })
afterEach(() => vi.useRealTimers())

// ─── nowPartsInTz ────────────────────────────────────────────────────────────

describe('nowPartsInTz', () => {
  it('returns correct parts for America/Mexico_City (UTC-6, January)', () => {
    const p = nowPartsInTz('America/Mexico_City')
    expect(p.year).toBe(2026)
    expect(p.month).toBe(1)
    expect(p.day).toBe(15)
    expect(p.hour).toBe(10)
    expect(p.minute).toBe(0)
    expect(p.weekday).toBe(4)  // Thursday
  })

  it('returns correct hour for America/New_York (UTC-5, January)', () => {
    const p = nowPartsInTz('America/New_York')
    expect(p.hour).toBe(11)
    expect(p.day).toBe(15)
    expect(p.weekday).toBe(4)
  })

  it('does not throw when tz is falsy — falls back to browser local', () => {
    expect(() => nowPartsInTz(null)).not.toThrow()
    expect(() => nowPartsInTz(undefined)).not.toThrow()
    expect(() => nowPartsInTz('')).not.toThrow()
  })

  it('weekday is always in range 0–6', () => {
    const { weekday } = nowPartsInTz('America/Mexico_City')
    expect(weekday).toBeGreaterThanOrEqual(0)
    expect(weekday).toBeLessThanOrEqual(6)
  })
})

// ─── todayDateInTz ───────────────────────────────────────────────────────────

describe('todayDateInTz', () => {
  it('returns a Date at midnight with correct calendar day in tz', () => {
    const d = todayDateInTz('America/Mexico_City')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(0)   // January
    expect(d.getDate()).toBe(15)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
  })

  it('each call returns an independent Date (mutations do not leak)', () => {
    const a = todayDateInTz('America/Mexico_City')
    const b = todayDateInTz('America/Mexico_City')
    a.setDate(a.getDate() + 3)
    expect(b.getDate()).toBe(15)  // b not mutated
  })
})

// ─── nowMinutesInTz ──────────────────────────────────────────────────────────

describe('nowMinutesInTz', () => {
  it('returns 600 (10:00) for Mexico City at 16:00 UTC', () => {
    expect(nowMinutesInTz('America/Mexico_City')).toBe(10 * 60)
  })

  it('returns 660 (11:00) for New York at 16:00 UTC', () => {
    expect(nowMinutesInTz('America/New_York')).toBe(11 * 60)
  })
})

// ─── isPastDateTime ──────────────────────────────────────────────────────────
// "now" in Mexico City = 2026-01-15 10:00

describe('isPastDateTime', () => {
  it('past date → true', () => {
    expect(isPastDateTime('2026-01-14', '23:00', 'America/Mexico_City')).toBe(true)
  })

  it('past time same day → true', () => {
    expect(isPastDateTime('2026-01-15', '09:59', 'America/Mexico_City')).toBe(true)
  })

  it('future time same day → false', () => {
    expect(isPastDateTime('2026-01-15', '10:01', 'America/Mexico_City')).toBe(false)
  })

  it('future date → false', () => {
    expect(isPastDateTime('2026-01-16', '09:00', 'America/Mexico_City')).toBe(false)
  })

  it('exact current minute ("2026-01-15 10:00") → false (not strictly past)', () => {
    expect(isPastDateTime('2026-01-15', '10:00', 'America/Mexico_City')).toBe(false)
  })

  it('short timeStr without leading zero padded correctly', () => {
    // '9:00' → padStart(5) → '09:00', which is before 10:00
    expect(isPastDateTime('2026-01-15', '9:00', 'America/Mexico_City')).toBe(true)
  })

  it('null timeStr defaults to 00:00 (start of day)', () => {
    expect(isPastDateTime('2026-01-14', null, 'America/Mexico_City')).toBe(true)
    expect(isPastDateTime('2026-01-16', null, 'America/Mexico_City')).toBe(false)
  })

  it('falls back to Date comparison when tz is falsy — far past/future still correct', () => {
    expect(isPastDateTime('2020-01-01', '00:00', null)).toBe(true)
    expect(isPastDateTime('2030-12-31', '23:59', null)).toBe(false)
  })
})

// ─── findNextAvailableDate ───────────────────────────────────────────────────
// "now" = Thursday 2026-01-15 10:00 in Mexico City

const ALL_OPEN = [0, 1, 2, 3, 4, 5, 6].map(dow => ({
  day_of_week: dow, is_open: true, open_time: '09:00', close_time: '19:00',
}))

const ALL_CLOSED = ALL_OPEN.map(h => ({ ...h, is_open: false }))

describe('findNextAvailableDate', () => {
  it('returns today when ample time before close (leadMins=60, close=19:00)', () => {
    // 10:00 + 60 + 30 = 690 min < 1140 min (19:00) → not too late → candidate = today
    const result = findNextAvailableDate({ tz: 'America/Mexico_City', bizHours: ALL_OPEN, leadMins: 60 })
    expect(result).not.toBeNull()
    expect(result.getDate()).toBe(15)
  })

  it('returns tomorrow when too late (leadMins=600)', () => {
    // 600 + 600 + 30 = 1230 >= 1140 → too late → candidate = Friday 16
    const result = findNextAvailableDate({ tz: 'America/Mexico_City', bizHours: ALL_OPEN, leadMins: 600 })
    expect(result).not.toBeNull()
    expect(result.getDate()).toBe(16)
  })

  it('skips closed days of week', () => {
    // Close Friday (5) and Saturday (6); too late → jumps to Friday → skip → Saturday → skip → Sunday (dow=0)
    const noWeekend = ALL_OPEN.map(h => ({ ...h, is_open: h.day_of_week !== 5 && h.day_of_week !== 6 }))
    const result = findNextAvailableDate({ tz: 'America/Mexico_City', bizHours: noWeekend, leadMins: 600 })
    expect(result).not.toBeNull()
    expect(result.getDay()).toBe(0)   // Sunday Jan 18
    expect(result.getDate()).toBe(18)
  })

  it('skips specific blocked dates', () => {
    // Today (Jan 15) available but explicitly blocked → returns Jan 16
    const result = findNextAvailableDate({
      tz: 'America/Mexico_City',
      bizHours: ALL_OPEN,
      blockedDates: ['2026-01-15'],
      leadMins: 60,
    })
    expect(result).not.toBeNull()
    expect(result.getDate()).toBe(16)
  })

  it('skips recurring blocked weekday (dow)', () => {
    // Block all Thursdays (4) and Fridays (5) → from today jumps to Saturday (6) Jan 17
    const result = findNextAvailableDate({
      tz: 'America/Mexico_City',
      bizHours: ALL_OPEN,
      blockedDates: ['recurring:4', 'recurring:5'],
      leadMins: 60,
    })
    expect(result).not.toBeNull()
    expect(result.getDay()).not.toBe(4)
    expect(result.getDay()).not.toBe(5)
    expect(result.getDate()).toBe(17)  // Saturday Jan 17
  })

  it('returns null when all days closed within maxAdvanceDays', () => {
    const result = findNextAvailableDate({ tz: 'America/Mexico_City', bizHours: ALL_CLOSED, maxAdvanceDays: 30 })
    expect(result).toBeNull()
  })

  // ─── M-05 (auditoría 2026-07-05): ignoreClosedWeekdays ─────────────────────
  // Con especialista seleccionado, los weekdays cerrados llegan STAFF-AWARE en
  // blockedDates ('recurring:N') — el check local de business_hours se omite
  // para no ocultar días que el horario propio del especialista sí habilita.

  it('M-05: ignoreClosedWeekdays=true no salta weekdays cerrados de business_hours', () => {
    // Todo cerrado localmente, pero el backend staff-aware no bloqueó nada →
    // el freelancer puede recibir citas mañana (hoy queda fuera por tooLate).
    const result = findNextAvailableDate({
      tz: 'America/Mexico_City', bizHours: ALL_CLOSED, blockedDates: [],
      leadMins: 60, ignoreClosedWeekdays: true,
    })
    expect(result).not.toBeNull()
    expect(result.getDate()).toBe(16)
  })

  it('M-05: ignoreClosedWeekdays=true SÍ respeta los recurring:N staff-aware del backend', () => {
    // El backend marcó viernes (5) y sábado (6) como cerrados para ESTE staff
    const result = findNextAvailableDate({
      tz: 'America/Mexico_City', bizHours: ALL_CLOSED,
      blockedDates: ['recurring:5', 'recurring:6'],
      leadMins: 600, // tooLate → arranca en viernes 16 → salta a domingo 18
      ignoreClosedWeekdays: true,
    })
    expect(result).not.toBeNull()
    expect(result.getDay()).toBe(0)
    expect(result.getDate()).toBe(18)
  })

  it('M-05: default (sin flag) conserva el comportamiento anterior', () => {
    const result = findNextAvailableDate({ tz: 'America/Mexico_City', bizHours: ALL_CLOSED, blockedDates: [] })
    expect(result).toBeNull()
  })

  it('returns tomorrow when bizHours is empty (tooLate=true, no closed constraints)', () => {
    // empty bizHours → todayEntry=undefined → tooLate=true → starts from Jan 16
    // closedDays=empty → Jan 16 is valid immediately
    const result = findNextAvailableDate({ tz: 'America/Mexico_City', bizHours: [], leadMins: 60 })
    expect(result).not.toBeNull()
    expect(result.getDate()).toBe(16)
  })

  it('close exactly at close time is treated as too late', () => {
    // close_time='10:00' → closeMins=600; nowMins=600, leadMins=0
    // tooLate: 600 + 0 + 30 = 630 >= 600 → true → tomorrow
    const closeAt10 = ALL_OPEN.map(h => ({ ...h, close_time: '10:00' }))
    const result = findNextAvailableDate({ tz: 'America/Mexico_City', bizHours: closeAt10, leadMins: 0 })
    expect(result).not.toBeNull()
    expect(result.getDate()).toBe(16)
  })
})
