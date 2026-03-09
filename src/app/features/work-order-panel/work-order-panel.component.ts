import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { NgbDateParserFormatter, NgbDateStruct, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { WorkCenterDocument } from '../../core/models/work-center.model';
import { WorkOrderDocument, WorkOrderStatus } from '../../core/models/work-order.model';
import { addDays, fromIsoDate, toIsoDate } from '../../core/utils/date.utils';
import { WorkOrderDraft } from '../timeline/timeline.store';

type PanelMode = 'create' | 'edit';
type DateField = 'start' | 'end';

interface FormModel {
  name:         FormControl<string>;
  workCenterId: FormControl<string>;
  status:       FormControl<WorkOrderStatus>;
  endDate:      FormControl<NgbDateStruct | null>;
  startDate:    FormControl<NgbDateStruct | null>;
}

class DotDateFormatter extends NgbDateParserFormatter {
  parse(value: string): NgbDateStruct | null {
    if (!value) return null;
    const parts = value.trim().split('.');
    if (parts.length !== 3) return null;
    const m = parseInt(parts[0], 10);
    const d = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
    return { year: y, month: m, day: d };
  }

  format(date: NgbDateStruct | null): string {
    if (!date) return '';
    const m = String(date.month).padStart(2, '0');
    const d = String(date.day).padStart(2, '0');
    return `${m}.${d}.${date.year}`;
  }
}

@Component({
  selector: 'app-work-order-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule, NgbDatepickerModule],
  providers: [{ provide: NgbDateParserFormatter, useClass: DotDateFormatter }],
  templateUrl: './work-order-panel.component.html',
  styleUrl: './work-order-panel.component.scss'
})
export class WorkOrderPanelComponent implements OnChanges {
  @Input({ required: true }) visible = false;
  @Input() mode: PanelMode = 'create';
  @Input({ required: true }) workCenters: WorkCenterDocument[] = [];
  @Input() selectedOrder: WorkOrderDocument | null = null;
  @Input() prefillWorkCenterId: string | null = null;
  @Input() prefillStartDateIso: string | null = null;
  @Input() submitError = '';

  @Output() panelClosed    = new EventEmitter<void>();
  @Output() orderSubmitted = new EventEmitter<WorkOrderDraft>();

  readonly statusOptions: Array<{ value: WorkOrderStatus; label: string }> = [
    { value: 'open',        label: 'Open'        },
    { value: 'in-progress', label: 'In progress' },
    { value: 'complete',    label: 'Complete'    },
    { value: 'blocked',     label: 'Blocked'     }
  ];

  readonly form = new FormGroup<FormModel>(
    {
      name:         new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      workCenterId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      status:       new FormControl<WorkOrderStatus>('open', { nonNullable: true, validators: [Validators.required] }),
      endDate:      new FormControl<NgbDateStruct | null>(null, { validators: [Validators.required] }),
      startDate:    new FormControl<NgbDateStruct | null>(null, { validators: [Validators.required] })
    },
    { validators: [validateDateRange] }
  );

  ngOnChanges(changes: SimpleChanges): void {
    const panelJustOpened = changes['visible'] && this.visible;
    const relevantInputChanged = this.visible && (
      changes['selectedOrder'] ||
      changes['mode'] ||
      changes['prefillStartDateIso'] ||
      changes['prefillWorkCenterId']
    );

    if (panelJustOpened || relevantInputChanged) {
      this.resetForm();
    }
  }

  closePanel(): void { this.panelClosed.emit(); }

  onDateClick(_: DateField): void {
    // Reserved hook for date-field-specific behavior; keeps template bindings valid.
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const startDate = this.form.controls.startDate.value;
    const endDate   = this.form.controls.endDate.value;
    if (!startDate || !endDate) return;

    this.orderSubmitted.emit({
      id:            this.selectedOrder?.docId,
      name:          this.form.controls.name.value,
      workCenterId:  this.form.controls.workCenterId.value,
      status:        this.form.controls.status.value,
      startDate:     ngbToIso(startDate),
      endDate:       ngbToIso(endDate)
    });
  }

  private resetForm(): void {
    if (this.mode === 'edit' && this.selectedOrder) {
      this.form.reset({
        name:         this.selectedOrder.data.name,
        workCenterId: this.selectedOrder.data.workCenterId,
        status:       this.selectedOrder.data.status,
        endDate:      isoToNgb(this.selectedOrder.data.endDate),
        startDate:    isoToNgb(this.selectedOrder.data.startDate)
      }, { emitEvent: false });
      return;
    }

    const startIso = this.prefillStartDateIso ?? toIsoDate(new Date());
    const endIso   = toIsoDate(addDays(fromIsoDate(startIso), 7));
    this.form.reset({
      name:         '',
      workCenterId: this.prefillWorkCenterId ?? this.workCenters[0]?.docId ?? '',
      status:       'open',
      endDate:      isoToNgb(endIso),
      startDate:    isoToNgb(startIso)
    }, { emitEvent: false });
  }
}

function validateDateRange(control: AbstractControl): ValidationErrors | null {
  const form  = control as FormGroup<FormModel>;
  const start = form.controls.startDate.value;
  const end   = form.controls.endDate.value;
  if (!start || !end) return null;
  return fromIsoDate(ngbToIso(end)) > fromIsoDate(ngbToIso(start)) ? null : { dateRange: true };
}

function isoToNgb(iso: string): NgbDateStruct {
  const d = fromIsoDate(iso);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function ngbToIso(v: NgbDateStruct): string {
  return `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`;
}
