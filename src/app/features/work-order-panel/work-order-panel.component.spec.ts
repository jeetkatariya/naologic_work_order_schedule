import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkOrderPanelComponent } from './work-order-panel.component';

const WORK_CENTERS = [
  { docId: 'wc-1', docType: 'workCenter' as const, data: { name: 'Center 1' } },
  { docId: 'wc-2', docType: 'workCenter' as const, data: { name: 'Center 2' } }
];

describe('WorkOrderPanelComponent', () => {
  let fixture: ComponentFixture<WorkOrderPanelComponent>;
  let component: WorkOrderPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkOrderPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkOrderPanelComponent);
    component = fixture.componentInstance;
    component.workCenters = WORK_CENTERS;
    component.visible = true;
    fixture.detectChanges();
  });

  // ── Form validation ────────────────────────────────────────────────────

  it('marks date range invalid when end date equals start date', () => {
    component.form.controls.startDate.setValue({ year: 2026, month: 3, day: 7 });
    component.form.controls.endDate.setValue({ year: 2026, month: 3, day: 7 });
    component.form.updateValueAndValidity();
    expect(component.form.errors?.['dateRange']).toBeTrue();
  });

  it('accepts valid date range when end is after start', () => {
    component.form.controls.startDate.setValue({ year: 2026, month: 1, day: 1 });
    component.form.controls.endDate.setValue({ year: 2026, month: 1, day: 15 });
    component.form.updateValueAndValidity();
    expect(component.form.errors?.['dateRange']).toBeFalsy();
  });

  it('marks name as required when empty', () => {
    component.form.controls.name.setValue('');
    component.form.controls.name.markAsTouched();
    expect(component.form.controls.name.errors?.['required']).toBeTrue();
  });

  it('marks workCenterId as required when empty', () => {
    component.form.controls.workCenterId.setValue('');
    component.form.controls.workCenterId.markAsTouched();
    expect(component.form.controls.workCenterId.errors?.['required']).toBeTrue();
  });

  it('marks startDate as required when null', () => {
    component.form.controls.startDate.setValue(null);
    component.form.controls.startDate.markAsTouched();
    expect(component.form.controls.startDate.errors?.['required']).toBeTrue();
  });

  it('marks endDate as required when null', () => {
    component.form.controls.endDate.setValue(null);
    component.form.controls.endDate.markAsTouched();
    expect(component.form.controls.endDate.errors?.['required']).toBeTrue();
  });

  // ── Submit ────────────────────────────────────────────────────────────

  it('emits draft when valid form is submitted', () => {
    const submitSpy = spyOn(component.orderSubmitted, 'emit');
    component.form.controls.name.setValue('Order 9');
    component.form.controls.workCenterId.setValue('wc-1');
    component.form.controls.status.setValue('open');
    component.form.controls.startDate.setValue({ year: 2026, month: 3, day: 7 });
    component.form.controls.endDate.setValue({ year: 2026, month: 3, day: 10 });

    component.submit();

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name:         'Order 9',
        workCenterId: 'wc-1',
        status:       'open',
        startDate:    '2026-03-07',
        endDate:      '2026-03-10'
      })
    );
  });

  it('does not emit when form is invalid', () => {
    const submitSpy = spyOn(component.orderSubmitted, 'emit');
    // Leave form in default empty state
    component.form.reset();
    component.submit();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('includes the order id in the draft when editing', () => {
    const submitSpy = spyOn(component.orderSubmitted, 'emit');
    component.selectedOrder = {
      docId: 'wo-42',
      docType: 'workOrder',
      data: { name: 'Existing', workCenterId: 'wc-1', status: 'open', startDate: '2026-03-01', endDate: '2026-03-15' }
    };
    component.mode = 'edit';
    fixture.detectChanges();

    component.form.controls.name.setValue('Updated Name');
    component.form.controls.workCenterId.setValue('wc-1');
    component.form.controls.status.setValue('complete');
    component.form.controls.startDate.setValue({ year: 2026, month: 3, day: 1 });
    component.form.controls.endDate.setValue({ year: 2026, month: 3, day: 15 });

    component.submit();

    expect(submitSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'wo-42' })
    );
  });

  // ── Panel close ───────────────────────────────────────────────────────

  it('emits panelClosed when closePanel() is called', () => {
    const closeSpy = spyOn(component.panelClosed, 'emit');
    component.closePanel();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  // ── Form reset on input change ────────────────────────────────────────

  it('resets form when mode and selectedOrder change while panel is visible', () => {
    // setInput properly triggers ngOnChanges (Angular 14+)
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('selectedOrder', {
      docId: 'wo-1',
      docType: 'workOrder',
      data: { name: 'Existing WO', workCenterId: 'wc-1', status: 'in-progress', startDate: '2026-03-01', endDate: '2026-03-10' }
    });
    fixture.detectChanges();
    expect(component.form.controls.name.value).toBe('Existing WO');
  });

  it('status defaults to "open" for create mode', () => {
    component.mode = 'create';
    component.selectedOrder = null;
    component.visible = false;
    fixture.detectChanges();
    component.visible = true;
    fixture.detectChanges();
    expect(component.form.controls.status.value).toBe('open');
  });
});
