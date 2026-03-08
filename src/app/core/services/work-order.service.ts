import { Injectable } from '@angular/core';
import { SAMPLE_WORK_ORDERS } from '../data/sample-data';
import { WorkOrderDocument } from '../models/work-order.model';


@Injectable({ providedIn: 'root' })
export class WorkOrderService {
  static readonly STORAGE_KEY = 'naologic.timeline.workOrders.v2';


  getInitialOrders(): WorkOrderDocument[] {
    if (typeof localStorage === 'undefined') {
      return this.getSeedOrders();
    }

    try {
      const raw = localStorage.getItem(WorkOrderService.STORAGE_KEY);
      if (!raw) return this.getSeedOrders();

      const parsed = JSON.parse(raw) as WorkOrderDocument[];
      if (!Array.isArray(parsed) || parsed.length === 0) return this.getSeedOrders();

      return parsed;
    } catch {
      return this.getSeedOrders();
    }
  }

  persist(orders: WorkOrderDocument[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(WorkOrderService.STORAGE_KEY, JSON.stringify(orders));
  }

  reset(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(WorkOrderService.STORAGE_KEY);
  }

  private getSeedOrders(): WorkOrderDocument[] {
    return SAMPLE_WORK_ORDERS;
  }
}
