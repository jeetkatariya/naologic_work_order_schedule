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

  readonly todayIndicatorX = computed(() =>
    dateToX(new Date(), this.visibleRange().startDate, this.dayWidth())
  );

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

    const range = this.visibleRange();
    console.group('[TimelinePage] View initialised');
    console.log(`Zoom: ${this.zoom()} | dayWidth: ${this.dayWidth()}px`);
    console.log(`Visible range: ${range.startDate.toDateString()} → ${range.endDate.toDateString()}`);
    console.log(`Total columns: ${this.columns().length} | totalWidth: ${this.totalWidth()}px`);
    console.log(`Today indicator X: ${this.todayIndicatorX()}px`);

    for (const center of this.workCenters()) {
      const bars = this.getOrdersForCenter(center.docId);
      console.log(`  Row "${center.data.name}" (${center.docId}): ${bars.length} bar(s)`,
        bars.map(o => o.data.name)
      );
    }
    console.groupEnd();
  }


  toggleTimescale(): void {
    this.timescaleOpen.update(v => !v);
  }

  selectZoom(zoom: TimelineZoom): void {
    this.store.setZoom(zoom);
    this.timescaleOpen.set(false);
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
    const target = event.target as HTMLElement | null;
    if (target?.closest('.wo-bar') || target?.closest('.wo-menu')) {
      this.ghostRowId.set(null);
      return;
    }
    const row = event.currentTarget as HTMLElement;
    const viewport = this.scrollViewport()?.nativeElement;
    if (!viewport) return;
    const x = viewport.scrollLeft + (event.clientX - row.getBoundingClientRect().left);
    const snappedX = this.snapXToGridUnit(x);
    this.ghostRowId.set(workCenterId);
    this.ghostLeft.set(snappedX);
  }


  onRowClick(event: MouseEvent, workCenterId: string): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('.wo-bar') || target.closest('.wo-menu') || target.closest('.wo-bar__dots')) return;

    const row      = event.currentTarget as HTMLElement;
    const viewport = this.scrollViewport()?.nativeElement;
    if (!viewport) return;

    const x = viewport.scrollLeft + (event.clientX - row.getBoundingClientRect().left);
    const clickedDate = xToDate(x, this.visibleRange().startDate, this.dayWidth());
    const snappedDate = this.snapDateToGridUnit(clickedDate);

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
    const newId = this.openMenuOrderId();
    console.log('[toggleMenu] openMenuOrderId =', newId);

    if (newId) {
      // After Angular renders, inspect the actual DOM z-index
      setTimeout(() => {
        const bar = document.querySelector(`.wo-bar--menu-open`) as HTMLElement | null;
        const menu = document.querySelector(`.wo-menu`) as HTMLElement | null;
        if (bar) {
          const cs = getComputedStyle(bar);
          console.log('[DEBUG] .wo-bar--menu-open found:', bar);
          console.log('[DEBUG]   z-index (computed):', cs.zIndex);
          console.log('[DEBUG]   position:', cs.position);
          console.log('[DEBUG]   classes:', bar.className);
        } else {
          console.warn('[DEBUG] .wo-bar--menu-open NOT found in DOM');
        }
        if (menu) {
          const cs = getComputedStyle(menu);
          console.log('[DEBUG] .wo-menu found:', menu);
          console.log('[DEBUG]   z-index (computed):', cs.zIndex);
          console.log('[DEBUG]   offsetParent:', menu.offsetParent);
        } else {
          console.warn('[DEBUG] .wo-menu NOT found in DOM');
        }
      }, 50);
    }
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
    const start = fromIsoDate(order.data.startDate);
    const end   = fromIsoDate(order.data.endDate);
    const visibleStart = this.visibleRange().startDate;
    const visibleEnd   = this.visibleRange().endDate;

    const effectiveStart = start < visibleStart ? visibleStart : start;
    const effectiveEnd   = end   > visibleEnd   ? visibleEnd   : end;
    const left  = dateToX(effectiveStart, visibleStart, this.dayWidth());
    const width = dateToX(addDays(effectiveEnd, 1), visibleStart, this.dayWidth()) - left;

    return {
      left:  `${Math.max(left, 0)}px`,
      width: `${Math.max(width, this.dayWidth() * 0.6)}px`
    };
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
    const zoom = this.zoom();
    const dw   = this.dayWidth();
    if (zoom === 'week' || zoom === 'month') {
      const date    = xToDate(x, this.visibleRange().startDate, dw);
      const snapped = this.snapDateToGridUnit(date);
      return Math.max(0, dateToX(snapped, this.visibleRange().startDate, dw));
    }
    return Math.floor(x / dw) * dw;
  }

  private centerToday(): void {
    const viewport = this.scrollViewport()?.nativeElement;
    if (!viewport) return;
    viewport.scrollLeft = Math.max(this.todayIndicatorX() - viewport.clientWidth / 2, 0);
  }
}
