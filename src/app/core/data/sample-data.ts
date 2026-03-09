import { WorkCenterDocument } from '../models/work-center.model';
import { WorkOrderDocument } from '../models/work-order.model';
import { TimelineZoom } from '../models/timeline.model';
import { addDays, toIsoDate } from '../utils/date.utils';

const today = new Date();
const d = (offset: number): string => toIsoDate(addDays(today, offset));

export const TIMELINE_ZOOM_OPTIONS: Array<{ value: TimelineZoom; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' }
];

export const TIMELINE_CURRENT_PERIOD_LABELS: Record<TimelineZoom, string> = {
  day: 'Current day',
  week: 'Current week',
  month: 'Current month'
};

export const SAMPLE_WORK_CENTERS: WorkCenterDocument[] = [
  { docId: 'wc-genesis',   docType: 'workCenter', data: { name: 'Genesis Hardware' } },
  { docId: 'wc-rodriques', docType: 'workCenter', data: { name: 'Rodriques Electrics' } },
  { docId: 'wc-konsulting', docType: 'workCenter', data: { name: 'Konsulting Inc' } },
  { docId: 'wc-mcmarrow',  docType: 'workCenter', data: { name: 'McMarrow Distribution' } },
  { docId: 'wc-spartan',   docType: 'workCenter', data: { name: 'Spartan Manufacturing' } },
  { docId: 'wc-frontier',  docType: 'workCenter', data: { name: 'Frontier Logistics' } }
];

export const SAMPLE_WORK_ORDERS: WorkOrderDocument[] = [

  // Genesis Hardware (3 orders)
  {
    docId: 'wo-1001',
    docType: 'workOrder',
    data: { name: 'Sheet Metal Press Run A', workCenterId: 'wc-genesis', status: 'complete', startDate: d(-92), endDate: d(-70) }
  },
  {
    docId: 'wo-1007',
    docType: 'workOrder',
    data: { name: 'CNC Machining Batch B', workCenterId: 'wc-genesis', status: 'in-progress', startDate: d(-12), endDate: d(14) }
  },
  {
    docId: 'wo-1011',
    docType: 'workOrder',
    data: { name: 'Hardware Assembly Run C', workCenterId: 'wc-genesis', status: 'open', startDate: d(42), endDate: d(66) }
  },

  // Rodriques Electrics (3 orders)
  {
    docId: 'wo-1015',
    docType: 'workOrder',
    data: { name: 'Transformer Overhaul', workCenterId: 'wc-rodriques', status: 'complete', startDate: d(-84), endDate: d(-58) }
  },
  {
    docId: 'wo-1002',
    docType: 'workOrder',
    data: { name: 'Panel Wiring Phase 1', workCenterId: 'wc-rodriques', status: 'blocked', startDate: d(-6), endDate: d(22) }
  },
  {
    docId: 'wo-1016',
    docType: 'workOrder',
    data: { name: 'Circuit Board Assembly', workCenterId: 'wc-rodriques', status: 'open', startDate: d(55), endDate: d(82) }
  },

  // Konsulting Inc (3 orders)
  {
    docId: 'wo-1003',
    docType: 'workOrder',
    data: { name: 'Process Audit Sprint A', workCenterId: 'wc-konsulting', status: 'complete', startDate: d(-74), endDate: d(-52) }
  },
  {
    docId: 'wo-1004',
    docType: 'workOrder',
    data: { name: 'ERP Integration Sprint B', workCenterId: 'wc-konsulting', status: 'in-progress', startDate: d(-18), endDate: d(10) }
  },
  {
    docId: 'wo-1017',
    docType: 'workOrder',
    data: { name: 'Systems Audit Q3', workCenterId: 'wc-konsulting', status: 'open', startDate: d(38), endDate: d(63) }
  },

  // McMarrow Distribution (3 orders)
  {
    docId: 'wo-1018',
    docType: 'workOrder',
    data: { name: 'East Coast Delivery Run', workCenterId: 'wc-mcmarrow', status: 'complete', startDate: d(-96), endDate: d(-68) }
  },
  {
    docId: 'wo-1005',
    docType: 'workOrder',
    data: { name: 'Cross-Dock Freight Batch', workCenterId: 'wc-mcmarrow', status: 'in-progress', startDate: d(-8), endDate: d(18) }
  },
  {
    docId: 'wo-1019',
    docType: 'workOrder',
    data: { name: 'Warehouse Restock B', workCenterId: 'wc-mcmarrow', status: 'blocked', startDate: d(46), endDate: d(74) }
  },

  // Spartan Manufacturing (3 orders)
  {
    docId: 'wo-1006',
    docType: 'workOrder',
    data: { name: 'Steel Press Production Q1', workCenterId: 'wc-spartan', status: 'complete', startDate: d(-62), endDate: d(-36) }
  },
  {
    docId: 'wo-1008',
    docType: 'workOrder',
    data: { name: 'Stamping Run Batch 7', workCenterId: 'wc-spartan', status: 'in-progress', startDate: d(-4), endDate: d(28) }
  },
  {
    docId: 'wo-1020',
    docType: 'workOrder',
    data: { name: 'Finishing Line Q2', workCenterId: 'wc-spartan', status: 'open', startDate: d(61), endDate: d(90) }
  },

  // Frontier Logistics (3 orders)
  {
    docId: 'wo-1013',
    docType: 'workOrder',
    data: { name: 'North Region Haul Q4', workCenterId: 'wc-frontier', status: 'complete', startDate: d(-88), endDate: d(-60) }
  },
  {
    docId: 'wo-1014',
    docType: 'workOrder',
    data: { name: 'South Region Delivery', workCenterId: 'wc-frontier', status: 'in-progress', startDate: d(-16), endDate: d(20) }
  },
  {
    docId: 'wo-1024',
    docType: 'workOrder',
    data: { name: 'Cross-Country Freight Q1', workCenterId: 'wc-frontier', status: 'open', startDate: d(49), endDate: d(78) }
  }

];
