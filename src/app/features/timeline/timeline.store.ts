import { Injectable, computed, inject, signal } from '@angular/core';
import { WorkCenterService } from '../../core/services/work-center.service';
import { WorkOrderService } from '../../core/services/work-order.service';
import { TimelineZoom } from '../../core/models/timeline.model';
import { WorkCenterDocument } from '../../core/models/work-center.model';
import { WorkOrderDocument } from '../../core/models/work-order.model';
import { addDays, fromIsoDate, rangesOverlap, startOfDay } from '../../core/utils/date.utils';
import { ZOOM_CONFIG, buildDayColumns } from './timeline-math';

export interface WorkOrderDraft {
  id?: string;
  name: string;
  workCenterId: string;
  status: WorkOrderDocument['data']['status'];
  startDate: string;
  endDate: string;
}

@Injectable({ providedIn: 'root' })
export class TimelineStore {
  private readonly wcService = inject(WorkCenterService);
  private readonly woService = inject(WorkOrderService);

  private readonly workCentersState = signal<WorkCenterDocument[]>(this.wcService.getAll());
  private readonly workOrdersState  = signal<WorkOrderDocument[]>(this.woService.getInitialOrders());
  private readonly zoomState        = signal<TimelineZoom>('day');

  // Signal-based visible range (enables infinite scroll via expandLeft / expandRight)
  private readonly rangeStartState = signal<Date>(
    addDays(startOfDay(new Date()), -ZOOM_CONFIG['day'].bufferDays)
  );
  private readonly rangeEndState = signal<Date>(
    addDays(startOfDay(new Date()), ZOOM_CONFIG['day'].bufferDays)
  );

  constructor() {
    this.woService.persist(this.workOrdersState());
  }

  readonly workCenters  = this.workCentersState.asReadonly();
  readonly workOrders   = this.workOrdersState.asReadonly();
  readonly zoom         = this.zoomState.asReadonly();
  readonly zoomConfig   = computed(() => ZOOM_CONFIG[this.zoomState()]);

  readonly visibleRange = computed(() => ({
    startDate: this.rangeStartState(),
    endDate:   this.rangeEndState()
  }));

  readonly columns = computed(() =>
    buildDayColumns(this.visibleRange().startDate, this.visibleRange().endDate)
  );


  setZoom(zoom: TimelineZoom): void {
    this.zoomState.set(zoom);
    const cfg   = ZOOM_CONFIG[zoom];
    const today = startOfDay(new Date());
    this.rangeStartState.set(addDays(today, -cfg.bufferDays));
    this.rangeEndState.set(addDays(today,    cfg.bufferDays));
  }

  /** Prepend `days` columns to the left edge of the visible range. */
  expandLeft(days: number): void {
    this.rangeStartState.update(d => addDays(d, -days));
  }

  /** Append `days` columns to the right edge of the visible range. */
  expandRight(days: number): void {
    this.rangeEndState.update(d => addDays(d, days));
  }


  deleteOrder(docId: string): void {
    this.workOrdersState.update(orders => {
      const next = orders.filter(o => o.docId !== docId);
      this.woService.persist(next);
      return next;
    });
  }

  upsertOrder(draft: WorkOrderDraft): { ok: true } | { ok: false; error: string } {
    const start = fromIsoDate(draft.startDate);
    const end   = fromIsoDate(draft.endDate);

    if (end <= start) {
      return { ok: false, error: 'End date must be after start date.' };
    }

    if (this.hasOverlap(draft)) {
      return { ok: false, error: 'This work order overlaps with another order in the same work center.' };
    }

    this.workOrdersState.update(orders => {
      if (!draft.id) {
        const created = [...orders, {
          docId:   `wo-${Date.now()}`,
          docType: 'workOrder' as const,
          data: {
            name:         draft.name.trim(),
            workCenterId: draft.workCenterId,
            status:       draft.status,
            startDate:    draft.startDate,
            endDate:      draft.endDate
          }
        }];
        this.woService.persist(created);
        return created;
      }

      const updated = orders.map(o =>
        o.docId === draft.id
          ? { ...o, data: { ...o.data, name: draft.name.trim(), workCenterId: draft.workCenterId, status: draft.status, startDate: draft.startDate, endDate: draft.endDate } }
          : o
      );
      this.woService.persist(updated);
      return updated;
    });

    return { ok: true };
  }


  private hasOverlap(draft: WorkOrderDraft): boolean {
    const targetStart = fromIsoDate(draft.startDate);
    const targetEnd   = fromIsoDate(draft.endDate);

    return this.workOrdersState()
      .filter(o => o.data.workCenterId === draft.workCenterId)
      .filter(o => o.docId !== draft.id)
      .some(o => rangesOverlap(
        targetStart, targetEnd,
        fromIsoDate(o.data.startDate), fromIsoDate(o.data.endDate)
      ));
  }
}
