export type TimelineZoom = 'day' | 'week' | 'month';

export interface ZoomConfig {
  dayWidth: number;
  bufferDays: number;
}
