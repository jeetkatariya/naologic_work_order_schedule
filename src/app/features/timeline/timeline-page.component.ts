import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TIMELINE_CURRENT_PERIOD_LABELS, TIMELINE_ZOOM_OPTIONS } from '../../core/data/sample-data';
import { TimelineZoom } from '../../core/models/timeline.model';
import { WorkOrderDocument, WorkOrderStatus } from '../../core/models/work-order.model';
import { addDays, fromIsoDate, toIsoDate } from '../../core/utils/date.utils';
import { WorkOrderPanelComponent } from '../work-order-panel/work-order-panel.component';
import { TimelineHeaderSegment, buildHeaderSegments, dateToX, xToDate } from './timeline-math';
import { TimelineStore, WorkOrderDraft } from './timeline.store';

type PanelMode = 'create' | 'edit';

@Component({
  selector: 'app-timeline-page',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkOrderPanelComponent],
  templateUrl: './timeline-page.component.html',
  styleUrl: './timeline-page.component.scss'
})
export class TimelinePageComponent implements AfterViewInit {
  private readonly store = inject(TimelineStore);

  readonly scrollViewport = viewChild<ElementRef<HTMLDivElement>>('scrollViewport');

  readonly workCenters  = this.store.workCenters;
  readonly workOrders   = this.store.workOrders;
  readonly zoom         = this.store.zoom;
  readonly columns      = this.store.columns;
  readonly dayWidth     = computed(() => this.store.zoomConfig().dayWidth);
  readonly visibleRange = this.store.visibleRange;
  readonly totalWidth   = computed(() => this.columns().length * this.dayWidth());

  readonly gridColumnWidth = computed(() => {
    const dw = this.dayWidth();
    switch (this.zoom()) {
      case 'week':  return 7  * dw;   
      case 'month': return 30 * dw;   
      default:      return dw;        
    }
  });

  readonly headerSegments = computed<TimelineHeaderSegment[]>(() =>
    buildHeaderSegments(this.columns(), this.zoom(), this.dayWidth())
  );

  readonly zoomOptions = TIMELINE_ZOOM_OPTIONS;

  readonly timescaleOpen = signal(false);

  readonly hoveredRowId = signal<string | null>(null);

  readonly ghostRowId = signal<string | null>(null);
  readonly ghostLeft  = signal<number>(0);

  readonly ghostWidth = computed(() => {
    const zoom = this.zoom();
    const dw   = this.dayWidth();
    if (zoom === 'month') {
      const left = this.ghostLeft();
      const d    = xToDate(left, this.visibleRange().startDate, dw);
      const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return days * dw;
    }
    return this.gridColumnWidth();
  });

  readonly panelVisible       = signal(false);
  readonly panelMode          = signal<PanelMode>('create');
  readonly selectedOrder      = signal<WorkOrderDocument | null>(null);
  readonly prefillWorkCenterId  = signal<string | null>(null);
  readonly prefillStartDateIso  = signal<string | null>(null);
  readonly submitError        = signal('');

  readonly openMenuOrderId    = signal<string | null>(null);

  readonly hoveredOrder = signal<WorkOrderDocument | null>(null);
  readonly tooltipX     = signal(0);
  readonly tooltipY     = signal(0);

  readonly todayIndicatorX = computed(() => {
    const t = new Date();
    const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const snapped = this.snapDateToGridUnit(today);
    return dateToX(snapped, this.visibleRange().startDate, this.dayWidth());
  });

  readonly currentPeriodLabel = computed(() => {
    return TIMELINE_CURRENT_PERIOD_LABELS[this.zoom()];
  });

  readonly activeZoomLabel = computed(() =>
    this.zoomOptions.find(z => z.value === this.zoom())?.label ?? ''
  );

  readonly tooltipText = computed(() => {
    const order = this.hoveredOrder();
    if (!order) return '';
    return `${order.data.name} · ${this.statusLabel(order.data.status)} · ${order.data.startDate} → ${order.data.endDate}`;
  });

  ngAfterViewInit(): void {
    this.centerToday();
  }


  toggleTimescale(): void {
    this.timescaleOpen.update(v => !v);
  }

