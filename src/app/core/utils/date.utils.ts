const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function fromIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function diffInDays(left: Date, right: Date): number {
  return Math.round((startOfDay(left).getTime() - startOfDay(right).getTime()) / DAY_MS);
}

export function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  const aStart = startOfDay(startA).getTime();
  const aEnd = startOfDay(endA).getTime();
  const bStart = startOfDay(startB).getTime();
  const bEnd = startOfDay(endB).getTime();
  return aStart <= bEnd && bStart <= aEnd;
}

