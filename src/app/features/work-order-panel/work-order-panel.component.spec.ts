import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkOrderPanelComponent } from './work-order-panel.component';

describe('WorkOrderPanelComponent', () => {
  let fixture: ComponentFixture<WorkOrderPanelComponent>;
  let component: WorkOrderPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkOrderPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkOrderPanelComponent);
    component = fixture.componentInstance;
    component.workCenters = [
      {
        docId: 'wc-1',
        docType: 'workCenter',
        data: { name: 'Center 1' }
      }
    ];
    component.visible = true;
    fixture.detectChanges();
  });

  it('marks date range invalid when end date is not after start date', () => {
    component.form.controls.startDate.setValue({ year: 2026, month: 3, day: 7 });
    component.form.controls.endDate.setValue({ year: 2026, month: 3, day: 7 });
    component.form.updateValueAndValidity();
    expect(component.form.errors?.['dateRange']).toBeTrue();
  });

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
        name: 'Order 9',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2026-03-07',
        endDate: '2026-03-10'
      })
    );
  });
});

