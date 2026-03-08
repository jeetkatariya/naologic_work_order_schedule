import { TimelineZoom, ZoomConfig } from '../../core/models/timeline.model';
import { addDays, diffInDays, startOfDay } from '../../core/utils/date.utils';

export interface TimelineHeaderSegment {
  key: string;
  label: string;
  startIndex: number;
  span: number;
  leftPx?: number;
  widthPx?: number;
  isCurrentPeriod?: boolean;
}

export const ZOOM_CONFIG: Record<TimelineZoom, ZoomConfig> = {
  hour:  { dayWidth: 120, bufferDays: 4  },
  day:   { dayWidth: 44,  bufferDays: 18 },
  week:  { dayWidth: 20,  bufferDays: 70 },
  month: { dayWidth: 8,   bufferDays: 210 }
};

export function buildDayColumns(startDate: Date, endDate: Date): Date[] {
  const columns: Date[] = [];
  let cursor = startOfDay(startDate);
  const end = startOfDay(endDate);
  while (cursor <= end) {
    columns.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return columns;
}

export function dateToX(date: Date, timelineStart: Date, dayWidth: number): number {
  return diffInDays(date, timelineStart) * dayWidth;
}

export function xToDate(x: number, timelineStart: Date, dayWidth: number): Date {
  return addDays(timelineStart, Math.floor(x / dayWidth));
}


export function buildHeaderSegments(columns: Date[], zoom: TimelineZoom, dayWidth: number): TimelineHeaderSegment[] {
  const today = startOfDay(new Date());

  if (zoom === 'hour') {
    return columns.map((d, i) => ({
      key: d.toISOString(),
      label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      startIndex: i,
      span: 1,
      isCurrentPeriod: d.getTime() === today.getTime()
    }));
  }

  if (zoom === 'day') {
    return columns.map((d, i) => ({
      key: d.toISOString(),
      label: `${d.toLocaleDateString(undefined, { weekday: 'short' })} ${d.getDate()}`,
      startIndex: i,
      span: 1,
      isCurrentPeriod: d.getTime() === today.getTime()
    }));
  }

  const segments: TimelineHeaderSegment[] = [];
  let activeKey = '';
  let activeLabel = '';
  let activeStart = 0;
  let activeSpan = 0;

  for (let i = 0; i < columns.length; i++) {
    const d = columns[i];
    const key =
      zoom === 'week'
        ? `${d.getFullYear()}-${getWeekNumber(d)}`
        : `${d.getFullYear()}-${d.getMonth()}`;
    const label =
      zoom === 'week'
        ? `W${getWeekNumber(d)} ${d.getFullYear()}`
        : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    if (key !== activeKey) {
      if (activeSpan > 0) {
        segments.push({ key: activeKey, label: activeLabel, startIndex: activeStart, span: activeSpan });
      }
      activeKey = key;
      activeLabel = label;
      activeStart = i;
      activeSpan = 1;
    } else {
      activeSpan++;
    }
  }
  if (activeSpan > 0) {
    segments.push({ key: activeKey, label: activeLabel, startIndex: activeStart, span: activeSpan });
  }

  const todayTime = today.getTime();
  for (const seg of segments) {
    const segStart = columns[seg.startIndex]?.getTime() ?? 0;
    const segEnd = columns[seg.startIndex + seg.span - 1]?.getTime() ?? 0;
    if (todayTime >= segStart && todayTime <= segEnd) {
      seg.isCurrentPeriod = true;
    }
  }

  return segments;
}

export function buildHourTicks(columns: Date[], dayWidth: number): TimelineHeaderSegment[] {
  const pxPerHour = dayWidth / 24;
  const marks: TimelineHeaderSegment[] = [];

  for (let i = 0; i < columns.length; i++) {
    for (let h = 0; h < 24; h += 6) {
      marks.push({
        key: `${columns[i].toISOString()}-h${h}`,
        label: `${String(h).padStart(2, '0')}:00`,
        startIndex: i,
        span: 0,
        leftPx:  i * dayWidth + h * pxPerHour,
        widthPx: 6 * pxPerHour
      });
    }
  }
  return marks;
}

function getWeekNumber(date: Date): number {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
