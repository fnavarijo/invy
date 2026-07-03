import { describe, test, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';

import { parseDateRangeParams, getPresetRange, defaultRange } from '../date-range';

const ORIGINAL_TZ = process.env.TZ;
const TIMEZONES = ['UTC', 'America/Guatemala', 'Asia/Tokyo'] as const;

afterAll(() => {
  // Later describe blocks in this file must not inherit the last parameterized zone
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe.each(TIMEZONES)('date-range under server TZ %s', (tz) => {
  beforeEach(() => {
    process.env.TZ = tz;
    vi.useFakeTimers();
    // Fixed "now": 2026-07-02 09:00 in Guatemala
    vi.setSystemTime(new Date('2026-07-02T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseDateRangeParams', () => {
    test('maps date-only params to Guatemala day boundaries (regression #5)', () => {
      const range = parseDateRangeParams('2026-07-01', '2026-08-01');
      expect(range.issuedFrom).toBe('2026-07-01T06:00:00.000Z');
      expect(range.issuedTo).toBe('2026-08-02T05:59:59.999Z');
    });

    test('July window excludes the last June instant', () => {
      const range = parseDateRangeParams('2026-07-01', '2026-07-31');
      expect(new Date(range.issuedFrom).getTime()).toBeGreaterThan(
        new Date('2026-06-30T23:29:59Z').getTime(),
      );
    });

    test('uses the first element of array params', () => {
      const range = parseDateRangeParams(['2026-07-01', '2026-01-01'], ['2026-07-31']);
      expect(range.issuedFrom).toBe('2026-07-01T06:00:00.000Z');
      expect(range.issuedTo).toBe('2026-08-01T05:59:59.999Z');
    });

    test.each([
      ['missing from', undefined, '2026-07-31'],
      ['missing to', '2026-07-01', undefined],
      ['non-ISO format', '07/01/2026', '07/31/2026'],
      ['non-padded date', '2026-7-1', '2026-7-31'],
      ['impossible calendar date', '2026-02-30', '2026-03-05'],
      ['reversed order', '2026-08-01', '2026-07-01'],
    ])('falls back to defaultRange when %s', (_label, from, to) => {
      expect(parseDateRangeParams(from, to)).toEqual(defaultRange());
    });
  });

  describe('getPresetRange', () => {
    // Default fake now (from beforeEach): 2026-07-02T15:00:00Z = Jul 2, 09:00 GT

    test('this-month spans the full GT month', () => {
      expect(getPresetRange('this-month')).toEqual({
        issuedFrom: '2026-07-01T06:00:00.000Z',
        issuedTo: '2026-08-01T05:59:59.999Z',
      });
    });

    test('last-month spans the full previous GT month', () => {
      expect(getPresetRange('last-month')).toEqual({
        issuedFrom: '2026-06-01T06:00:00.000Z',
        issuedTo: '2026-07-01T05:59:59.999Z',
      });
    });

    test('last-30-days ends at the end of GT today', () => {
      expect(getPresetRange('last-30-days')).toEqual({
        issuedFrom: '2026-06-02T06:00:00.000Z', // Jul 2 − 30 days = Jun 2
        issuedTo: '2026-07-03T05:59:59.999Z', // end of Jul 2 GT
      });
    });

    test('last-3-months starts three calendar months back', () => {
      expect(getPresetRange('last-3-months')).toEqual({
        issuedFrom: '2026-04-02T06:00:00.000Z',
        issuedTo: '2026-07-03T05:59:59.999Z',
      });
    });

    test('this-year starts at GT Jan 1', () => {
      expect(getPresetRange('this-year')).toEqual({
        issuedFrom: '2026-01-01T06:00:00.000Z',
        issuedTo: '2026-07-03T05:59:59.999Z',
      });
    });

    test('uses the GT calendar day when UTC has already rolled over', () => {
      // 2026-07-01T02:00:00Z is still Jun 30, 20:00 in Guatemala
      vi.setSystemTime(new Date('2026-07-01T02:00:00Z'));

      expect(getPresetRange('this-month')).toEqual({
        issuedFrom: '2026-06-01T06:00:00.000Z', // June, NOT July
        issuedTo: '2026-07-01T05:59:59.999Z',
      });
      expect(getPresetRange('last-30-days')).toEqual({
        issuedFrom: '2026-05-31T06:00:00.000Z', // Jun 30 − 30 days = May 31
        issuedTo: '2026-07-01T05:59:59.999Z', // end of Jun 30 GT
      });
    });
  });
});
