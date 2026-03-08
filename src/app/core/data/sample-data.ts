import { WorkCenterDocument } from '../models/work-center.model';
import { WorkOrderDocument } from '../models/work-order.model';
import { TimelineZoom } from '../models/timeline.model';
import { addDays, toIsoDate } from '../utils/date.utils';

const today = new Date();
const d = (offset: number): string => toIsoDate(addDays(today, offset));

export const TIMELINE_ZOOM_OPTIONS: Array<{ value: TimelineZoom; label: string }> = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' }
];

export const TIMELINE_CURRENT_PERIOD_LABELS: Record<TimelineZoom, string> = {
  hour: 'Current hour',
  day: 'Current day',
  week: 'Current week',
  month: 'Current month'
};

export const SAMPLE_WORK_CENTERS: WorkCenterDocument[] = [
  { docId: 'wc-genesis',   docType: 'workCenter', data: { name: 'Genesis Hardware' } },
  { docId: 'wc-rodriques', docType: 'workCenter', data: { name: 'Rodriques Electrics' } },
  { docId: 'wc-konsulting', docType: 'workCenter', data: { name: 'Konsulting Inc' } },
  { docId: 'wc-mcmarrow',  docType: 'workCenter', data: { name: 'McMarrow Distribution' } },
  { docId: 'wc-spartan',   docType: 'workCenter', data: { name: 'Spartan Manufacturing' } }
];

export const SAMPLE_WORK_ORDERS: WorkOrderDocument[] = [
  {
    docId: 'wo-1001',
    docType: 'workOrder',
    data: { name: 'Centrix Ltd', workCenterId: 'wc-genesis', status: 'complete', startDate: d(-25), endDate: d(-5) }
  },
  {
    docId: 'wo-1002',
    docType: 'workOrder',
    data: { name: 'Rodriques Electrics', workCenterId: 'wc-rodriques', status: 'in-progress', startDate: d(-15), endDate: d(20) }
  },
  {
    docId: 'wo-1003',
    docType: 'workOrder',
    data: { name: 'Konsulting Inc', workCenterId: 'wc-konsulting', status: 'in-progress', startDate: d(-20), endDate: d(12) }
  },
  {
    docId: 'wo-1004',
    docType: 'workOrder',
    data: { name: 'Compleks Systems', workCenterId: 'wc-konsulting', status: 'in-progress', startDate: d(16), endDate: d(45) }
  },
  {
    docId: 'wo-1005',
    docType: 'workOrder',
    data: { name: 'McMarrow Distribution', workCenterId: 'wc-mcmarrow', status: 'blocked', startDate: d(-10), endDate: d(40) }
  },
  {
    docId: 'wo-1006',
    docType: 'workOrder',
    data: { name: 'Spartan Distribution', workCenterId: 'wc-spartan', status: 'open', startDate: d(-8), endDate: d(35) }
  },
  {
    docId: 'wo-1007',
    docType: 'workOrder',
    data: { name: 'Genesis Batch B', workCenterId: 'wc-genesis', status: 'in-progress', startDate: d(2), endDate: d(14) }
  },
  {
    docId: 'wo-1008',
    docType: 'workOrder',
    data: { name: 'Spartan Express Run', workCenterId: 'wc-spartan', status: 'complete', startDate: d(40), endDate: d(55) }
  }
];
