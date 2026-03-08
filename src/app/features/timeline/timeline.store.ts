import { Injectable, computed, inject, signal } from '@angular/core';
import { WorkCenterService } from '../../core/services/work-center.service';
import { WorkOrderService } from '../../core/services/work-order.service';
import { TimelineZoom } from '../../core/models/timeline.model';
import { WorkCenterDocument } from '../../core/models/work-center.model';
import { WorkOrderDocument } from '../../core/models/work-order.model';
import { fromIsoDate, rangesOverlap } from '../../core/utils/date.utils';
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
  private readonly wcService  = inject(WorkCenterService);
  private readonly woService  = inject(WorkOrderService);

  private readonly workCentersState = signal<WorkCenterDocument[]>(this.wcService.getAll());
  private readonly workOrdersState  = signal<WorkOrderDocument[]>(this.woService.getInitialOrders());
  private readonly zoomState        = signal<TimelineZoom>('day');

  constructor() {
   
    this.woService.persist(this.workOrdersState());

    const orders  = this.workOrdersState();
    const centers = this.workCentersState();
    console.group('[TimelineStore] Initialised');
    console.log(`Work centers (${centers.length}):`, centers.map(c => `${c.docId} → "${c.data.name}"`));
    console.log(`Work orders  (${orders.length}):`,  orders.map(o =>
      `${o.docId} | center=${o.data.workCenterId} | ${o.data.startDate}→${o.data.endDate} | ${o.data.status}`
    ));

    const centerIds = new Set(centers.map(c => c.docId));
    const orphaned  = orders.filter(o => !centerIds.has(o.data.workCenterId));
    if (orphaned.length) {
      console.warn(
        ` ${orphaned.length} orphaned order(s) — workCenterId does not match any work center:`,
        orphaned.map(o => `${o.docId} centerId="${o.data.workCenterId}"`)
      );
    } else {
      console.log('✓ All orders reference a valid work center.');
    }
    console.groupEnd();
  }


  readonly workCenters = this.workCentersState.asReadonly();
  readonly workOrders  = this.workOrdersState.asReadonly();
  readonly zoom        = this.zoomState.asReadonly();
  readonly zoomConfig  = computed(() => ZOOM_CONFIG[this.zoomState()]);

  readonly visibleRange = computed(() => {
    const config = this.zoomConfig();
    const today  = new Date();
    return {
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - config.bufferDays),
      endDate:   new Date(today.getFullYear(), today.getMonth(), today.getDate() + config.bufferDays)
    };
  });

  readonly columns = computed(() =>
    buildDayColumns(this.visibleRange().startDate, this.visibleRange().endDate)
  );


  setZoom(zoom: TimelineZoom): void {
    this.zoomState.set(zoom);
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
        // Create
        const created = [...orders, {
          docId:   `wo-${Date.now()}`,
          docType: 'workOrder' as const,
          data: {
            name:          draft.name.trim(),
            workCenterId:  draft.workCenterId,
            status:        draft.status,
            startDate:     draft.startDate,
            endDate:       draft.endDate
          }
        }];
        this.woService.persist(created);
        return created;
      }

      // Update
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
