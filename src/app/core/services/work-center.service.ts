import { Injectable } from '@angular/core';
import { SAMPLE_WORK_CENTERS } from '../data/sample-data';
import { WorkCenterDocument } from '../models/work-center.model';


@Injectable({ providedIn: 'root' })
export class WorkCenterService {
  private readonly data: WorkCenterDocument[] = SAMPLE_WORK_CENTERS;

  getAll(): WorkCenterDocument[] {
    return this.data;
  }

  getById(id: string): WorkCenterDocument | undefined {
    return this.data.find(wc => wc.docId === id);
  }
}
