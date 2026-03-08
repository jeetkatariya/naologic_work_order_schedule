import { TestBed } from '@angular/core/testing';
import { WorkOrderService } from '../../core/services/work-order.service';
import { TimelineStore } from './timeline.store';

describe('TimelineStore', () => {
  const storageKey = WorkOrderService.STORAGE_KEY;

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    TestBed.resetTestingModule();
  });

  it('blocks create when order overlaps in same work center', () => {
    const store    = TestBed.inject(TimelineStore);
    const existing = store.workOrders()[0];

    const result = store.upsertOrder({
      name:          'Overlap test',
      workCenterId:  existing.data.workCenterId,
      status:        'open',
      startDate:     existing.data.startDate,
      endDate:       existing.data.endDate
    });

    expect(result.ok).toBeFalse();
  });

  it('allows editing existing order without self-overlap false positive', () => {
    const store    = TestBed.inject(TimelineStore);
    const existing = store.workOrders()[0];

    const result = store.upsertOrder({
      id:            existing.docId,
      name:          `${existing.data.name} Updated`,
      workCenterId:  existing.data.workCenterId,
      status:        existing.data.status,
      startDate:     existing.data.startDate,
      endDate:       existing.data.endDate
    });

    expect(result.ok).toBeTrue();
  });

  it('persists work orders to localStorage via WorkOrderService', () => {
    const store  = TestBed.inject(TimelineStore);
    const before = store.workOrders().length;

    const result = store.upsertOrder({
      name:         'Persisted order',
      workCenterId: store.workCenters()[0].docId,
      status:       'open',
      startDate:    '2026-01-01',
      endDate:      '2026-01-03'
    });

    expect(result.ok).toBeTrue();
    const persisted = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as unknown[];
    expect(persisted.length).toBe(before + 1);
  });
});
