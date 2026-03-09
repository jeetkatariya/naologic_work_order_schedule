import { buildDayColumns, buildHeaderSegments, dateToX, xToDate } from './timeline-math';

describe('timeline-math', () => {

  // ── buildDayColumns ──────────────────────────────────────────────────────

  describe('buildDayColumns', () => {
    it('returns an inclusive range of days', () => {
      const cols = buildDayColumns(new Date(2026, 0, 1), new Date(2026, 0, 3));
      expect(cols.length).toBe(3);
      expect(cols[0].getDate()).toBe(1);
      expect(cols[2].getDate()).toBe(3);
    });

    it('returns exactly 1 column when start equals end', () => {
      const d = new Date(2026, 0, 15);
      expect(buildDayColumns(d, d).length).toBe(1);
    });

    it('returns an empty array when end is before start', () => {
      const cols = buildDayColumns(new Date(2026, 0, 5), new Date(2026, 0, 3));
      expect(cols.length).toBe(0);
    });
  });

  // ── dateToX / xToDate ───────────────────────────────────────────────────

  describe('dateToX', () => {
    const origin = new Date(2026, 0, 1);

    it('returns 0 for the origin date', () => {
      expect(dateToX(origin, origin, 44)).toBe(0);
    });

    it('calculates correct pixel offset for a future date', () => {
      const target = new Date(2026, 0, 6); // 5 days later
      expect(dateToX(target, origin, 10)).toBe(50);
    });

    it('returns negative offset for a date before origin', () => {
      const before = new Date(2025, 11, 31); // 1 day before Jan 1
      expect(dateToX(before, origin, 10)).toBe(-10);
    });
  });

  describe('xToDate', () => {
    const origin = new Date(2026, 0, 1);

    it('converts pixel offset back to the correct date', () => {
      const d = xToDate(50, origin, 10);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(6);
    });

    it('floors partial day to start of that day', () => {
      // 99 / 44 = 2.25 → day index 2 → Jan 3
      const d = xToDate(99, origin, 44);
      expect(d.getDate()).toBe(3);
    });

    it('returns origin date for x = 0', () => {
      const d = xToDate(0, origin, 44);
      expect(d.getDate()).toBe(origin.getDate());
    });
  });

  // ── buildHeaderSegments ─────────────────────────────────────────────────

  describe('buildHeaderSegments — day view', () => {
    const cols = buildDayColumns(new Date(2026, 0, 1), new Date(2026, 0, 7));

    it('produces one segment per day', () => {
      expect(buildHeaderSegments(cols, 'day', 44).length).toBe(7);
    });

    it('marks today as the current period', () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      const end   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const segs  = buildHeaderSegments(buildDayColumns(start, end), 'day', 44);
      expect(segs.some(s => s.isCurrentPeriod)).toBeTrue();
    });
  });

  describe('buildHeaderSegments — week view', () => {
    it('groups days into week segments', () => {
      const cols = buildDayColumns(new Date(2026, 0, 1), new Date(2026, 1, 15));
      const segs = buildHeaderSegments(cols, 'week', 20);
      expect(segs.length).toBeGreaterThan(3);
      // Each segment spans exactly the number of days in that ISO week within range
      segs.forEach(s => expect(s.span).toBeGreaterThan(0));
    });
  });

  describe('buildHeaderSegments — month view', () => {
    it('returns exactly 2 segments for a range spanning 2 months', () => {
      const cols = buildDayColumns(new Date(2026, 0, 1), new Date(2026, 1, 15));
      expect(buildHeaderSegments(cols, 'month', 8).length).toBe(2);
    });

    it('marks the month containing today as current period', () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end   = new Date(today.getFullYear(), today.getMonth() + 1, 28);
      const segs  = buildHeaderSegments(buildDayColumns(start, end), 'month', 8);
      expect(segs.some(s => s.isCurrentPeriod)).toBeTrue();
    });
  });

});
