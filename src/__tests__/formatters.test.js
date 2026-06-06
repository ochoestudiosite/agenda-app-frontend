/**
 * Unit — frontend/src/utils/formatters.js
 *
 * Functions under test and why they need direct tests:
 *
 *   generateSlots(openTime, closeTime, serviceDuration, intervalMins, bufferMins)
 *     - step = intervalMins + bufferMins (non-obvious: buffer adds to step, not to slot itself)
 *     - accepts HH:MM strings OR integer hours (backward-compat)
 *     - hour is NOT zero-padded in output; minute IS (e.g. '9:05', not '09:05')
 *     - slot generated only when m < end — endpoint is exclusive
 *
 *   formatCombinedPrice(services)
 *     - 5 branches for mixed price-type combos
 *     - knownMin EXCLUDES 'ask' services from sum (non-obvious invariant)
 *     - range (single + priceMax) → '$X – $Y'; range (no max / multi) → '$X+'
 *     - hasAsk priority: checked before range and starting_from
 *
 *   groupSlots(slots)
 *     - uses parseInt(slot) to extract hour — boundary values 12 and 17 are critical
 *
 *   formatServicePrice(service)
 *     - 'ask' → 'Consultar' (NOT 'A consultar' — differs from admin-app apptHelpers)
 *
 *   Locale-dependent (formatDate, formatTime 12h, formatPrice):
 *     - Only null/empty guards and structure tested (exact Intl output is locale-volatile)
 *     - formatTime 24h is deterministic and fully asserted
 *
 *   Pure string utils (capitalize, toTitleCase): Unicode-safe, fully asserted.
 */

import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatTime,
  formatPrice,
  formatServicePrice,
  formatCombinedPrice,
  capitalize,
  toTitleCase,
  generateSlots,
  groupSlots,
} from '../utils/formatters.js'

// ============================================================================
// 1. generateSlots — the most critical function (feeds booking availability)
// ============================================================================

describe('generateSlots — basic slot generation', () => {
  it('60-min intervals, 09:00–17:00 → 8 slots on the hour', () => {
    const slots = generateSlots('09:00', '17:00', 60, 60, 0)
    expect(slots).toEqual([
      '9:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00',
    ])
  })

  it('30-min intervals, 09:00–10:00 → [9:00, 9:30]', () => {
    expect(generateSlots('09:00', '10:00', 30, 30, 0)).toEqual(['9:00', '9:30'])
  })

  it('endpoint is exclusive: slot at closeTime itself is NOT generated', () => {
    // closeTime=09:30, interval=30 → only 09:00 generated (09:30 === end, excluded)
    const slots = generateSlots('09:00', '09:30', 30, 30, 0)
    expect(slots).toEqual(['9:00'])
    expect(slots).not.toContain('9:30')
  })

  it('minute zero-padding: minute is always 2 digits, hour is NOT zero-padded', () => {
    // 09:00 and 09:05 — hour must be '9' not '09'
    const slots = generateSlots('09:00', '09:10', 30, 5, 0)
    expect(slots).toContain('9:00')
    expect(slots).toContain('9:05')
    expect(slots).not.toContain('09:00')
  })

  it('openTime > closeTime → empty array', () => {
    expect(generateSlots('17:00', '09:00', 30, 30, 0)).toEqual([])
  })

  it('openTime === closeTime → empty array', () => {
    expect(generateSlots('09:00', '09:00', 30, 30, 0)).toEqual([])
  })

  it('HH:MM with non-zero minutes as start: 09:30–10:30, interval=60 → ["9:30"]', () => {
    expect(generateSlots('09:30', '10:30', 60, 60, 0)).toEqual(['9:30'])
  })
})

describe('generateSlots — buffer mechanics (step = interval + buffer)', () => {
  it('interval=30, buffer=10 → step=40; slots at 09:00, 09:40, 10:20…', () => {
    const slots = generateSlots('09:00', '17:00', 30, 30, 10)
    expect(slots[0]).toBe('9:00')
    expect(slots[1]).toBe('9:40')
    expect(slots[2]).toBe('10:20')
    expect(slots[3]).toBe('11:00')
  })

  it('interval=30, buffer=10, 09:00–17:00 → 12 slots total', () => {
    // step=40: 540,580,620,660,700,740,780,820,860,900,940,980
    expect(generateSlots('09:00', '17:00', 30, 30, 10)).toHaveLength(12)
  })

  it('buffer=0 (default behavior): interval=30 → step=30', () => {
    const withBuf = generateSlots('09:00', '11:00', 30, 30, 0)
    expect(withBuf).toHaveLength(4) // 9:00, 9:30, 10:00, 10:30
  })

  it('large buffer collapses slots: interval=30, buffer=60 → step=90', () => {
    // 09:00–17:00, step=90: 540,630,720,810,900,990 (990=16:30)
    const slots = generateSlots('09:00', '17:00', 30, 30, 60)
    expect(slots[0]).toBe('9:00')
    expect(slots[1]).toBe('10:30') // 540+90=630 → 10:30
    expect(slots).toHaveLength(6)
  })
})

