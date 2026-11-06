import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatistiquePharmacyComponent } from './statistique-pharmacy.component';

describe('StatistiquePharmacyComponent', () => {
  let component: StatistiquePharmacyComponent;
  let fixture: ComponentFixture<StatistiquePharmacyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatistiquePharmacyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatistiquePharmacyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
