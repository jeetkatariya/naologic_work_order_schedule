export type TimelineZoom = 'hour' | 'day' | 'week' | 'month';

export interface ZoomConfig {
  dayWidth: number;
  bufferDays: number;
}
