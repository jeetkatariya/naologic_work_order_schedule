import { TestBed } from '@angular/core/testing';
import { WorkOrderService } from '../../core/services/work-order.service';
import { diffInDays } from '../../core/utils/date.utils';
import { ZOOM_CONFIG } from './timeline-math';
import { TimelineStore } from './timeline.store';

describe('TimelineStore', () => {
  const storageKey = WorkOrderService.STORAGE_KEY;

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    TestBed.resetTestingModule();
  });

  // ── Overlap detection ──────────────────────────────────────────────────

  it('blocks create when order overlaps in same work center', () => {
    const store    = TestBed.inject(TimelineStore);
    const existing = store.workOrders()[0];

    const result = store.upsertOrder({
      name:         'Overlap test',
      workCenterId: existing.data.workCenterId,
      status:       'open',
      startDate:    existing.data.startDate,
      endDate:      existing.data.endDate
    });

    expect(result.ok).toBeFalse();
  });

  it('allows editing existing order without self-overlap false positive', () => {
    const store    = TestBed.inject(TimelineStore);
    const existing = store.workOrders()[0];

    const result = store.upsertOrder({
      id:           existing.docId,
      name:         `${existing.data.name} Updated`,
      workCenterId: existing.data.workCenterId,
      status:       existing.data.status,
      startDate:    existing.data.startDate,
      endDate:      existing.data.endDate
    });

    expect(result.ok).toBeTrue();
  });

  it('allows order on a different work center with same dates', () => {
    const store = TestBed.inject(TimelineStore);
    const existing = store.workOrders()[0];
    // Find a work center that has NO order at those dates
    const otherCenter = store.workCenters()
      .find(c => store.workOrders()
        .filter(o => o.data.workCenterId === c.docId)
        .every(o => o.data.endDate < existing.data.startDate || o.data.startDate > existing.data.endDate)
      );

    if (!otherCenter) {
      pending('No available work center without conflict for this test');
      return;
    }

    const result = store.upsertOrder({
      name:         'Different center',
      workCenterId: otherCenter.docId,
      status:       'open',
      startDate:    existing.data.startDate,
      endDate:      existing.data.endDate
    });

    expect(result.ok).toBeTrue();
  });

  it('rejects order when end date equals start date', () => {
    const store = TestBed.inject(TimelineStore);
    const result = store.upsertOrder({
      name: 'Same day', workCenterId: store.workCenters()[0].docId,
      status: 'open', startDate: '2020-01-01', endDate: '2020-01-01'
    });
    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error).toContain('after start date');
    }
  });

  it('rejects order when end date is before start date', () => {
    const store = TestBed.inject(TimelineStore);
    const result = store.upsertOrder({
      name: 'Backwards', workCenterId: store.workCenters()[0].docId,
      status: 'open', startDate: '2020-03-01', endDate: '2020-01-01'
    });
    expect(result.ok).toBeFalse();
  });

  // ── Persistence ────────────────────────────────────────────────────────

  it('persists work orders to localStorage via WorkOrderService', () => {
    const store  = TestBed.inject(TimelineStore);
    const before = store.workOrders().length;

    const result = store.upsertOrder({
      name:         'Persisted order',
      workCenterId: store.workCenters()[0].docId,
      status:       'open',
      startDate:    '2020-01-01',
      endDate:      '2020-01-03'
    });

    expect(result.ok).toBeTrue();
    const persisted = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as unknown[];
    expect(persisted.length).toBe(before + 1);
  });

  // ── deleteOrder ────────────────────────────────────────────────────────

  it('deleteOrder removes the specified order', () => {
    const store  = TestBed.inject(TimelineStore);
    const before = store.workOrders().length;
    const target = store.workOrders()[0].docId;

    store.deleteOrder(target);

    expect(store.workOrders().length).toBe(before - 1);
    expect(store.workOrders().find(o => o.docId === target)).toBeUndefined();
  });

  it('deleteOrder persists the updated list', () => {
    const store  = TestBed.inject(TimelineStore);
    const target = store.workOrders()[0].docId;
    store.deleteOrder(target);

    const persisted = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as Array<{ docId: string }>;
    expect(persisted.find(o => o.docId === target)).toBeUndefined();
  });

  // ── setZoom ────────────────────────────────────────────────────────────

  it('setZoom changes the active zoom level', () => {
    const store = TestBed.inject(TimelineStore);
    store.setZoom('week');
    expect(store.zoom()).toBe('week');
  });

  it('setZoom resets the visible range to the new zoom buffer', () => {
    const store = TestBed.inject(TimelineStore);
    // Expand range significantly first
    store.expandLeft(500);

    store.setZoom('month');

    const expectedBuffer = ZOOM_CONFIG['month'].bufferDays;
    const startDiff = Math.abs(diffInDays(new Date(), store.visibleRange().startDate));
    // Allow ±2 days tolerance for date/time edge cases
    expect(startDiff).toBeLessThan(expectedBuffer + 2);
    expect(startDiff).toBeGreaterThan(expectedBuffer - 2);
  });

  // ── Infinite scroll helpers ─────────────────────────────────────────────

  it('expandLeft extends the start date backward', () => {
    const store  = TestBed.inject(TimelineStore);
    const before = store.visibleRange().startDate.getTime();
    store.expandLeft(30);
    expect(store.visibleRange().startDate.getTime()).toBeLessThan(before);
  });

  it('expandLeft extends by the exact number of days requested', () => {
    const store  = TestBed.inject(TimelineStore);
    const before = store.visibleRange().startDate;
    store.expandLeft(30);
    const diff = diffInDays(before, store.visibleRange().startDate);
    expect(diff).toBe(30);
  });

  it('expandRight extends the end date forward', () => {
    const store  = TestBed.inject(TimelineStore);
    const before = store.visibleRange().endDate.getTime();
    store.expandRight(30);
    expect(store.visibleRange().endDate.getTime()).toBeGreaterThan(before);
  });

  it('expandRight extends by the exact number of days requested', () => {
    const store  = TestBed.inject(TimelineStore);
    const before = store.visibleRange().endDate;
    store.expandRight(30);
    const diff = diffInDays(store.visibleRange().endDate, before);
    expect(diff).toBe(30);
  });

  it('columns length grows when expandLeft is called', () => {
    const store  = TestBed.inject(TimelineStore);
    const before = store.columns().length;
    store.expandLeft(10);
    expect(store.columns().length).toBe(before + 10);
  });
});
