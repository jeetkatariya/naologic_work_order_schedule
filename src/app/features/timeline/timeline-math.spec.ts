import { buildDayColumns, buildHeaderSegments, dateToX, xToDate } from './timeline-math';

describe('timeline-math', () => {
  it('builds inclusive day columns', () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 3);
    const columns = buildDayColumns(start, end);
    expect(columns.length).toBe(3);
  });

  it('converts date to x and x back to date', () => {
    const start = new Date(2026, 0, 1);
    const target = new Date(2026, 0, 6);
    const x = dateToX(target, start, 10);
    expect(x).toBe(50);
    const converted = xToDate(50, start, 10);
    expect(converted.getFullYear()).toBe(2026);
    expect(converted.getMonth()).toBe(0);
    expect(converted.getDate()).toBe(6);
  });

  it('groups week and month header segments', () => {
    const columns = buildDayColumns(new Date(2026, 0, 1), new Date(2026, 1, 15));
    const weekSegments = buildHeaderSegments(columns, 'week', 20);
    const monthSegments = buildHeaderSegments(columns, 'month', 8);
    expect(weekSegments.length).toBeGreaterThan(3);
    expect(monthSegments.length).toBe(2);
  });
});