describe('generateSlots — backward-compatible integer hours', () => {
  it('integer openTime=9, closeTime=10, interval=30 → ["9:00", "9:30"]', () => {
    expect(generateSlots(9, 10, 30, 30, 0)).toEqual(['9:00', '9:30'])
  })

  it('integer openTime=8, closeTime=9 → ["8:00", "8:30"]', () => {
    expect(generateSlots(8, 9, 30, 30, 0)).toEqual(['8:00', '8:30'])
  })

  it('integer hours mixed with string: integer 9 and string "10:00" are equivalent', () => {
    const intSlots = generateSlots(9, 10, 30, 30, 0)
    const strSlots = generateSlots('09:00', '10:00', 30, 30, 0)
    expect(intSlots).toEqual(strSlots)
  })
})

// ============================================================================
// 2. groupSlots — morning / afternoon / evening classification
// ============================================================================

describe('groupSlots', () => {
  it('classifies slots correctly into 3 groups', () => {
    const slots = ['9:00', '11:30', '12:00', '16:30', '17:00', '20:00']
    const result = groupSlots(slots)
    expect(result.morning).toEqual(['9:00', '11:30'])
    expect(result.afternoon).toEqual(['12:00', '16:30'])
    expect(result.evening).toEqual(['17:00', '20:00'])
  })

  it('boundary 12:00 → afternoon (not morning)', () => {
    const result = groupSlots(['11:59', '12:00'])
    expect(result.morning).toContain('11:59')
    expect(result.afternoon).toContain('12:00')
    expect(result.morning).not.toContain('12:00')
  })

  it('boundary 17:00 → evening (not afternoon)', () => {
    const result = groupSlots(['16:59', '17:00'])
    expect(result.afternoon).toContain('16:59')
    expect(result.evening).toContain('17:00')
    expect(result.afternoon).not.toContain('17:00')
  })

  it('empty array → all groups are empty arrays', () => {
    expect(groupSlots([])).toEqual({ morning: [], afternoon: [], evening: [] })
  })

  it('all-morning slots → afternoon and evening are empty', () => {
    const result = groupSlots(['8:00', '9:00', '11:00'])
    expect(result.morning).toHaveLength(3)
    expect(result.afternoon).toHaveLength(0)
    expect(result.evening).toHaveLength(0)
  })
})

// ============================================================================
// 3. formatCombinedPrice — 5-branch multi-service price aggregation
// ============================================================================

describe('formatCombinedPrice — empty / null guard', () => {
  it('null → ""', () => {
    expect(formatCombinedPrice(null)).toBe('')
  })

  it('undefined → ""', () => {
    expect(formatCombinedPrice(undefined)).toBe('')
  })

  it('empty array → ""', () => {
    expect(formatCombinedPrice([])).toBe('')
  })
})

describe('formatCombinedPrice — branch: hasAsk', () => {
  it('single ask, no known price → "Precio a consultar"', () => {
    expect(formatCombinedPrice([{ priceType: 'ask' }])).toBe('Precio a consultar')
  })

  it('multiple ask services, no fixed → "Precio a consultar"', () => {
    expect(formatCombinedPrice([{ priceType: 'ask' }, { priceType: 'ask' }])).toBe('Precio a consultar')
  })

  it('ask + fixed: known min > 0 → "$X+" format (ask price excluded from sum)', () => {
    const result = formatCombinedPrice([
      { priceType: 'ask', price: 9999 }, // 9999 must NOT be added to knownMin
      { priceType: 'fixed', price: 200 },
    ])
    // knownMin = 0 (ask) + 200 (fixed) = 200
    expect(result).toContain('200')
    expect(result).toContain('+')
    expect(result).not.toContain('9999')
  })

  it('ask has priority over range and starting_from', () => {
    const result = formatCombinedPrice([
      { priceType: 'ask' },
      { priceType: 'starting_from', price: 100 },
    ])
    // hasAsk is checked first — should NOT return 'Desde...'
    expect(result).not.toContain('Desde')
  })
})

describe('formatCombinedPrice — branch: hasRange', () => {
  it('single range with priceMax → "$X – $Y"', () => {
    const result = formatCombinedPrice([{ priceType: 'range', price: 500, priceMax: 800 }])
    expect(result).toContain('500')
    expect(result).toContain('800')
    expect(result).toContain('–')
  })

  it('single range WITHOUT priceMax → "$X+" (priceMax is undefined → falsy)', () => {
    const result = formatCombinedPrice([{ priceType: 'range', price: 500 }])
    expect(result).toContain('500')
    expect(result).toContain('+')
    expect(result).not.toContain('–')
  })

  it('single range with priceMax: null → "$X+" (null is falsy)', () => {
    const result = formatCombinedPrice([{ priceType: 'range', price: 300, priceMax: null }])
    expect(result).toContain('+')
  })

  it('multiple range services → "$X+" using summed knownMin', () => {
    const result = formatCombinedPrice([
      { priceType: 'range', price: 300 },
      { priceType: 'range', price: 500 },
    ])
    // multiple ranges → falls to knownMin+ branch (not the single+max branch)
    expect(result).toContain('+')
    expect(result).not.toContain('–')
  })
})