  selectZoom(zoom: TimelineZoom): void {
    this.store.setZoom(zoom);
    this.timescaleOpen.set(false);
    this.ghostRowId.set(null);
    this.ghostLeft.set(0);
    queueMicrotask(() => this.centerToday());
  }


  onRowEnter(workCenterId: string): void {
    this.hoveredRowId.set(workCenterId);
  }

  onRowLeave(): void {
    this.hoveredRowId.set(null);
    this.ghostRowId.set(null);
  }

  onRowMouseMove(event: MouseEvent, workCenterId: string): void {
    if (this.openMenuOrderId()) {
      this.ghostRowId.set(null);
      return;
    }
    if (this.hoveredOrder()) {
      this.ghostRowId.set(null);
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest('.wo-bar') || target?.closest('.wo-menu')) {
      this.ghostRowId.set(null);
      return;
    }
    const viewport = this.scrollViewport()?.nativeElement;
    if (!viewport) return;
    const cursorX = this.getCursorTimelineX(event, viewport);
    if (this.isCursorNearAnyBar(workCenterId, cursorX)) {
      this.ghostRowId.set(null);
      return;
    }
    const snappedX = this.getSnappedTimelineX(cursorX);
    this.ghostRowId.set(workCenterId);
    this.ghostLeft.set(snappedX);
  }


