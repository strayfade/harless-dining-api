import { describe, expect, it } from 'vitest';
import { addDays, toDateString, weekOf } from '../src/dates.js';

describe('toDateString', () => {
  it('passes through valid YYYY-MM-DD', () => {
    expect(toDateString('2026-10-06')).toBe('2026-10-06');
  });

  it('rejects bad shapes', () => {
    expect(() => toDateString('10/06/2026')).toThrow(/Invalid date/);
    expect(() => toDateString('2026-13-01')).toThrow(/Invalid date/);
    expect(() => toDateString('2026-02-30')).toThrow(/Invalid date/);
    expect(() => toDateString('not-a-date')).toThrow(/Invalid date/);
  });

  it('handles today / tomorrow keywords', () => {
    expect(toDateString('today')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toDateString('tomorrow')).toBe(addDays(toDateString('today'), 1));
  });

  it('formats Date objects in America/New_York', () => {
    // 2026-10-06 02:00 UTC is still Oct 5 in Huntington (EDT, UTC-4).
    expect(toDateString(new Date('2026-10-06T02:00:00Z'))).toBe('2026-10-05');
    expect(() => toDateString(new Date('invalid'))).toThrow(/Invalid Date/);
  });
});

describe('addDays + weekOf', () => {
  it('adds across month boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-10-06', -6)).toBe('2026-09-30');
  });

  it('returns a Monday-first week of 7 days', () => {
    // 2026-10-06 is a Tuesday.
    expect(weekOf('2026-10-06')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(weekOf('2026-10-11')).toEqual(weekOf('2026-10-06'));
  });
});