describe('formatCombinedPrice — branch: hasStartingFrom', () => {
  it('single starting_from → "Desde $X"', () => {
    const result = formatCombinedPrice([{ priceType: 'starting_from', price: 300 }])
    expect(result).toContain('Desde')
    expect(result).toContain('300')
  })

  it('starting_from + fixed → "Desde $sum" (both contribute to knownMin)', () => {
    const result = formatCombinedPrice([
      { priceType: 'starting_from', price: 200 },
      { priceType: 'fixed', price: 100 },
    ])
    // knownMin = 300
    expect(result).toContain('Desde')
    expect(result).toContain('300')
  })
})

describe('formatCombinedPrice — branch: default (all fixed)', () => {
  it('single fixed service → formatted price', () => {
    const result = formatCombinedPrice([{ priceType: 'fixed', price: 250 }])
    expect(result).toContain('250')
    expect(result).not.toContain('+')
    expect(result).not.toContain('Desde')
  })

  it('multiple fixed services → sum', () => {
    const result = formatCombinedPrice([
      { priceType: 'fixed', price: 200 },
      { priceType: 'fixed', price: 300 },
    ])
    // knownMin = 500
    expect(result).toContain('500')
  })
})

// ============================================================================
// 4. formatServicePrice — single-service price display
// ============================================================================

describe('formatServicePrice', () => {
  it('"ask" → "Consultar" (NOT "A consultar")', () => {
    expect(formatServicePrice({ priceType: 'ask' })).toBe('Consultar')
  })

  it('"starting_from" → contains "Desde" and price', () => {
    const result = formatServicePrice({ priceType: 'starting_from', price: 300 })
    expect(result).toContain('Desde')
    expect(result).toContain('300')
  })

  it('"range" → contains both price and priceMax with "–"', () => {
    const result = formatServicePrice({ priceType: 'range', price: 500, priceMax: 800 })
    expect(result).toContain('500')
    expect(result).toContain('800')
    expect(result).toContain('–')
  })

  it('default → formatted price', () => {
    const result = formatServicePrice({ priceType: 'fixed', price: 200 })
    expect(result).toContain('200')
  })
})

// ============================================================================
// 5. formatTime
// ============================================================================

describe('formatTime — null / empty guard', () => {
  it('null → ""', () => expect(formatTime(null)).toBe(''))
  it('undefined → ""', () => expect(formatTime(undefined)).toBe(''))
  it('"" → ""', () => expect(formatTime('')).toBe(''))
})

describe('formatTime — 24h mode (deterministic)', () => {
  it('"09:05" 24h → "09:05"', () => expect(formatTime('09:05', '24h')).toBe('09:05'))
  it('"13:30" 24h → "13:30"', () => expect(formatTime('13:30', '24h')).toBe('13:30'))
  it('"00:00" 24h → "00:00"', () => expect(formatTime('00:00', '24h')).toBe('00:00'))
  it('"23:59" 24h → "23:59"', () => expect(formatTime('23:59', '24h')).toBe('23:59'))
})

describe('formatTime — 12h mode (non-empty, locale-agnostic assertions)', () => {
  it('"09:30" → non-empty string', () => expect(formatTime('09:30')).toBeTruthy())
  it('"09:30" → contains "9" and "30"', () => {
    const result = formatTime('09:30')
    expect(result).toMatch(/9/)
    expect(result).toMatch(/30/)
  })
})

// ============================================================================
// 6. formatDate — null / empty guard + structure
// ============================================================================

describe('formatDate', () => {
  it('null → ""', () => expect(formatDate(null)).toBe(''))
  it('"" → ""', () => expect(formatDate('')).toBe(''))

  it('"2024-03-13" → contains the year and day', () => {
    const result = formatDate('2024-03-13')
    expect(result).toContain('2024')
    expect(result).toMatch(/13/)
  })
})

// ============================================================================
// 7. capitalize
// ============================================================================

describe('capitalize', () => {
  it('"hello" → "Hello"', () => expect(capitalize('hello')).toBe('Hello'))
  it('"WORLD" → "WORLD" (only first char touched)', () => expect(capitalize('WORLD')).toBe('WORLD'))
  it('"" → ""', () => expect(capitalize('')).toBe(''))
  it('null → ""', () => expect(capitalize(null)).toBe(''))
})

// ============================================================================
// 8. toTitleCase (formatters.js version — same algorithm as text.js)
// ============================================================================

describe('toTitleCase', () => {
  it('"LUIS BRAVO" → "Luis Bravo"', () => expect(toTitleCase('LUIS BRAVO')).toBe('Luis Bravo'))
  it('"pedro lopéZ" → "Pedro Lopéz" (Unicode-safe)', () => expect(toTitleCase('pedro lopéZ')).toBe('Pedro Lopéz'))
  it('"hello world" → "Hello World"', () => expect(toTitleCase('hello world')).toBe('Hello World'))
  it('null → ""', () => expect(toTitleCase(null)).toBe(''))
  it('undefined → ""', () => expect(toTitleCase(undefined)).toBe(''))
})