  onRowClick(event: MouseEvent, workCenterId: string): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('.wo-bar') || target.closest('.wo-menu') || target.closest('.wo-bar__dots')) return;

    const viewport = this.scrollViewport()?.nativeElement;
    if (!viewport) return;

    const cursorX = this.getCursorTimelineX(event, viewport);
    const snappedX = this.getSnappedTimelineX(cursorX);
    const snappedDate = xToDate(snappedX, this.visibleRange().startDate, this.dayWidth());

    this.panelMode.set('create');
    this.selectedOrder.set(null);
    this.prefillWorkCenterId.set(workCenterId);
    this.prefillStartDateIso.set(toIsoDate(snappedDate));
    this.submitError.set('');
    this.panelVisible.set(true);
    this.openMenuOrderId.set(null);
  }

  openEdit(order: WorkOrderDocument): void {
    this.panelMode.set('edit');
    this.selectedOrder.set(order);
    this.prefillWorkCenterId.set(order.data.workCenterId);
    this.prefillStartDateIso.set(order.data.startDate);
    this.submitError.set('');
    this.panelVisible.set(true);
    this.openMenuOrderId.set(null);
  }

  deleteOrder(order: WorkOrderDocument): void {
    this.store.deleteOrder(order.docId);
    this.openMenuOrderId.set(null);
  }

  toggleMenu(orderId: string): void {
    this.openMenuOrderId.set(this.openMenuOrderId() === orderId ? null : orderId);
    this.ghostRowId.set(null);
  }

  jumpToToday(): void {
    this.centerToday();
  }

  closePanel(): void {
    this.panelVisible.set(false);
    this.submitError.set('');
    this.selectedOrder.set(null);
  }

  submitOrder(draft: WorkOrderDraft): void {
    const result = this.store.upsertOrder(draft);
    if (!result.ok) {
      this.submitError.set(result.error);
      return;
    }
    this.closePanel();
  }


  getBarStyle(order: WorkOrderDocument): Record<string, string> {
    const { left, width } = this.getBarMetrics(order);

    return {
      left:  `${Math.max(left, 0)}px`,
      width: `${Math.max(width, this.dayWidth() * 0.6)}px`
    };
  }

  isCompactBar(order: WorkOrderDocument): boolean {
    const { width } = this.getBarMetrics(order);
    return width < 180;
  }

  getOrdersForCenter(workCenterId: string): WorkOrderDocument[] {
    return this.workOrders()
      .filter(o => o.data.workCenterId === workCenterId)
      .filter(o => {
        const s = fromIsoDate(o.data.startDate);
        const e = fromIsoDate(o.data.endDate);
        return e >= this.visibleRange().startDate && s <= this.visibleRange().endDate;
      });
  }

  statusLabel(status: WorkOrderStatus): string {
    const labels: Record<WorkOrderStatus, string> = {
      open: 'Open', 'in-progress': 'In progress', complete: 'Complete', blocked: 'Blocked'
    };
    return labels[status];
  }

  rowHasOpenMenu(workCenterId: string): boolean {
    const menuId = this.openMenuOrderId();
    if (!menuId) return false;
    return this.getOrdersForCenter(workCenterId).some(o => o.docId === menuId);
  }

  trackByWorkCenter(_: number, c: { docId: string }): string { return c.docId; }
  trackByOrder(_: number, o: WorkOrderDocument): string       { return o.docId; }


  showTooltip(event: MouseEvent, order: WorkOrderDocument): void {
    this.hoveredOrder.set(order);
    this.tooltipX.set(event.clientX + 14);
    this.tooltipY.set(event.clientY + 14);
  }

  moveTooltip(event: MouseEvent): void {
    if (!this.hoveredOrder()) return;
    this.tooltipX.set(event.clientX + 14);
    this.tooltipY.set(event.clientY + 14);
  }

  hideTooltip(): void { this.hoveredOrder.set(null); }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const t = event.target as HTMLElement | null;
    if (!t) return;
    if (!t.closest('.wo-menu') && !t.closest('.wo-bar__dots')) {
      this.openMenuOrderId.set(null);
    }
    if (!t.closest('.timescale-btn') && !t.closest('.timescale-dropdown')) {
      this.timescaleOpen.set(false);
    }
   
    if (
      this.panelVisible() &&
      !t.closest('app-work-order-panel') &&
      !t.closest('ngb-datepicker') &&
      !t.closest('.ng-dropdown-panel') &&
      !t.closest('.wo-menu') &&
      !t.closest('.tl-row')
    ) {
      this.closePanel();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.panelVisible()) this.closePanel();
    this.openMenuOrderId.set(null);
    this.timescaleOpen.set(false);
    this.hideTooltip();
  }

  private snapDateToGridUnit(date: Date): Date {
    switch (this.zoom()) {
      case 'week': {
        const day = date.getDay();
        return addDays(date, day === 0 ? -6 : 1 - day);
      }
      case 'month':
        return new Date(date.getFullYear(), date.getMonth(), 1);
      default:
        return date;
    }
  }

  private snapXToGridUnit(x: number): number {
    const dateAtCursor = xToDate(x, this.visibleRange().startDate, this.dayWidth());
    const snappedDate = this.snapDateToGridUnit(dateAtCursor);
    return dateToX(snappedDate, this.visibleRange().startDate, this.dayWidth());
  }

  private centerToday(): void {
    const viewport = this.scrollViewport()?.nativeElement;
    if (!viewport) return;
    viewport.scrollLeft = Math.max(this.todayIndicatorX() - viewport.clientWidth / 2, 0);
  }

  private getBarMetrics(order: WorkOrderDocument): { left: number; width: number } {
    const start = fromIsoDate(order.data.startDate);
    const end = fromIsoDate(order.data.endDate);
    const visibleStart = this.visibleRange().startDate;
    const visibleEnd = this.visibleRange().endDate;

    const effectiveStart = start < visibleStart ? visibleStart : start;
    const effectiveEnd = end > visibleEnd ? visibleEnd : end;
    const left = dateToX(effectiveStart, visibleStart, this.dayWidth());
    const width = dateToX(addDays(effectiveEnd, 1), visibleStart, this.dayWidth()) - left;

    return { left, width };
  }

  private isCursorNearAnyBar(workCenterId: string, cursorX: number): boolean {
    return this.getOrdersForCenter(workCenterId).some((order) => {
      const { left, width } = this.getBarMetrics(order);
      const start = left;
      const end = left + Math.max(width, this.dayWidth() * 0.6);
      return cursorX >= start && cursorX <= end;
    });
  }

  private getCursorTimelineX(
    event: MouseEvent,
    viewport: HTMLDivElement
  ): number {
    const viewportRect = viewport.getBoundingClientRect();
    const localX = event.clientX - viewportRect.left;
    const clampedLocalX = Math.min(Math.max(localX, 0), viewport.clientWidth);
    return viewport.scrollLeft + clampedLocalX;
  }

  private getSnappedTimelineX(cursorX: number): number {
    const snappedX = this.snapXToGridUnit(cursorX);
    const minX = 0;
    const maxX = Math.max(this.totalWidth() - this.dayWidth(), 0);
    return Math.min(Math.max(snappedX, minX), maxX);
  }
}
